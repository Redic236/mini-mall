import { Op, QueryTypes } from 'sequelize';
import { Address, Order, OrderItem, ORDER_STATUS, Product, SHIPMENT_STATUS } from '../models';
import type { OrderStatus } from '../models';
import { sequelize } from '../config/database';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';
import { addShipmentEvent } from './shipmentService';

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  pendingShipmentCount: number;
  totalProducts: number;
  lowStockCount: number;
}

const LOW_STOCK_THRESHOLD = 10;

/**
 * Dashboard tiles. One query per number is fine at this scale — the table
 * fits in the buffer pool and the admin landing view is not hot.
 *
 * "Today" is anchored to UTC so it lines up with getStatsHistory's sparkline
 * buckets regardless of MySQL session timezone or Node process TZ. Admins in
 * a non-UTC zone will see a "today" that rolls over at UTC midnight.
 */
export async function getStats(): Promise<AdminStats> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [totalOrders, todayOrders, pendingShipmentCount, totalProducts, lowStockCount, revenueRow] =
    await Promise.all([
      Order.count(),
      Order.count({ where: { createdAt: { [Op.gte]: startOfToday } } }),
      Order.count({ where: { status: ORDER_STATUS.PAID } }),
      Product.count(),
      Product.count({ where: { stock: { [Op.lt]: LOW_STOCK_THRESHOLD } } }),
      Order.findOne({
        where: { status: { [Op.in]: [ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.DONE] } },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('totalAmount')), 0), 'total'],
        ],
        raw: true,
      }),
    ]);

  const totalRevenue = Number((revenueRow as { total: number | string } | null)?.total ?? 0);
  return {
    totalOrders,
    totalRevenue,
    todayOrders,
    pendingShipmentCount,
    totalProducts,
    lowStockCount,
  };
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD in UTC
  value: number;
}

export interface StatsHistory {
  days: number;
  ordersPerDay: DailyPoint[];
  revenuePerDay: DailyPoint[];
}

/**
 * Build a `days`-long daily time series for the dashboard sparklines.
 * Orders count: includes every status (cancellations are signal too).
 * Revenue: only non-cancelled, non-pending orders — mirrors how getStats
 * sums totalRevenue. Missing days are filled with zeros so the polyline
 * doesn't skip.
 */
export async function getStatsHistory(days: number): Promise<StatsHistory> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  // Force UTC day bucketing so the SQL-side labels match the JS fill loop
  // below (which generates YYYY-MM-DD from UTC). Without CONVERT_TZ, the
  // bucket depends on MySQL's @@session.time_zone, which is fine when
  // Sequelize's default '+00:00' is in effect but silently shifts if the
  // session is ever reconfigured.
  const rawOrders = await sequelize.query<{ day: string; count: number | string }>(
    `SELECT DATE_FORMAT(CONVERT_TZ(createdAt, @@session.time_zone, '+00:00'), '%Y-%m-%d') AS day,
            COUNT(*) AS count
       FROM orders
      WHERE createdAt >= :since
      GROUP BY day`,
    { replacements: { since }, type: QueryTypes.SELECT },
  );
  const rawRevenue = await sequelize.query<{ day: string; amount: number | string }>(
    `SELECT DATE_FORMAT(CONVERT_TZ(createdAt, @@session.time_zone, '+00:00'), '%Y-%m-%d') AS day,
            COALESCE(SUM(totalAmount), 0) AS amount
       FROM orders
      WHERE createdAt >= :since
        AND status IN ('已支付', '已发货', '已完成')
      GROUP BY day`,
    { replacements: { since }, type: QueryTypes.SELECT },
  );

  const fill = (rows: Array<{ day: string; value: number | string }>): DailyPoint[] => {
    const byDay = new Map<string, number>();
    for (const r of rows) byDay.set(r.day, Number(r.value));
    const result: DailyPoint[] = [];
    const cursor = new Date(since);
    for (let i = 0; i < days; i += 1) {
      const dateStr = cursor.toISOString().slice(0, 10);
      result.push({ date: dateStr, value: byDay.get(dateStr) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  };

  return {
    days,
    ordersPerDay: fill(
      rawOrders.map((r) => ({ day: r.day, value: Number(r.count) })),
    ),
    revenuePerDay: fill(
      rawRevenue.map((r) => ({ day: r.day, value: Number(r.amount) })),
    ),
  };
}

export interface AdminOrderFilter {
  status?: OrderStatus;
  page: number;
  limit: number;
}

export async function listOrders(filter: AdminOrderFilter): Promise<{
  items: Order[];
  total: number;
  page: number;
  limit: number;
}> {
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;

  const offset = (filter.page - 1) * filter.limit;
  // Split count from find. findAndCountAll + distinct:true forces MySQL to
  // build a DISTINCT set over the full join (orders × items × products ×
  // addresses) just to return the count, which at N line items per order
  // multiplies the work. A plain Order.count over the same where is one
  // covering-index scan, and it runs in parallel with the paginated find.
  const [count, rows] = await Promise.all([
    Order.count({ where }),
    Order.findAll({
      where,
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Address, as: 'address' },
      ],
      order: [['id', 'DESC']],
      offset,
      limit: filter.limit,
    }),
  ]);

  return { items: rows, total: count, page: filter.page, limit: filter.limit };
}

/**
 * Ship-by-admin. Locks the order row and verifies it's 已支付 before the
 * transition — mirrors the invariants enforced in the regular ship path
 * but drops the userId ownership filter.
 */
export async function adminShipOrder(orderId: number, adminId: number): Promise<Order> {
  return sequelize.transaction(async (t) => {
    const order = await Order.findOne({
      where: { id: orderId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!order) throw new HttpError(404, '订单不存在');

    const current = order.get('status') as OrderStatus;
    if (current !== ORDER_STATUS.PAID) {
      throw new HttpError(400, `订单当前状态为「${current}」，只能发货已支付订单`);
    }

    order.set('status', ORDER_STATUS.SHIPPED);
    await order.save({ transaction: t });

    // Seed the shipment timeline. Further tracking nodes (in_transit, arrived,
    // delivered) can be appended via /admin/orders/:id/shipment-events.
    await addShipmentEvent(
      orderId,
      { status: SHIPMENT_STATUS.PICKED_UP, note: '商家已发货，等待物流揽收' },
      t,
    );

    await order.reload({
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Address, as: 'address' },
      ],
      transaction: t,
    });

    audit({
      event: 'order.ship',
      entity: 'order',
      entityId: orderId,
      details: { adminId, orderNo: order.get('orderNo'), from: current, to: ORDER_STATUS.SHIPPED },
    });
    return order;
  });
}

export interface ProductInput {
  name: string;
  price: number;
  description?: string | null;
  category: string;
  image?: string | null;
  stock: number;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const product = await Product.create({
    name: input.name,
    price: input.price,
    description: input.description ?? null,
    category: input.category,
    image: input.image ?? null,
    stock: input.stock,
  });
  audit({
    event: 'admin.product.create',
    entity: 'product',
    entityId: product.get('id') as number,
    details: { name: input.name, price: input.price, stock: input.stock },
  });
  return product;
}

export async function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const product = await Product.findByPk(id);
  if (!product) throw new HttpError(404, '商品不存在');
  product.set('name', input.name);
  product.set('price', input.price);
  product.set('description', input.description ?? null);
  product.set('category', input.category);
  if (input.image !== undefined) product.set('image', input.image ?? null);
  product.set('stock', input.stock);
  await product.save();
  audit({ event: 'admin.product.update', entity: 'product', entityId: id, details: { ...input } });
  return product;
}

export async function deleteProduct(id: number): Promise<void> {
  const product = await Product.findByPk(id);
  if (!product) throw new HttpError(404, '商品不存在');

  // Soft-guard: products referenced by order_items must not disappear, or
  // historical orders lose their line-item join. The FK on order_items
  // would raise anyway, but we want a friendlier 400 than a raw SQL error.
  const referenced = await OrderItem.count({ where: { productId: id } });
  if (referenced > 0) {
    throw new HttpError(400, '该商品已被订单引用，无法删除');
  }

  await product.destroy();
  audit({ event: 'admin.product.delete', entity: 'product', entityId: id });
}
