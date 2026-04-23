import { NextFunction, Request, Response } from 'express';
import * as productService from '../services/productService';
import { ok } from '../utils/apiResponse';
import { idSchema, parseOrThrow, productListQuerySchema } from '../utils/validate';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter = parseOrThrow(productListQuerySchema, {
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
    });
    const products = await productService.listProducts(filter);
    res.json(ok(products));
  } catch (err) {
    next(err);
  }
}

export async function categories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await productService.listCategories();
    res.json(ok(summary));
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
