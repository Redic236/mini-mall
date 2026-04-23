import { NextFunction, Request, Response } from 'express';
import { User, USER_ROLE } from '../models';
import type { UserRole } from '../models';
import { HttpError } from '../utils/apiResponse';
import { verifyToken } from '../utils/jwt';

// Attach a minimal auth context to req.
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      username: string;
      email: string;
      role: UserRole;
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
      role: (user.get('role') as UserRole) ?? USER_ROLE.USER,
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

/**
 * Gate for admin-only endpoints. Assumes requireAuth ran first so req.user
 * is populated — mount both on the route chain.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, '未登录'));
    return;
  }
  if (req.user.role !== USER_ROLE.ADMIN) {
    next(new HttpError(403, '需要管理员权限'));
    return;
  }
  next();
}
