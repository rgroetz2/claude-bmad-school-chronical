import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user.entity';

// Partial User factory
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    username: 'teacher1',
    email: 'teacher1@school.de',
    passwordHash: '$2b$10$hashedpw',
    role: UserRole.TEACHER,
    isActive: true,
    forcePasswordChange: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed.jwt.token'),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
            del: jest.fn().mockResolvedValue(undefined),
            delPattern: jest.fn().mockResolvedValue(undefined),
            refreshTokenKey: jest
              .fn()
              .mockImplementation(
                (userId: string, tokenId: string) =>
                  `refresh:${userId}:${tokenId}`,
              ),
            userRefreshPattern: jest
              .fn()
              .mockImplementation((userId: string) => `refresh:${userId}:*`),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── validateUser ────────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const user = makeUser();
      const plainPassword = 'Passw0rd!';
      user.passwordHash = await bcrypt.hash(plainPassword, 10);

      usersService.findByUsername.mockResolvedValue(user);

      const result = await service.validateUser(user.username, plainPassword);

      expect(result).toEqual(user);
      expect(usersService.findByUsername).toHaveBeenCalledWith(user.username);
    });

    it('should throw UnauthorizedException when username not found', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      await expect(
        service.validateUser('unknown', 'any'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const user = makeUser();
      user.passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByUsername.mockResolvedValue(user);

      await expect(
        service.validateUser(user.username, 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw generic error — not revealing which field is wrong', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      let error: UnauthorizedException | undefined;
      try {
        await service.validateUser('noone', 'pw');
      } catch (e) {
        error = e as UnauthorizedException;
      }

      expect(error).toBeDefined();
      expect(error!.message).toBe('Your username or password is incorrect');
    });
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return access token, refresh token, and expiresIn', async () => {
      const user = makeUser();

      const result = await service.login(user);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toMatch(
        /^user-uuid-1\.[0-9a-f-]{36}$/,
      );
      expect(result.refreshTokenId).toHaveLength(36); // UUID v4
      expect(result.expiresIn).toBe(900); // 15 minutes
    });

    it('should store refresh token in Redis', async () => {
      const user = makeUser();

      const result = await service.login(user);

      expect(redisService.set).toHaveBeenCalledWith(
        `refresh:${user.id}:${result.refreshTokenId}`,
        user.id,
        7 * 24 * 60 * 60,
      );
    });

    it('should sign JWT with correct payload', async () => {
      const user = makeUser();

      await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
    });
  });

  // ── refresh ──────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should rotate tokens and return new pair when refresh token is valid', async () => {
      const user = makeUser();
      const tokenId = 'token-id-abc';
      const rawToken = `${user.id}.${tokenId}`;

      redisService.get.mockResolvedValue(user.id);
      usersService.findById.mockResolvedValue(user);

      const result = await service.refresh(rawToken);

      expect(redisService.del).toHaveBeenCalledWith(
        `refresh:${user.id}:${tokenId}`,
      );
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toMatch(/^user-uuid-1\./);
    });

    it('should throw UnauthorizedException when token format is invalid', async () => {
      await expect(service.refresh('no-dot-in-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when Redis key not found', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        service.refresh('user-uuid-1.some-token-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when stored userId does not match', async () => {
      redisService.get.mockResolvedValue('different-user-id');

      await expect(
        service.refresh('user-uuid-1.some-token-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const user = makeUser({ isActive: false });
      redisService.get.mockResolvedValue(user.id);
      usersService.findById.mockResolvedValue(user);

      await expect(
        service.refresh(`${user.id}.some-token-id`),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found in DB', async () => {
      redisService.get.mockResolvedValue('user-uuid-1');
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.refresh('user-uuid-1.some-token-id'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      const userId = 'user-uuid-1';
      const tokenId = 'token-abc';

      await service.logout(userId, tokenId);

      expect(redisService.del).toHaveBeenCalledWith(
        `refresh:${userId}:${tokenId}`,
      );
    });
  });

  // ── invalidateAllSessions ────────────────────────────────────────────────────

  describe('invalidateAllSessions', () => {
    it('should delete all refresh tokens for user via pattern', async () => {
      const userId = 'user-uuid-1';

      await service.invalidateAllSessions(userId);

      expect(redisService.delPattern).toHaveBeenCalledWith(
        `refresh:${userId}:*`,
      );
    });
  });
});
