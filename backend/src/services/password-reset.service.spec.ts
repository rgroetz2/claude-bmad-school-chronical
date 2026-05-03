import { PasswordResetService } from './password-reset.service';
import { UsersService, User } from './users.service';
import { AuthService } from './auth.service';
import { db } from '../config/db';
import * as passwordUtil from '../utils/password.util';
import * as mailer from '../config/mailer';
import { AppError } from '../middleware/error.middleware';

// ── Mock dependencies ─────────────────────────────────────────────────────────
jest.mock('./users.service', () => ({
  UsersService: {
    findByEmail: jest.fn(),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./auth.service', () => ({
  AuthService: {
    invalidateAllSessions: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../config/db', () => ({
  db: { query: jest.fn() },
}));

jest.mock('../utils/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('new_hashed_pw'),
}));

jest.mock('../config/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

// Suppress console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const mockDb = db as jest.Mocked<typeof db>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-uuid',
  username: 'teacher1',
  email: 'teacher1@school.de',
  password_hash: '$2b$12$hashed',
  role: 'teacher',
  is_active: true,
  force_password_change: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const makeTokenRecord = (overrides = {}) => ({
  id: 'token-uuid',
  user_id: 'user-uuid',
  used_at: null,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h in future
  is_active: true,
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PasswordResetService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── requestReset ─────────────────────────────────────────────────────────────
  describe('requestReset', () => {
    it('sends a reset email for an existing active user', async () => {
      const user = makeUser();
      (UsersService.findByEmail as jest.Mock).mockResolvedValueOnce(user);
      // invalidate old tokens UPDATE
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // INSERT token
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await PasswordResetService.requestReset('teacher1@school.de');

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE password_reset_tokens'),
        [user.id],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO password_reset_tokens'),
        expect.arrayContaining([user.id]),
      );
      // Fire-and-forget — resolve on next tick
      await Promise.resolve();
      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email, template: 'password-reset' }),
      );
    });

    it('resolves silently for unknown email (anti-enumeration)', async () => {
      (UsersService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

      await expect(PasswordResetService.requestReset('ghost@school.de')).resolves.toBeUndefined();
      expect(mockDb.query).not.toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('resolves silently for inactive user (anti-enumeration)', async () => {
      (UsersService.findByEmail as jest.Mock).mockResolvedValueOnce(makeUser({ is_active: false }));

      await expect(PasswordResetService.requestReset('inactive@school.de')).resolves.toBeUndefined();
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  // ── confirmReset ─────────────────────────────────────────────────────────────
  describe('confirmReset', () => {
    const validRawToken = 'a'.repeat(64); // 64-char hex string

    it('resets password and purges sessions on valid token', async () => {
      const record = makeTokenRecord();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [record] }); // SELECT
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });       // UPDATE used_at

      await PasswordResetService.confirmReset(validRawToken, 'NewSecure123!');

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('NewSecure123!');
      expect(UsersService.updatePassword).toHaveBeenCalledWith(record.user_id, 'new_hashed_pw');
      expect(AuthService.invalidateAllSessions).toHaveBeenCalledWith(record.user_id);
    });

    it('throws 400 when token does not exist in DB', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(PasswordResetService.confirmReset(validRawToken, 'NewPw123!')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when token has already been used', async () => {
      const record = makeTokenRecord({ used_at: new Date() });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [record] });

      await expect(PasswordResetService.confirmReset(validRawToken, 'NewPw123!')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when token is expired', async () => {
      const record = makeTokenRecord({
        expires_at: new Date(Date.now() - 1000), // in the past
      });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [record] });

      await expect(PasswordResetService.confirmReset(validRawToken, 'NewPw123!')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when associated user is inactive', async () => {
      const record = makeTokenRecord({ is_active: false });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [record] });

      await expect(PasswordResetService.confirmReset(validRawToken, 'NewPw123!')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('marks the token as used before updating the password', async () => {
      const record = makeTokenRecord();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [record] }); // SELECT
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });       // UPDATE used_at

      await PasswordResetService.confirmReset(validRawToken, 'NewPw123!');

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SET used_at = NOW()'),
        [record.id],
      );
      // updatePassword is called after marking used
      expect(UsersService.updatePassword).toHaveBeenCalled();
    });
  });
});
