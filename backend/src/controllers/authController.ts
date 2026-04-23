import { NextFunction, Request, Response } from 'express';
import * as authService from '../services/authService';
import { avatarUrl } from '../config/uploads';
import { ok, HttpError } from '../utils/apiResponse';
import { loginBodySchema, parseOrThrow, registerBodySchema } from '../utils/validate';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(registerBodySchema, req.body);
    const result = await authService.register(body);
    res.status(201).json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseOrThrow(loginBodySchema, req.body);
    const result = await authService.login(body);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, '未登录');
    const user = await authService.getCurrentUser(req.user.id);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, '未登录');
    const file = req.file;
    if (!file) throw new HttpError(400, '请选择图片');
    const user = await authService.updateAvatar(req.user.id, avatarUrl(file.filename));
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}
