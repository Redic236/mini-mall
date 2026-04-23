import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { fail } from '../utils/apiResponse';

const passthrough: RequestHandler = (_req, _res, next) => next();

// Bypass rate limiting in test and E2E runs — the auth limiter's 10-per-15min
// budget would be spent across a dozen specs, producing spurious failures that
// have nothing to do with the feature under test.
const isTest = process.env.NODE_ENV === 'test' || process.env.E2E === 'true';

// Global API rate limit: generous enough for normal browsing, blocks scripted abuse.
export const apiRateLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json(fail('请求过于频繁，请稍后再试'));
      },
    });

// Stricter limit for state-changing / expensive endpoints (orders, addresses create/update/delete).
export const writeRateLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json(fail('写操作过于频繁，请稍后再试'));
      },
    });

// Tight limit for auth endpoints to blunt brute-force login.
export const authRateLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json(fail('登录/注册尝试过于频繁，请稍后再试'));
      },
    });
