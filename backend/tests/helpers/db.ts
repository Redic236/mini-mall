import { sequelize } from '../../src/config/database';
import { Address, Cart, Coupon, COUPON_TYPE, Order, OrderItem, ORDER_STATUS, Payment, PAYMENT_STATUS, Product, User } from '../../src/models';
import { hashPassword } from '../../src/utils/password';

export async function truncateAll(): Promise<void> {
  // DELETE in FK-safe order (children before parents). Orders reference
  // coupons, so coupons must outlive orders during the cascade.
  for (const table of ['reviews', 'payments', 'shipment_events', 'order_items', 'orders', 'carts', 'coupons', 'addresses', 'products', 'users']) {
    await sequelize.query(`DELETE FROM \`${table}\``);
  }
}

export interface SeedOptions {
  products?: boolean;
  address?: boolean;
  user?: boolean;
}

export interface SeededData {
  user: User | null;
  products: Product[];
  address: Address | null;
}

export async function seed(options: SeedOptions = { products: true, address: true, user: true }): Promise<SeededData> {
  await truncateAll();

  const userEnabled = options.user ?? true;
  const user = userEnabled
    ? await User.create({
        username: 'tester',
        email: 'tester@example.com',
        passwordHash: await hashPassword('password123'),
        avatar: null,
      })
    : null;

  const products = options.products
    ? await Product.bulkCreate([
        { name: 'T-Shirt', price: 59, stock: 100, description: 'cotton tee', category: 'apparel', image: null },
        { name: 'Jeans', price: 199, stock: 50, description: 'blue jeans', category: 'apparel', image: null },
        { name: 'Sneakers', price: 399, stock: 10, description: 'light runners', category: 'footwear', image: null },
      ])
    : [];

  const address =
    options.address && user
      ? await Address.create({
          userId: user.get('id') as number,
          name: '张三',
          phone: '13800000001',
          province: '北京',
          city: '北京',
          district: '朝阳',
          detail: 'A1 路',
          isDefault: true,
        })
      : null;

  return { user, products, address };
}

export { Address, Cart, Coupon, COUPON_TYPE, Order, OrderItem, ORDER_STATUS, Payment, PAYMENT_STATUS, Product, User };
