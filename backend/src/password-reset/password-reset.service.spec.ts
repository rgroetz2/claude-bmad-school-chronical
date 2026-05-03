import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { User, UserRole } from '../entities/user.entity';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    username: 'teacher1',
    email: 'teacher1@school.de',
    passwordHash: '$2b$12$hash',
    role: UserRole.TEACHER,
    isActive: true,
    forcePasswordChange: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User;
}

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let tokenRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<Pick<AuthService, 'invalidateAllSessions'>>;
  let mailerService: jest.Mocked<Pick<MailerService, 'sendMail'>>;

  const qbMock = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    tokenRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: tokenRepo },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            updatePassword: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuthService,
          useValue: {
            invalidateAllSessions: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, def: unknown) => def),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    usersService = module.get(UsersService);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    mailerService = module.get(MailerService) as jest.Mocked<MailerService>;
  });

  afterEach(() => jest.clearAllMocks());

  // ── requestReset ─────────────────────────────────────────────────────────────

  describe('requestReset', () => {
    it('should create token and send email for existing active user', async () => {
      const user = makeUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);

      await service.requestReset(user.email);

      expect(tokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          usedAt: null,
        }),
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          template: 'password-reset',
        }),
      );
    });

    it('should return silently (no error) when email not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.requestReset('unknown@school.de')).resolves.not.toThrow();
      expect(tokenRepo.save).not.toHaveBeenCalled();
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should return silently when user is inactive', async () => {
      const user = makeUser({ isActive: false });
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(service.requestReset(user.email)).resolves.not.toThrow();
      expect(tokenRepo.save).not.toHaveBeenCalled();
    });

    it('should invalidate previous unused tokens before creating new one', async () => {
      const user = makeUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);

      await service.requestReset(user.email);

      expect(qbMock.update).toHaveBeenCalledWith(PasswordResetToken);
      expect(qbMock.set).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
      expect(qbMock.where).toHaveBeenCalledWith(
        expect.stringContaining('user_id = :userId'),
        expect.objectContaining({ userId: user.id }),
      );
    });
  });

  // ── confirmReset ─────────────────────────────────────────────────────────────

  describe('confirmReset', () => {
    it('should update password and invalidate sessions on valid token', async () => {
      const rawToken = 'a'.repeat(64);
      const user = makeUser();
      const record: Partial<PasswordResetToken> = {
        tokenHash: sha256(rawToken),
        usedAt: null,
        expiresAt: new Date(Date.now() + 3_600_000),
        user,
      };
      tokenRepo.findOne.mockResolvedValue(record);

      await service.confirmReset(rawToken, 'NewSecurePass1!');

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        user.id,
        expect.any(String), // bcrypt hash
      );
      expect((authService as jest.Mocked<AuthService>).invalidateAllSessions).toHaveBeenCalledWith(user.id);
      // Token marked as used
      expect(tokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
    });

    it('should throw BadRequestException when token not found', async () => {
      tokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.confirmReset('invalid-token', 'NewPass1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token already used', async () => {
      const rawToken = 'b'.repeat(64);
      const record: Partial<PasswordResetToken> = {
        tokenHash: sha256(rawToken),
        usedAt: new Date(Date.now() - 10_000),
        expiresAt: new Date(Date.now() + 3_600_000),
        user: makeUser(),
      };
      tokenRepo.findOne.mockResolvedValue(record);

      await expect(
        service.confirmReset(rawToken, 'NewPass1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is expired', async () => {
      const rawToken = 'c'.repeat(64);
      const record: Partial<PasswordResetToken> = {
        tokenHash: sha256(rawToken),
        usedAt: null,
        expiresAt: new Date(Date.now() - 1_000), // expired
        user: makeUser(),
      };
      tokenRepo.findOne.mockResolvedValue(record);

      await expect(
        service.confirmReset(rawToken, 'NewPass1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is inactive', async () => {
      const rawToken = 'd'.repeat(64);
      const record: Partial<PasswordResetToken> = {
        tokenHash: sha256(rawToken),
        usedAt: null,
        expiresAt: new Date(Date.now() + 3_600_000),
        user: makeUser({ isActive: false }),
      };
      tokenRepo.findOne.mockResolvedValue(record);

      await expect(
        service.confirmReset(rawToken, 'NewPass1!'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
