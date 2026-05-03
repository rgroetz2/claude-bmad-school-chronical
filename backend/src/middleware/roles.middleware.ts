import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../utils/jwt.util';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  teacher: 1,
  coordinator: 2,
  admin: 3,
};

/**
 * Returns middleware that allows access only to users whose role level
 * is >= the required role. Must be used AFTER authenticate middleware.
 */
export function requireRole(required: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(403).json({ message: 'Forbidden.' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[required] ?? 999;

    if (userLevel < requiredLevel) {
      res.status(403).json({ message: 'Insufficient permissions.' });
      return;
    }

    next();
  };
}
