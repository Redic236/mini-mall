import { NextFunction, Request, Response } from 'express';
import * as orderService from '../services/orderService';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import {
  createOrderBodySchema,
  idSchema,
  orderStatusQuerySchema,
  parseOrThrow,
} from '../utils/validate';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const status = parseOrThrow(orderStatusQuerySchema, statusRaw, 'status');
    const orders = await orderService.listOrders(getUserId(req), status);
    res.json(ok(orders));
  } catch (err) {
    next(err);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const order = await orderService.getOrderById(getUserId(req), id);
    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(createOrderBodySchema, req.body);
    const order = await orderService.createOrderFromCart(
      getUserId(req),
      body.addressId,
      body.cartItemIds,
    );
    res.status(201).json(ok(order));
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const order = await orderService.cancelOrder(getUserId(req), id);
    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}

export async function pay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const order = await orderService.payOrder(getUserId(req), id);
    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}

export async function ship(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const order = await orderService.shipOrder(getUserId(req), id);
    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const order = await orderService.confirmOrder(getUserId(req), id);
    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}
