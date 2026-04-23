import { NextFunction, Request, Response } from 'express';
import * as cartService from '../services/cartService';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import {
  addCartBodySchema,
  idSchema,
  parseOrThrow,
  updateCartBodySchema,
} from '../utils/validate';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await cartService.listCart(getUserId(req));
    res.json(ok(items));
  } catch (err) {
    next(err);
  }
}

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(addCartBodySchema, req.body);
    const summary = await cartService.addToCart(getUserId(req), body.productId, body.quantity);
    res.status(201).json(ok(summary));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const body = parseOrThrow(updateCartBodySchema, req.body);
    const summary = await cartService.updateCartQuantity(getUserId(req), id, body.quantity);
    res.json(ok(summary));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const summary = await cartService.removeFromCart(getUserId(req), id);
    res.json(ok(summary, '已删除'));
  } catch (err) {
    next(err);
  }
}
