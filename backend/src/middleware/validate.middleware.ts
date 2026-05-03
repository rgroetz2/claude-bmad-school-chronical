import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Run after express-validator chains. Collects errors and returns 400
 * with a structured error list if validation failed.
 */
export function handleValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : undefined,
        message: e.msg,
      })),
    });
    return;
  }
  next();
}
