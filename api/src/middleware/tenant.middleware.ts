import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from './error.middleware.js';

export const tenantMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // If user is already authenticated via JWT, tenantId must come strictly from their verified token
  if (req.user && req.user.organisationId) {
    req.tenantId = req.user.organisationId;
    res.setHeader('x-organisation-id', req.tenantId);
    return next();
  }

  // Fallback for unauthenticated endpoints (e.g. login, webhooks) where organisationId may be passed in header
  const headerTenant = req.headers['x-organisation-id'] as string;
  if (headerTenant) {
    req.tenantId = headerTenant;
    res.setHeader('x-organisation-id', req.tenantId);
  }

  next();
};

export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenantId) {
    return next(
      new AppError(
        400,
        'TENANT_REQUIRED',
        'Organisation context (organisationId) is required for this operation'
      )
    );
  }
  next();
};
