import jwt, { SignOptions } from 'jsonwebtoken';
import { HttpError } from './apiResponse';

export interface JwtPayload {
  userId: number;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-insecure-secret-change-me';
  }
  return secret;
}

const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '7d';

export function signToken(payload: JwtPayload, expiresIn: SignOptions['expiresIn'] = DEFAULT_EXPIRES_IN): string {
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, getSecret()) as JwtPayload;
    if (typeof decoded !== 'object' || typeof decoded.userId !== 'number') {
      throw new HttpError(401, '登录凭证无效');
    }
    return decoded;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw new HttpError(401, '登录已过期，请重新登录');
    throw new HttpError(401, '登录凭证无效');
  }
}
