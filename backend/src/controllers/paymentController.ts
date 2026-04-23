import { NextFunction, Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import {
  idSchema,
  parseOrThrow,
  payIntentBodySchema,
  paymentCallbackBodySchema,
} from '../utils/validate';

export async function createPayIntent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const orderId = parseOrThrow(idSchema, req.params.id, 'id');
    const body = parseOrThrow(payIntentBodySchema, req.body);
    const result = await paymentService.createPayIntent(userId, orderId, body.method);
    res.status(201).json(ok(result));
  } catch (err) {
    next(err);
  }
}

/**
 * Gateway → us. Normally this endpoint is server-to-server (no auth header,
 * identity is proven via the HMAC signature). Leaving it open for the sandbox.
 */
export async function gatewayCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = parseOrThrow(paymentCallbackBodySchema, req.body);
    const result = await paymentService.handleGatewayCallback(body);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const payment = await paymentService.getPaymentForUser(userId, id);
    res.json(ok(payment));
  } catch (err) {
    next(err);
  }
}

export async function listOrderPayments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const orderId = parseOrThrow(idSchema, req.params.orderId, 'orderId');
    const list = await paymentService.listPaymentsForOrder(userId, orderId);
    res.json(ok(list));
  } catch (err) {
    next(err);
  }
}
