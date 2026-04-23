import { NextFunction, Request, Response } from 'express';
import * as reviewService from '../services/reviewService';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import {
  createReviewBodySchema,
  idSchema,
  parseOrThrow,
  reviewListQuerySchema,
  updateReviewBodySchema,
} from '../utils/validate';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseOrThrow(reviewListQuerySchema, req.query);
    const result = await reviewService.listReviews(query);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function eligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = parseOrThrow(idSchema, req.query.productId, 'productId');
    const result = await reviewService.getEligibility(getUserId(req), productId);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(createReviewBodySchema, req.body);
    const review = await reviewService.createReview(getUserId(req), body);
    res.status(201).json(ok(review));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const body = parseOrThrow(updateReviewBodySchema, req.body);
    const review = await reviewService.updateReview(getUserId(req), id, body);
    res.json(ok(review));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    await reviewService.deleteReview(getUserId(req), id);
    res.json(ok(null, '已删除'));
  } catch (err) {
    next(err);
  }
}
