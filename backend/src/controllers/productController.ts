import { NextFunction, Request, Response } from 'express';
import * as productService from '../services/productService';
import * as recommendationService from '../services/recommendationService';
import { ok } from '../utils/apiResponse';
import { idSchema, parseOrThrow, productListQuerySchema } from '../utils/validate';
import { z } from 'zod';

const recommendationLimitSchema = z.coerce.number().int().min(1).max(20).default(6);

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
      page: str('page'),
      limit: str('limit'),
    });
    const result = await productService.listProducts(filter);
    res.json({
      success: true,
      data: result.items,
      message: null,
      meta: { total: result.total, page: result.page, limit: result.limit },
    });
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

export async function recommendations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const limit = parseOrThrow(recommendationLimitSchema, req.query.limit, 'limit');
    // Validate the target exists so we return a 404 rather than an empty list.
    await productService.getProductById(id);
    const items = await recommendationService.recommendForProduct(id, limit);
    res.json(ok(items));
  } catch (err) {
    next(err);
  }
}
