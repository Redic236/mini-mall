import { fn, col } from 'sequelize';
import { Order, OrderItem, ORDER_STATUS, Product, Review, User } from '../models';
import { sequelize } from '../config/database';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';

export interface ReviewInput {
  productId: number;
  rating: number;
  content?: string | null;
}

export interface UpdateReviewInput {
  rating: number;
  content?: string | null;
}

export interface ReviewListOptions {
  productId: number;
  page: number;
  limit: number;
}

export interface ReviewListResult {
  items: Review[];
  total: number;
  averageRating: number;
  page: number;
  limit: number;
}

export interface ReviewEligibility {
  canReview: boolean;
  alreadyReviewed: boolean;
  eligibleOrderId: number | null;
}

// A user may review a product only if they have a 已完成 order containing it
// and they have not already reviewed it.
async function findEligibleOrderId(userId: number, productId: number): Promise<number | null> {
  const order = await Order.findOne({
    where: { userId, status: ORDER_STATUS.DONE },
    include: [{ model: OrderItem, as: 'items', where: { productId }, required: true }],
    order: [['id', 'DESC']],
    attributes: ['id'],
  });
  if (!order) return null;
  return order.get('id') as number;
}

export async function getEligibility(userId: number, productId: number): Promise<ReviewEligibility> {
  const existing = await Review.findOne({ where: { userId, productId }, attributes: ['id'] });
  if (existing) return { canReview: false, alreadyReviewed: true, eligibleOrderId: null };
  const eligibleOrderId = await findEligibleOrderId(userId, productId);
  return { canReview: eligibleOrderId !== null, alreadyReviewed: false, eligibleOrderId };
}

export async function createReview(userId: number, input: ReviewInput): Promise<Review> {
  return sequelize.transaction(async (t) => {
    const product = await Product.findByPk(input.productId, { transaction: t });
    if (!product) throw new HttpError(404, '商品不存在');

    const existing = await Review.findOne({
      where: { userId, productId: input.productId },
      transaction: t,
    });
    if (existing) throw new HttpError(409, '已经评价过该商品');

    const orderId = await findEligibleOrderId(userId, input.productId);
    if (!orderId) throw new HttpError(403, '仅已完成订单中的商品可评价');

    const created = await Review.create(
      {
        userId,
        productId: input.productId,
        orderId,
        rating: input.rating,
        content: input.content ?? null,
      },
      { transaction: t },
    );
    await created.reload({
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
      transaction: t,
    });
    audit({
      event: 'review.create',
      entity: 'product',
      entityId: input.productId,
      details: {
        userId,
        reviewId: created.get('id'),
        rating: input.rating,
        orderId,
      },
    });
    return created;
  });
}

async function findOwnedReview(userId: number, id: number): Promise<Review> {
  const review = await Review.findOne({ where: { id, userId } });
  if (!review) throw new HttpError(404, '评价不存在');
  return review;
}

export async function updateReview(userId: number, id: number, input: UpdateReviewInput): Promise<Review> {
  const review = await findOwnedReview(userId, id);
  review.set('rating', input.rating);
  review.set('content', input.content ?? null);
  await review.save();
  await review.reload({
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
  });
  audit({
    event: 'review.update',
    entity: 'product',
    entityId: review.get('productId') as number,
    details: { userId, reviewId: id, rating: input.rating },
  });
  return review;
}

export async function deleteReview(userId: number, id: number): Promise<void> {
  const review = await findOwnedReview(userId, id);
  const productId = review.get('productId') as number;
  await review.destroy();
  audit({
    event: 'review.delete',
    entity: 'product',
    entityId: productId,
    details: { userId, reviewId: id },
  });
}

export async function listReviews(options: ReviewListOptions): Promise<ReviewListResult> {
  const offset = (options.page - 1) * options.limit;

  const { rows, count } = await Review.findAndCountAll({
    where: { productId: options.productId },
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
    order: [['id', 'DESC']],
    limit: options.limit,
    offset,
  });

  const agg = await Review.findOne({
    where: { productId: options.productId },
    attributes: [[fn('AVG', col('rating')), 'avg']],
    raw: true,
  });
  const avgRaw = (agg as unknown as { avg: string | null } | null)?.avg ?? null;
  const averageRating = avgRaw === null ? 0 : Number(Number(avgRaw).toFixed(2));

  return {
    items: rows,
    total: count,
    averageRating,
    page: options.page,
    limit: options.limit,
  };
}
