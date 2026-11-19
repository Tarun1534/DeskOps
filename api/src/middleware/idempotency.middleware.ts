import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

interface CacheEntry {
  status: number;
  body: any;
  expiresAt: number;
}

const memoryIdempotencyStore = new Map<string, CacheEntry>();

export const idempotencyMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return next();
  }

  req.idempotencyKey = idempotencyKey;
  const tenantId = req.tenantId || 'global';
  const cacheKey = `${tenantId}:${req.originalUrl || req.url}:${idempotencyKey}`;

  const cached = memoryIdempotencyStore.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('x-idempotency-replayed', 'true');
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json send to record for replay
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      memoryIdempotencyStore.set(cacheKey, {
        status: res.statusCode,
        body,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    }
    return originalJson(body);
  };

  next();
};
