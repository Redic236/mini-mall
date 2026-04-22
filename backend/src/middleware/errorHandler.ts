import { NextFunction, Request, Response } from 'express';
import { HttpError, fail } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json(fail(err.message));
    return;
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const payload =
    process.env.NODE_ENV === 'development'
      ? fail(err.message, { stack: err.stack?.split('\n').slice(0, 5) })
      : fail('Internal server error');
  res.status(500).json(payload);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(fail('Not Found'));
}
