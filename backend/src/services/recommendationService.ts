import { QueryTypes, literal } from 'sequelize';
import { Op } from 'sequelize';
import { Product } from '../models';
import { sequelize } from '../config/database';

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

interface CoOccurrenceRow {
  productId: number;
  score: number;
}

/**
 * Item-based collaborative filter: "users who bought X also bought Y".
 *
 * Ranks candidates by the number of non-cancelled orders that contain both
 * the target product and the candidate. Cheap at our scale — one SQL hop
 * over order_items × orders with a covering-ish index on orderId.
 *
 * Cold-start fallback (no co-occurrence data): returns top-selling products
 * in the same category, excluding the target itself. Surfaces the field
 * `source: 'cf' | 'category-fallback'` so the caller can caveat the label.
 */
export interface ProductRecommendation {
  product: Product;
  score: number;
  source: 'cf' | 'category-fallback';
}

export async function recommendForProduct(
  productId: number,
  limit = 6,
): Promise<ProductRecommendation[]> {
  // Cap the co-occurrence window to a rolling 90 days so the join doesn't
  // keep dragging in orders from the table's entire history as it grows.
  // Recency also produces better recommendations — last quarter's co-buys
  // are more predictive than last year's.
  const rows = await sequelize.query<CoOccurrenceRow>(
    `SELECT oi2.productId AS productId, COUNT(*) AS score
       FROM order_items oi1
       JOIN order_items oi2 ON oi2.orderId = oi1.orderId AND oi2.productId <> oi1.productId
       JOIN orders o ON o.id = oi1.orderId
      WHERE oi1.productId = :productId
        AND o.status <> '已取消'
        AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      GROUP BY oi2.productId
      ORDER BY score DESC, oi2.productId ASC
      LIMIT :limit`,
    {
      replacements: { productId, limit },
      type: QueryTypes.SELECT,
    },
  );

  if (rows.length > 0) {
    const ids = rows.map((r) => Number(r.productId));
    const products = await Product.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: { include: [AVERAGE_RATING_ATTR, REVIEW_COUNT_ATTR] },
    });
    const byId = new Map<number, Product>();
    for (const p of products) byId.set(p.get('id') as number, p);
    // Preserve the CF ordering. Build the array imperatively — the map+filter
    // combo hits a narrowing corner where TS loses track of the discriminator.
    const result: ProductRecommendation[] = [];
    for (const r of rows) {
      const p = byId.get(Number(r.productId));
      if (!p) continue;
      result.push({ product: p, score: Number(r.score), source: 'cf' });
    }
    return result;
  }

  return fallbackByCategory(productId, limit);
}

async function fallbackByCategory(
  productId: number,
  limit: number,
): Promise<ProductRecommendation[]> {
  const target = await Product.findByPk(productId);
  if (!target) return [];
  const category = target.get('category') as string;

  const siblings = await Product.findAll({
    where: {
      category,
      id: { [Op.ne]: productId },
    },
    attributes: { include: [AVERAGE_RATING_ATTR, REVIEW_COUNT_ATTR] },
    order: [
      ['salesCount', 'DESC'],
      ['id', 'ASC'],
    ],
    limit,
  });

  return siblings.map((p) => ({
    product: p,
    score: Number(p.get('salesCount')),
    source: 'category-fallback' as const,
  }));
}
