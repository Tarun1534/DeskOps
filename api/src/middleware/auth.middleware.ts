import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, Role, AuthUser } from '../types/index.js';
import { AppError } from './error.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'deskops-super-secure-jwt-secret-at-least-32-chars';

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token is missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    req.tenantId = decoded.organisationId;
    res.setHeader('x-organisation-id', req.tenantId);
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Authentication token is invalid'));
  }
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied. Role '${req.user.role}' does not have permission for this action.`
        )
      );
    }

    next();
  };
};
