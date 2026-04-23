import { Op } from 'sequelize';
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
 */
export async function getStats(): Promise<AdminStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
    order: [['id', 'DESC']],
    offset,
    limit: filter.limit,
    distinct: true,
  });

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
