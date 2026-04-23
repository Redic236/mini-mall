import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter, authRateLimiter, writeRateLimiter } from './middleware/rateLimit';
import apiRouter from './routes';

export function createApp(): Application {
  const app = express();

  // Needed for correct client IP when behind a proxy (nginx, etc.)
  app.set('trust proxy', 1);

  // Security headers. Registered first so headers apply to every response,
  // including rate-limit rejections and error paths. `crossOriginResourcePolicy`
  // is relaxed to 'cross-origin' because this API is consumed by a browser
  // frontend that may live on a different origin (Vite dev, separate nginx).
  // `contentSecurityPolicy` is disabled — CSP governs how HTML documents load
  // subresources, which is irrelevant for a JSON-only API.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global limiter on all API routes
  app.use('/api', apiRateLimiter);

  // Tight limiter on auth endpoints (brute-force mitigation)
  app.use('/api/auth', authRateLimiter);

  // Stricter limiter on write paths (orders + address mutations)
  app.use('/api/orders', writeRateLimiter);
  app.use('/api/addresses', (req, res, next) => {
    if (req.method === 'GET') return next();
    return writeRateLimiter(req, res, next);
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
