import { NextFunction, Request, Response } from 'express';
import * as productService from '../services/productService';
import { ok } from '../utils/apiResponse';
import { idSchema, parseOrThrow } from '../utils/validate';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await productService.listProducts();
    res.json(ok(products));
  } catch (err) {
    next(err);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const product = await productService.getProductById(id);
    res.json(ok(product));
  } catch (err) {
    next(err);
  }
}
