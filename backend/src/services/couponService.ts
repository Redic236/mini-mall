import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import { Coupon, COUPON_TYPE, Order } from '../models';
import type { CouponType } from '../models';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';

export interface CouponInput {
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  startsAt: Date;
  expiresAt: Date;
  totalQuantity: number | null;
  perUserLimit: number;
  isActive?: boolean;
}

export interface CouponPreview {
  couponId: number;
  code: string;
  name: string;
  type: CouponType;
  discountAmount: number;
  finalAmount: number;
}

/** Round to cents to avoid floating-point drift in DECIMAL comparisons. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeDiscount(coupon: Coupon, orderAmount: number): number {
  const type = coupon.get('type') as CouponType;
  const value = Number(coupon.get('value'));
  if (type === COUPON_TYPE.FIXED) {
    return Math.min(value, orderAmount);
  }
  // percentage: value is 0..100
  return round2((orderAmount * value) / 100);
}

/**
 * Inspect-only validation. Used both by the preview endpoint and by
 * createOrderFromCart — in the latter, pass the same transaction so the
 * checks happen against locked rows.
 */
export async function validateCouponForOrder(
  code: string,
  userId: number,
  orderAmount: number,
  transaction?: Transaction,
): Promise<{ coupon: Coupon; discount: number; finalAmount: number }> {
  const coupon = await Coupon.findOne({
    where: { code },
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
    transaction,
  });
  if (!coupon) throw new HttpError(400, '优惠券不存在');

  if (!coupon.get('isActive')) throw new HttpError(400, '优惠券已停用');

  const now = new Date();
  if (now < (coupon.get('startsAt') as Date)) {
    throw new HttpError(400, '优惠券还未到生效时间');
  }
  if (now > (coupon.get('expiresAt') as Date)) {
    throw new HttpError(400, '优惠券已过期');
  }

  const totalQty = coupon.get('totalQuantity') as number | null;
  const used = coupon.get('usedCount') as number;
  if (totalQty !== null && used >= totalQty) {
    throw new HttpError(400, '优惠券已领完');
  }

  const minAmount = Number(coupon.get('minOrderAmount'));
  if (orderAmount < minAmount) {
    throw new HttpError(400, `订单需满 ¥${minAmount.toFixed(2)} 才能使用此券`);
  }

  const couponId = coupon.get('id') as number;
  const perUserLimit = coupon.get('perUserLimit') as number;
  // Count how many non-cancelled orders this user already placed with this
  // coupon. Cancelled orders free up the claim — mirrors the usedCount
  // rollback in cancelPendingInTxn.
  const perUserUsed = await Order.count({
    where: {
      userId,
      couponId,
      status: { [Op.ne]: '已取消' },
    },
    transaction,
  });
  if (perUserUsed >= perUserLimit) {
    throw new HttpError(400, '已达到该优惠券使用次数上限');
  }

  const discount = computeDiscount(coupon, orderAmount);
  const finalAmount = round2(orderAmount - discount);
  return { coupon, discount, finalAmount };
}

export async function previewCoupon(
  code: string,
  userId: number,
  orderAmount: number,
): Promise<CouponPreview> {
  const { coupon, discount, finalAmount } = await validateCouponForOrder(code, userId, orderAmount);
  return {
    couponId: coupon.get('id') as number,
    code: coupon.get('code') as string,
    name: coupon.get('name') as string,
    type: coupon.get('type') as CouponType,
    discountAmount: discount,
    finalAmount,
  };
}

export async function listPublicCoupons(): Promise<Coupon[]> {
  const now = new Date();
  return Coupon.findAll({
    where: {
      isActive: true,
      startsAt: { [Op.lte]: now },
      expiresAt: { [Op.gte]: now },
    },
    order: [['id', 'DESC']],
  });
}

/* Admin operations below */

export async function listAllCoupons(): Promise<Coupon[]> {
  return Coupon.findAll({ order: [['id', 'DESC']] });
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  if (input.startsAt >= input.expiresAt) {
    throw new HttpError(400, '生效时间必须早于过期时间');
  }
  if (input.type === COUPON_TYPE.PERCENTAGE && (input.value < 0 || input.value > 100)) {
    throw new HttpError(400, '折扣券 value 必须在 0–100 之间');
  }

  const exists = await Coupon.findOne({ where: { code: input.code } });
  if (exists) throw new HttpError(409, '优惠券码已存在');

  const created = await Coupon.create({
    code: input.code,
    name: input.name,
    type: input.type,
    value: input.value,
    minOrderAmount: input.minOrderAmount,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    totalQuantity: input.totalQuantity,
    perUserLimit: input.perUserLimit,
    isActive: input.isActive ?? true,
  });
  audit({
    event: 'admin.coupon.create',
    entity: 'coupon',
    entityId: created.get('id') as number,
    details: { code: input.code, type: input.type, value: input.value },
  });
  return created;
}

export async function updateCoupon(id: number, input: CouponInput): Promise<Coupon> {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw new HttpError(404, '优惠券不存在');

  // Code uniqueness: skip self.
  if ((coupon.get('code') as string) !== input.code) {
    const clash = await Coupon.findOne({ where: { code: input.code } });
    if (clash) throw new HttpError(409, '优惠券码已存在');
  }

  coupon.set('code', input.code);
  coupon.set('name', input.name);
  coupon.set('type', input.type);
  coupon.set('value', input.value);
  coupon.set('minOrderAmount', input.minOrderAmount);
  coupon.set('startsAt', input.startsAt);
  coupon.set('expiresAt', input.expiresAt);
  coupon.set('totalQuantity', input.totalQuantity);
  coupon.set('perUserLimit', input.perUserLimit);
  if (input.isActive !== undefined) coupon.set('isActive', input.isActive);
  await coupon.save();
  audit({ event: 'admin.coupon.update', entity: 'user', entityId: id, details: { code: input.code } });
  return coupon;
}

export async function deleteCoupon(id: number): Promise<void> {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw new HttpError(404, '优惠券不存在');

  const referenced = await Order.count({ where: { couponId: id } });
  if (referenced > 0) {
    throw new HttpError(400, '该优惠券已被订单使用，建议改为停用而非删除');
  }
  await coupon.destroy();
  audit({ event: 'admin.coupon.delete', entity: 'user', entityId: id });
}
