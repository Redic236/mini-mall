import { Cart, Product } from '../models';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';

export interface CartSummary {
  items: Cart[];
  totalPrice: number;
  totalQuantity: number;
}

export async function listCart(): Promise<CartSummary> {
  const items = await Cart.findAll({
    include: [{ model: Product, as: 'product' }],
    order: [['id', 'ASC']],
  });

  let totalPrice = 0;
  let totalQuantity = 0;
  for (const item of items) {
    const plain = item.get({ plain: true }) as Cart & { product?: Product };
    const price = Number(plain.product?.price ?? 0);
    const quantity = Number(plain.quantity);
    totalPrice += price * quantity;
    totalQuantity += quantity;
  }

  return { items, totalPrice: Number(totalPrice.toFixed(2)), totalQuantity };
}

export async function addToCart(productId: number, quantity: number): Promise<Cart> {
  if (quantity <= 0) throw new HttpError(400, '数量必须大于 0');
  const product = await Product.findByPk(productId);
  if (!product) throw new HttpError(404, '商品不存在');

  const stock = Number(product.get('stock'));
  const existing = await Cart.findOne({ where: { productId } });
  const currentQuantity = existing ? Number(existing.get('quantity')) : 0;
  const nextQuantity = currentQuantity + quantity;
  if (stock < nextQuantity) throw new HttpError(400, '库存不足');

  if (existing) {
    existing.set('quantity', nextQuantity);
    await existing.save();
    await existing.reload({ include: [{ model: Product, as: 'product' }] });
    audit({ event: 'cart.update', entity: 'cart', entityId: existing.get('id') as number, details: { productId, quantity: nextQuantity } });
    return existing;
  }
  const created = await Cart.create({ productId, quantity });
  await created.reload({ include: [{ model: Product, as: 'product' }] });
  audit({ event: 'cart.add', entity: 'cart', entityId: created.get('id') as number, details: { productId, quantity } });
  return created;
}

export async function updateCartQuantity(id: number, quantity: number): Promise<Cart> {
  if (quantity <= 0) throw new HttpError(400, '数量必须大于 0');
  const item = await Cart.findByPk(id, { include: [{ model: Product, as: 'product' }] });
  if (!item) throw new HttpError(404, '购物车项不存在');

  const plain = item.get({ plain: true }) as Cart & { product?: Product };
  if (!plain.product) throw new HttpError(404, '商品不存在');
  const stock = Number(plain.product.stock);
  if (stock < quantity) throw new HttpError(400, '库存不足');

  item.set('quantity', quantity);
  await item.save();
  await item.reload({ include: [{ model: Product, as: 'product' }] });
  audit({ event: 'cart.update', entity: 'cart', entityId: id, details: { quantity } });
  return item;
}

export async function removeFromCart(id: number): Promise<void> {
  const item = await Cart.findByPk(id);
  if (!item) throw new HttpError(404, '购物车项不存在');
  await item.destroy();
  audit({ event: 'cart.remove', entity: 'cart', entityId: id });
}
