import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { HttpError, fail } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: '文件过大',
  LIMIT_FILE_COUNT: '文件数量超出限制',
  LIMIT_UNEXPECTED_FILE: '上传字段名错误',
};

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

  if (err instanceof multer.MulterError) {
    const message = MULTER_MESSAGES[err.code] ?? '上传失败';
    res.status(400).json(fail(message));
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
