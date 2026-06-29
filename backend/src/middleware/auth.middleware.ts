import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

/**
 * Interface representing an Express request authenticated with a user payload.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Express middleware to validate JWT token stored in HTTP-only cookies.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  req.user = payload;
  return next();
}
