import { sequelize } from '../../src/config/database';
import { Address, Cart, Order, OrderItem, Product } from '../../src/models';

export async function truncateAll(): Promise<void> {
  // DELETE in FK-safe order (children before parents). Auto-increment ids are
  // not reset — tests reference ids via API response payloads, not literals.
  for (const table of ['order_items', 'orders', 'carts', 'addresses', 'products']) {
    await sequelize.query(`DELETE FROM \`${table}\``);
  }
}

export interface SeedOptions {
  products?: boolean;
  address?: boolean;
}

export interface SeededData {
  products: Product[];
  address: Address | null;
}

export async function seed(options: SeedOptions = { products: true, address: true }): Promise<SeededData> {
  await truncateAll();

  const products = options.products
    ? await Product.bulkCreate([
        { name: 'T-Shirt', price: 59, stock: 100, description: 'cotton tee', category: 'apparel', image: null },
        { name: 'Jeans', price: 199, stock: 50, description: 'blue jeans', category: 'apparel', image: null },
        { name: 'Sneakers', price: 399, stock: 10, description: 'light runners', category: 'footwear', image: null },
      ])
    : [];

  const address = options.address
    ? await Address.create({
        name: '张三',
        phone: '13800000001',
        province: '北京',
        city: '北京',
        district: '朝阳',
        detail: 'A1 路',
        isDefault: true,
      })
    : null;

  return { products, address };
}

export { Address, Cart, Order, OrderItem, Product };
