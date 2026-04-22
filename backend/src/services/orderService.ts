import { Op } from 'sequelize';
import { Address, Cart, Order, OrderItem, ORDER_STATUS, Product } from '../models';
import type { OrderStatus } from '../models';
import { sequelize } from '../config/database';
import { HttpError } from '../utils/apiResponse';
import { generateUniqueOrderNo } from '../utils/orderNo';
import { audit } from '../utils/audit';

export async function listOrders(status?: OrderStatus): Promise<Order[]> {
  return Order.findAll({
    where: status ? { status } : undefined,
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
    order: [['id', 'DESC']],
  });
}

export async function getOrderById(id: number): Promise<Order> {
  const order = await Order.findByPk(id, {
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
  });
  if (!order) throw new HttpError(404, '订单不存在');
  return order;
}

export async function createOrderFromCart(addressId: number, cartItemIds: number[]): Promise<Order> {
  return sequelize.transaction(async (t) => {
    const address = await Address.findByPk(addressId, { transaction: t });
    if (!address) throw new HttpError(400, '收货地址不存在');

    const cartItems = await Cart.findAll({
      where: { id: { [Op.in]: cartItemIds } },
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
        addressId,
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
      where: { id: { [Op.in]: cartItemIds } },
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
        orderNo,
        addressId,
        totalAmount: Number(total.toFixed(2)),
        itemCount: cartItems.length,
      },
    });
    return createdOrder;
  });
}

export async function cancelOrder(id: number): Promise<Order> {
  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });
    if (!order) throw new HttpError(404, '订单不存在');

    const status = order.get('status') as OrderStatus;
    if (status !== ORDER_STATUS.PENDING) {
      throw new HttpError(400, '只能取消待支付的订单');
    }

    const items = (order.get({ plain: true }) as Order & { items?: OrderItem[] }).items ?? [];
    const productIds = items.map((it) => it.productId);

    // Lock products before restoring stock (symmetry with createOrderFromCart)
    const lockedProducts = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    const productMap = new Map<number, Product>();
    for (const p of lockedProducts) productMap.set(Number(p.get('id')), p);

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (product) {
        const currentStock = Number(product.get('stock'));
        product.set('stock', currentStock + Number(item.quantity));
        await product.save({ transaction: t });
      }
    }

    order.set('status', ORDER_STATUS.CANCELLED);
    await order.save({ transaction: t });
    await order.reload({
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Address, as: 'address' },
      ],
      transaction: t,
    });
    audit({
      event: 'order.cancel',
      entity: 'order',
      entityId: id,
      details: { orderNo: order.get('orderNo'), restoredProductIds: productIds },
    });
    return order;
  });
}
