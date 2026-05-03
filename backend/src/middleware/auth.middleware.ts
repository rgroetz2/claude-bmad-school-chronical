import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { db } from '../config/db';

/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches the decoded payload to req.user.
 * On failure, returns 401.
 *
 * Routes that don't require auth should skip this middleware entirely
 * (don't register it, or use the optional variant below).
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);

    // Re-validate isActive on every request — catches deactivated-mid-session users
    const result = await db.query<{ is_active: boolean }>(
      'SELECT is_active FROM users WHERE id = $1',
      [payload.sub],
    );

    if (!result.rows[0]?.is_active) {
      res.status(401).json({ message: 'Account is inactive.' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}
