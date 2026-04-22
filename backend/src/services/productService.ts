import { Product } from '../models';
import { HttpError } from '../utils/apiResponse';

export async function listProducts(): Promise<Product[]> {
  return Product.findAll({ order: [['id', 'ASC']] });
}

export async function getProductById(id: number): Promise<Product> {
  const product = await Product.findByPk(id);
  if (!product) throw new HttpError(404, `商品 ${id} 不存在`);
  return product;
}
