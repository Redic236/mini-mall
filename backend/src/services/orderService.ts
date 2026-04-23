import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { Address, Cart, Order, OrderItem, ORDER_STATUS, Product } from '../models';
import type { OrderStatus } from '../models';
import { sequelize } from '../config/database';
import { HttpError } from '../utils/apiResponse';
import { generateUniqueOrderNo } from '../utils/orderNo';
import { audit } from '../utils/audit';
import { logger } from '../utils/logger';

export async function listOrders(userId: number, status?: OrderStatus): Promise<Order[]> {
  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;
  return Order.findAll({
    where,
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
    order: [['id', 'DESC']],
  });
}

async function findOwnedOrder(
  userId: number,
  id: number,
  transaction?: Transaction,
): Promise<Order> {
  const order = await Order.findOne({
    where: { id, userId },
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
    transaction,
  });
  if (!order) throw new HttpError(404, '订单不存在');
  return order;
}

export async function getOrderById(userId: number, id: number): Promise<Order> {
  return findOwnedOrder(userId, id);
}

export async function createOrderFromCart(
  userId: number,
  addressId: number,
  cartItemIds: number[],
): Promise<Order> {
  return sequelize.transaction(async (t) => {
    const address = await Address.findOne({ where: { id: addressId, userId }, transaction: t });
    if (!address) throw new HttpError(400, '收货地址不存在');

    const cartItems = await Cart.findAll({
      where: { id: { [Op.in]: cartItemIds }, userId },
      transaction: t,
    });
    if (cartItems.length !== cartItemIds.length) {
      throw new HttpError(400, '部分购物车项不存在');
    }

    // Pessimistic lock on products (SELECT ... FOR UPDATE) — stock check and
    // deduction must see the same row state to prevent oversell under concurrency.
    const productIds = cartItems.map((ci) => Number(ci.get('productId')));
    const lockedProducts = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    const productMap = new Map<number, Product>();
    for (const p of lockedProducts) productMap.set(Number(p.get('id')), p);

    let total = 0;
    for (const item of cartItems) {
      const productId = Number(item.get('productId'));
      const quantity = Number(item.get('quantity'));
      const product = productMap.get(productId);
      if (!product) throw new HttpError(400, '商品不存在');

      const stock = Number(product.get('stock'));
      if (stock < quantity) {
        throw new HttpError(400, `商品 ${String(product.get('name'))} 库存不足`);
      }
      total += Number(product.get('price')) * quantity;
    }

    const orderNo = await generateUniqueOrderNo(t);
    await Order.create(
      {
        orderNo,
        userId,
        addressId,
        // Freeze the shipping destination at placement time — subsequent
        // edits or deletions of the source address must not mutate what
        // this order was shipped to.
        receiverName: address.get('name') as string,
        receiverPhone: address.get('phone') as string,
        province: address.get('province') as string,
        city: address.get('city') as string,
        district: address.get('district') as string,
        detailAddress: address.get('detail') as string,
        totalAmount: Number(total.toFixed(2)),
      },
      { transaction: t },
    );
    const createdOrder = await Order.findOne({ where: { orderNo }, transaction: t });
    if (!createdOrder) throw new HttpError(500, '订单创建失败');
    const orderId = Number(createdOrder.get('id'));

    for (const item of cartItems) {
      const productId = Number(item.get('productId'));
      const quantity = Number(item.get('quantity'));
      const product = productMap.get(productId)!;
      // Snapshot price at order time: store the price as it was on placement,
      // so future price changes on the product do not mutate past order totals.
      const price = Number(product.get('price'));

      await OrderItem.create(
        { orderId, productId, quantity, price },
        { transaction: t },
      );

      const currentStock = Number(product.get('stock'));
      product.set('stock', currentStock - quantity);
      await product.save({ transaction: t });
    }

    await Cart.destroy({
      where: { id: { [Op.in]: cartItemIds }, userId },
      transaction: t,
    });

    await createdOrder.reload({
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Address, as: 'address' },
      ],
      transaction: t,
    });
    audit({
      event: 'order.create',
      entity: 'order',
      entityId: orderId,
      details: {
        userId,
        orderNo,
        addressId,
        totalAmount: Number(total.toFixed(2)),
        itemCount: cartItems.length,
      },
    });
    return createdOrder;
  });
}

type CancelReason = 'user' | 'expired';

/**
 * Shared cancel-with-stock-restore. Caller loads `order` under `transaction`
 * with items, verifies status === PENDING, and holds the order row lock.
 * Products referenced by the items are locked FOR UPDATE here before stock
 * is returned.
 */
async function cancelPendingInTxn(
  order: Order,
  transaction: Transaction,
  auditDetails: { userId: number | null; reason: CancelReason },
): Promise<Order> {
  const items = (order.get({ plain: true }) as Order & { items?: OrderItem[] }).items ?? [];
  const productIds = items.map((it) => it.productId);

  const lockedProducts = await Product.findAll({
    where: { id: { [Op.in]: productIds } },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  const productMap = new Map<number, Product>();
  for (const p of lockedProducts) productMap.set(Number(p.get('id')), p);

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (product) {
      const currentStock = Number(product.get('stock'));
      product.set('stock', currentStock + Number(item.quantity));
      await product.save({ transaction });
    }
  }

  order.set('status', ORDER_STATUS.CANCELLED);
  await order.save({ transaction });
  await order.reload({
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
    transaction,
  });
  audit({
    event: 'order.cancel',
    entity: 'order',
    entityId: Number(order.get('id')),
    details: {
      orderNo: order.get('orderNo'),
      restoredProductIds: productIds,
      ...auditDetails,
    },
  });
  return order;
}

export async function cancelOrder(userId: number, id: number): Promise<Order> {
  return sequelize.transaction(async (t) => {
    // Lock the order row so a concurrent expiry / transition can't squeeze
    // in between our status check and save.
    const order = await Order.findOne({
      where: { id, userId },
      include: [{ model: OrderItem, as: 'items' }],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!order) throw new HttpError(404, '订单不存在');

    const status = order.get('status') as OrderStatus;
    if (status !== ORDER_STATUS.PENDING) {
      throw new HttpError(400, '只能取消待支付的订单');
    }
    return cancelPendingInTxn(order, t, { userId, reason: 'user' });
  });
}

/**
 * Auto-cancel pending orders created before `cutoff`. Returns the ids of
 * orders actually cancelled — a user may pay in the small window between
 * candidate selection and inner lock acquisition, in which case that order
 * is skipped. Per-order errors are logged so one bad row can't stall the
 * scheduler.
 */
export async function expirePendingOrders(cutoff: Date): Promise<number[]> {
  const candidates = await Order.findAll({
    where: {
      status: ORDER_STATUS.PENDING,
      createdAt: { [Op.lt]: cutoff },
    },
    attributes: ['id'],
  });

  const cancelled: number[] = [];
  for (const row of candidates) {
    const id = Number(row.get('id'));
    try {
      await sequelize.transaction(async (t) => {
        const order = await Order.findOne({
          where: { id },
          include: [{ model: OrderItem, as: 'items' }],
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!order || order.get('status') !== ORDER_STATUS.PENDING) return;
        await cancelPendingInTxn(order, t, { userId: null, reason: 'expired' });
        cancelled.push(id);
      });
    } catch (err) {
      logger.error('Failed to expire order', {
        id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return cancelled;
}

// Allowed forward transitions for non-destructive state changes. Cancellation
// from 待支付 is handled by cancelOrder separately because it restores stock.
const FORWARD_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.SHIPPED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DONE],
  [ORDER_STATUS.DONE]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

async function transitionOrder(
  userId: number,
  id: number,
  target: OrderStatus,
  auditEvent: string,
): Promise<Order> {
  return sequelize.transaction(async (t) => {
    const order = await Order.findOne({
      where: { id, userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!order) throw new HttpError(404, '订单不存在');

    const current = order.get('status') as OrderStatus;
    const allowed = FORWARD_TRANSITIONS[current];
    if (!allowed.includes(target)) {
      throw new HttpError(400, `订单当前状态为「${current}」，无法变更为「${target}」`);
    }

    order.set('status', target);
    await order.save({ transaction: t });
    await order.reload({
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Address, as: 'address' },
      ],
      transaction: t,
    });
    audit({
      event: auditEvent,
      entity: 'order',
      entityId: id,
      details: { userId, orderNo: order.get('orderNo'), from: current, to: target },
    });
    return order;
  });
}

export async function payOrder(userId: number, id: number): Promise<Order> {
  return transitionOrder(userId, id, ORDER_STATUS.PAID, 'order.pay');
}

export async function shipOrder(userId: number, id: number): Promise<Order> {
  return transitionOrder(userId, id, ORDER_STATUS.SHIPPED, 'order.ship');
}

export async function confirmOrder(userId: number, id: number): Promise<Order> {
  return transitionOrder(userId, id, ORDER_STATUS.DONE, 'order.confirm');
}
