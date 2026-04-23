import { NextFunction, Request, Response } from 'express';
import * as shipmentService from '../services/shipmentService';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import { idSchema, parseOrThrow, shipmentEventBodySchema } from '../utils/validate';

export async function listForOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const orderId = parseOrThrow(idSchema, req.params.orderId, 'orderId');
    res.json(ok(await shipmentService.listForOrderOwned(userId, orderId)));
  } catch (err) {
    next(err);
  }
}

export async function adminListForOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseOrThrow(idSchema, req.params.id, 'id');
    res.json(ok(await shipmentService.listForOrderUnchecked(orderId)));
  } catch (err) {
    next(err);
  }
}

export async function adminAddEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseOrThrow(idSchema, req.params.id, 'id');
    const body = parseOrThrow(shipmentEventBodySchema, req.body);
    const event = await shipmentService.addShipmentEvent(orderId, {
      status: body.status,
      location: body.location ?? null,
      note: body.note ?? null,
      happenedAt: body.happenedAt,
    });
    res.status(201).json(ok(event));
  } catch (err) {
    next(err);
  }
}
