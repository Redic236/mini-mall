import { NextFunction, Request, Response } from 'express';
import { User } from '../models';
import { HttpError } from '../utils/apiResponse';
import { verifyToken } from '../utils/jwt';

// Attach a minimal auth context to req.
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      username: string;
      email: string;
    };
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req.header('authorization'));
    if (!token) throw new HttpError(401, '未登录');

    const { userId } = verifyToken(token);
    const user = await User.findByPk(userId);
    if (!user) throw new HttpError(401, '用户不存在或已被删除');

    req.user = {
      id: user.get('id') as number,
      username: user.get('username') as string,
      email: user.get('email') as string,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function getUserId(req: Request): number {
  if (!req.user) throw new HttpError(401, '未登录');
  return req.user.id;
}
