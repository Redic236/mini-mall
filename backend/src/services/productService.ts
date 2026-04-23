import { Op, fn, col, literal } from 'sequelize';
import type { Order } from 'sequelize';
import { Product } from '../models';
import { HttpError } from '../utils/apiResponse';

export type ProductSort = 'default' | 'priceAsc' | 'priceDesc' | 'sales';

export interface ListProductsFilter {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface PagedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CategorySummary {
  category: string;
  count: number;
}

// Subquery literals attach aggregated review stats to each returned row
// without an extra roundtrip. reviews.productId is indexed, so each
// subquery is a cheap keyed read for the mini-mall scale.
const AVERAGE_RATING_ATTR: [ReturnType<typeof literal>, string] = [
  literal(
    '(SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE reviews.productId = `Product`.`id`)',
  ),
  'averageRating',
];

const REVIEW_COUNT_ATTR: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM reviews WHERE reviews.productId = `Product`.`id`)'),
  'reviewCount',
];

function priceWhere(filter: ListProductsFilter): Record<string, unknown> | null {
  if (filter.minPrice === undefined && filter.maxPrice === undefined) return null;
  const clause: Record<symbol, number> = {};
  if (filter.minPrice !== undefined) clause[Op.gte] = filter.minPrice;
  if (filter.maxPrice !== undefined) clause[Op.lte] = filter.maxPrice;
  return clause;
}

const ORDER_BY: Record<ProductSort, Order> = {
  default: [['id', 'ASC']],
  priceAsc: [['price', 'ASC'], ['id', 'ASC']],
  priceDesc: [['price', 'DESC'], ['id', 'ASC']],
  sales: [['salesCount', 'DESC'], ['id', 'ASC']],
};

export async function listProducts(filter: ListProductsFilter = {}): Promise<PagedProducts> {
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
  const price = priceWhere(filter);
  if (price) where.price = price;

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const offset = (page - 1) * limit;

  // `count` ignores the review-aggregate subqueries (they're in attributes,
  // not where), so Sequelize runs a clean COUNT(*) on the where clause alone.
  const { rows, count } = await Product.findAndCountAll({
    where,
    attributes: { include: [AVERAGE_RATING_ATTR, REVIEW_COUNT_ATTR] },
    order: ORDER_BY[filter.sort ?? 'default'],
    offset,
    limit,
  });
  return { items: rows, total: count, page, limit };
}

export async function getProductById(id: number): Promise<Product> {
  const product = await Product.findByPk(id, {
    attributes: { include: [AVERAGE_RATING_ATTR, REVIEW_COUNT_ATTR] },
  });
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
    const plain = r.get({ plain: true }) as unknown as { category: string; count: string | number };
    return { category: plain.category, count: Number(plain.count) };
  });
}
