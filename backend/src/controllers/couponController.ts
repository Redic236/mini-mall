import { NextFunction, Request, Response } from 'express';
import * as couponService from '../services/couponService';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import {
  couponBodySchema,
  couponPreviewBodySchema,
  idSchema,
  parseOrThrow,
} from '../utils/validate';

export async function listPublic(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await couponService.listPublicCoupons()));
  } catch (err) {
    next(err);
  }
}

export async function preview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = parseOrThrow(couponPreviewBodySchema, req.body);
    const result = await couponService.previewCoupon(body.code, userId, body.orderAmount);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

/* Admin */
export async function adminList(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await couponService.listAllCoupons()));
  } catch (err) {
    next(err);
  }
}

export async function adminCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(couponBodySchema, req.body);
    const created = await couponService.createCoupon({
      ...body,
      totalQuantity: body.totalQuantity ?? null,
    });
    res.status(201).json(ok(created));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const body = parseOrThrow(couponBodySchema, req.body);
    const updated = await couponService.updateCoupon(id, {
      ...body,
      totalQuantity: body.totalQuantity ?? null,
    });
    res.json(ok(updated));
  } catch (err) {
    next(err);
  }
}

export async function adminDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    await couponService.deleteCoupon(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
