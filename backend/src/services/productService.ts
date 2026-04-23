import { Op, fn, col, literal } from 'sequelize';
import { Product } from '../models';
import { HttpError } from '../utils/apiResponse';

export interface ListProductsFilter {
  keyword?: string;
  category?: string;
}

export interface CategorySummary {
  category: string;
  count: number;
}

export async function listProducts(filter: ListProductsFilter = {}): Promise<Product[]> {
  const where: Record<string, unknown> = {};
  if (filter.category) {
    where.category = filter.category;
  }
  if (filter.keyword) {
    const like = `%${filter.keyword}%`;
    where[Op.or as unknown as string] = [
      { name: { [Op.like]: like } },
      { description: { [Op.like]: like } },
    ];
  }
  return Product.findAll({ where, order: [['id', 'ASC']] });
}

export async function getProductById(id: number): Promise<Product> {
  const product = await Product.findByPk(id);
  if (!product) throw new HttpError(404, `商品 ${id} 不存在`);
  return product;
}

export async function listCategories(): Promise<CategorySummary[]> {
  const rows = await Product.findAll({
    attributes: ['category', [fn('COUNT', col('id')), 'count']],
    group: ['category'],
    order: [[literal('count'), 'DESC']],
  });
  return rows.map((r) => {
    const plain = r.get({ plain: true }) as { category: string; count: string | number };
    return { category: plain.category, count: Number(plain.count) };
  });
}
