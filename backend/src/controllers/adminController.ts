import { NextFunction, Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { Product } from '../models';
import { getUserId } from '../middleware/auth';
import { ok } from '../utils/apiResponse';
import {
  adminOrderListQuerySchema,
  adminProductBodySchema,
  adminStatsHistoryQuerySchema,
  idSchema,
  parseOrThrow,
} from '../utils/validate';

export async function stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await adminService.getStats()));
  } catch (err) {
    next(err);
  }
}

export async function statsHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { days } = parseOrThrow(adminStatsHistoryQuerySchema, req.query);
    res.json(ok(await adminService.getStatsHistory(days)));
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = parseOrThrow(adminOrderListQuerySchema, req.query);
    const result = await adminService.listOrders(q);
    res.json({ success: true, data: result.items, message: null, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (err) {
    next(err);
  }
}

export async function shipOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getUserId(req);
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const order = await adminService.adminShipOrder(id, adminId);
    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}

export async function listProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const list = await Product.findAll({ order: [['id', 'DESC']] });
    res.json(ok(list));
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(adminProductBodySchema, req.body);
    const product = await adminService.createProduct(body);
    res.status(201).json(ok(product));
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const body = parseOrThrow(adminProductBodySchema, req.body);
    const product = await adminService.updateProduct(id, body);
    res.json(ok(product));
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    await adminService.deleteProduct(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
