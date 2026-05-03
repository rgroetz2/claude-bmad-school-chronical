import { AuthService } from './auth.service';
import { UsersService, User } from './users.service';
import * as passwordUtil from '../utils/password.util';
import * as jwtUtil from '../utils/jwt.util';
import { redis, refreshTokenKey, userRefreshPattern } from '../config/redis';
import { AppError } from '../middleware/error.middleware';

// ── Mock dependencies ─────────────────────────────────────────────────────────
jest.mock('./users.service', () => ({
  UsersService: {
    findByUsername: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('../utils/password.util', () => ({
  comparePassword: jest.fn(),
}));

jest.mock('../utils/jwt.util', () => ({
  signToken: jest.fn().mockReturnValue('mocked.access.token'),
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
  refreshTokenKey: jest.fn((userId: string, tokenId: string) => `refresh:${userId}:${tokenId}`),
  userRefreshPattern: jest.fn((userId: string) => `refresh:${userId}:*`),
}));

// uuid is deterministic in tests — patch it
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('test-token-id') }));

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

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── validateUser ────────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('returns user on valid credentials', async () => {
      const user = makeUser();
      (UsersService.findByUsername as jest.Mock).mockResolvedValueOnce(user);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValueOnce(true);

      const result = await AuthService.validateUser('teacher1', 'correct_pw');

      expect(result).toEqual(user);
    });

    it('throws 401 when user not found', async () => {
      (UsersService.findByUsername as jest.Mock).mockResolvedValueOnce(null);

      await expect(AuthService.validateUser('nobody', 'pw')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 when password is wrong', async () => {
      (UsersService.findByUsername as jest.Mock).mockResolvedValueOnce(makeUser());
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValueOnce(false);

      await expect(AuthService.validateUser('teacher1', 'wrong_pw')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('uses same error for missing user and wrong password (no enumeration)', async () => {
      (UsersService.findByUsername as jest.Mock).mockResolvedValueOnce(null);
      const noUser = AuthService.validateUser('nobody', 'pw').catch((e) => e);

      (UsersService.findByUsername as jest.Mock).mockResolvedValueOnce(makeUser());
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValueOnce(false);
      const wrongPw = AuthService.validateUser('teacher1', 'bad').catch((e) => e);

      const [e1, e2] = await Promise.all([noUser, wrongPw]);
      expect(e1.message).toBe(e2.message);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('signs an access token and stores refresh token in Redis', async () => {
      const user = makeUser();
      const tokens = await AuthService.login(user);

      expect(jwtUtil.signToken).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
      expect(tokens.accessToken).toBe('mocked.access.token');
      expect(tokens.refreshToken).toBe(`${user.id}.test-token-id`);
      expect(tokens.refreshTokenId).toBe('test-token-id');
      expect(tokens.expiresIn).toBe(900); // 15 * 60

      expect(redis.set).toHaveBeenCalledWith(
        `refresh:${user.id}:test-token-id`,
        user.id,
        'EX',
        expect.any(Number),
      );
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('rotates tokens on valid refresh token', async () => {
      const user = makeUser();
      (redis.get as jest.Mock).mockResolvedValueOnce(user.id);
      (UsersService.findById as jest.Mock).mockResolvedValueOnce(user);

      const tokens = await AuthService.refresh(`${user.id}.old-token-id`);

      expect(redis.del).toHaveBeenCalledWith(`refresh:${user.id}:old-token-id`);
      expect(tokens.accessToken).toBe('mocked.access.token');
    });

    it('throws 401 when token format is invalid', async () => {
      await expect(AuthService.refresh('badformat')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 when Redis has no matching key', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      await expect(AuthService.refresh('user-uuid.token-id')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 when stored userId does not match', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce('different-user-id');

      await expect(AuthService.refresh('user-uuid.token-id')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 when user is inactive', async () => {
      const inactiveUser = makeUser({ is_active: false });
      (redis.get as jest.Mock).mockResolvedValueOnce('user-uuid');
      (UsersService.findById as jest.Mock).mockResolvedValueOnce(inactiveUser);

      await expect(AuthService.refresh('user-uuid.token-id')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('deletes the specific refresh token from Redis', async () => {
      await AuthService.logout('user-uuid', 'token-id');

      expect(redis.del).toHaveBeenCalledWith('refresh:user-uuid:token-id');
    });
  });

  // ── invalidateAllSessions ───────────────────────────────────────────────────
  describe('invalidateAllSessions', () => {
    it('deletes all refresh tokens for a user', async () => {
      const keys = ['refresh:user-uuid:t1', 'refresh:user-uuid:t2'];
      (redis.keys as jest.Mock).mockResolvedValueOnce(keys);

      await AuthService.invalidateAllSessions('user-uuid');

      expect(redis.del).toHaveBeenCalledWith(...keys);
    });

    it('does not call del when user has no active sessions', async () => {
      (redis.keys as jest.Mock).mockResolvedValueOnce([]);

      await AuthService.invalidateAllSessions('user-uuid');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
