import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../database/dataStore.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthenticatedRequest, AuthUser } from '../../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'deskops-super-secure-jwt-secret-at-least-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'deskops-super-secure-refresh-jwt-secret-at-least-32-chars';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organisationId: z.string().optional(),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, organisationId } = LoginSchema.parse(req.body);

    const user = Array.from(db.users.values()).find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        (!organisationId || u.organisationId === organisationId)
    );

    if (!user || !user.isActive) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    const org = db.organisations.get(user.organisationId);

    const authUser: AuthUser = {
      id: user.id,
      organisationId: user.organisationId,
      email: user.email,
      name: user.name,
      role: user.role,
      unitId: user.unitId,
    };

    const accessToken = jwt.sign(authUser, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(
      { userId: user.id, organisationId: user.organisationId },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: authUser,
        organisation: org ? { id: org.id, name: org.name, slug: org.slug } : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'));
    }

    const user = db.users.get(req.user.id);
    if (!user) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const org = db.organisations.get(user.organisationId);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          organisationId: user.organisationId,
          email: user.email,
          name: user.name,
          role: user.role,
          unitId: user.unitId,
        },
        organisation: org,
      },
    });
  } catch (err) {
    next(err);
  }
};
