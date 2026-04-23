import { NextFunction, Request, Response } from 'express';
import * as productService from '../services/productService';
import { ok } from '../utils/apiResponse';
import { idSchema, parseOrThrow, productListQuerySchema } from '../utils/validate';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const str = (k: string): string | undefined =>
      typeof req.query[k] === 'string' ? (req.query[k] as string) : undefined;
    const filter = parseOrThrow(productListQuerySchema, {
      keyword: str('keyword'),
      category: str('category'),
      minPrice: str('minPrice'),
      maxPrice: str('maxPrice'),
      sort: str('sort'),
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
