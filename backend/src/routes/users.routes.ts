import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { UsersService } from '../services/users.service';
import { PasswordResetService } from '../services/password-reset.service';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roles.middleware';
import { handleValidation } from '../middleware/validate.middleware';

const router = Router();

// All /users routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// ── GET /users ────────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UsersService.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ── POST /users ───────────────────────────────────────────────────────────────

router.post(
  '/',
  [
    body('username')
      .isString()
      .isLength({ min: 3, max: 100 })
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('username may only contain letters, digits, dots, underscores, and hyphens'),
    body('email').isEmail().normalizeEmail().isLength({ max: 255 }),
    body('temporaryPassword').isString().isLength({ min: 8, max: 128 }),
    body('role').isIn(['teacher', 'coordinator', 'admin']),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UsersService.create(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /users/:id ──────────────────────────────────────────────────────────

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('role').optional().isIn(['teacher', 'coordinator', 'admin']),
    body('isActive').optional().isBoolean(),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UsersService.update(req.params['id']!, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /users/:id/reset-password ───────────────────────────────────────────

router.post(
  '/:id/reset-password',
  [param('id').isUUID()],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UsersService.findByIdAdmin(req.params['id']!);
      if (!user) {
        res.status(404).json({ message: `User ${req.params['id']} not found.` });
        return;
      }

      await PasswordResetService.requestReset(user.email);
      res.json({ message: `Password reset email sent to ${user.email}` });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
