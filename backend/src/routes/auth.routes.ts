import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { authenticate } from '../middleware/auth.middleware';
import { handleValidation } from '../middleware/validate.middleware';

const router = Router();

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_ID_COOKIE = 'refresh_token_id';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env['NODE_ENV'] === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days ms
  path: '/api/v1/auth',
};

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { message: 'Too many login attempts. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  message: { message: 'Too many requests. Please wait.' },
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

router.post(
  '/login',
  loginLimiter,
  [
    body('username').isString().isLength({ min: 1, max: 100 }).trim(),
    body('password').isString().notEmpty(),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await AuthService.validateUser(req.body.username, req.body.password);
      const tokens = await AuthService.login(user);

      res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
      res.cookie(REFRESH_ID_COOKIE, tokens.refreshTokenId, COOKIE_OPTIONS);

      res.json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          forcePasswordChange: user.force_password_change,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/refresh ────────────────────────────────────────────────────────

router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!refreshToken) {
        res.status(401).json({ message: 'No active session.' });
        return;
      }

      const tokens = await AuthService.refresh(refreshToken);

      res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
      res.cookie(REFRESH_ID_COOKIE, tokens.refreshTokenId, COOKIE_OPTIONS);

      res.json({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/logout ─────────────────────────────────────────────────────────

router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshTokenId = req.cookies?.[REFRESH_ID_COOKIE] as string | undefined;
      if (req.user && refreshTokenId) {
        await AuthService.logout(req.user.sub, refreshTokenId);
      }

      res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
      res.clearCookie(REFRESH_ID_COOKIE, { path: '/api/v1/auth' });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/password-reset/request ────────────────────────────────────────

router.post(
  '/password-reset/request',
  resetLimiter,
  [
    body('email').isEmail().normalizeEmail().isLength({ max: 255 }),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await PasswordResetService.requestReset(req.body.email);
      res.json({
        message:
          'Falls diese E-Mail-Adresse bei uns registriert ist, erhalten Sie in Kürze eine Nachricht.',
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/password-reset/confirm ────────────────────────────────────────

router.post(
  '/password-reset/confirm',
  resetLimiter,
  [
    body('token').isString().notEmpty(),
    body('newPassword').isString().isLength({ min: 8, max: 128 }),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await PasswordResetService.confirmReset(req.body.token, req.body.newPassword);
      res.json({ message: 'Ihr Passwort wurde erfolgreich zurückgesetzt.' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
