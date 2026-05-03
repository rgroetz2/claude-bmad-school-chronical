import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    username: 'teacher1',
    email: 'teacher1@school.de',
    passwordHash: '$2b$12$hash',
    role: UserRole.TEACHER,
    isActive: true,
    forcePasswordChange: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as User;
}

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((u) => Promise.resolve({ ...u, id: 'new-uuid' })),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all users ordered by createdAt DESC', async () => {
      const users = [makeUser({ id: '1' }), makeUser({ id: '2', isActive: false })];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(userRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateUserDto = {
      username: 'newteacher',
      email: 'new@school.de',
      temporaryPassword: 'TempPass123!',
      role: UserRole.TEACHER,
    };

    it('should create user with hashed password and forcePasswordChange=true', async () => {
      userRepo.findOne.mockResolvedValue(null); // no conflict

      const result = await service.create(dto);

      expect(userRepo.save).toHaveBeenCalled();
      const savedUser = userRepo.save.mock.calls[0][0];
      expect(savedUser.username).toBe(dto.username);
      expect(savedUser.email).toBe(dto.email);
      expect(savedUser.role).toBe(UserRole.TEACHER);
      expect(savedUser.forcePasswordChange).toBe(true);
      expect(savedUser.isActive).toBe(true);
      // Verify password was hashed
      const isHashed = await bcrypt.compare(dto.temporaryPassword, savedUser.passwordHash);
      expect(isHashed).toBe(true);
    });

    it('should throw ConflictException when username already exists', async () => {
      userRepo.findOne.mockResolvedValueOnce(makeUser()); // username conflict

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // no username conflict
        .mockResolvedValueOnce(makeUser()); // email conflict

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update role of existing user', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, role: UserRole.COORDINATOR });

      const dto: UpdateUserDto = { role: UserRole.COORDINATOR };
      const result = await service.update(user.id, dto);

      expect(result.role).toBe(UserRole.COORDINATOR);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.COORDINATOR }),
      );
    });

    it('should deactivate user (isActive = false)', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, isActive: false });

      const dto: UpdateUserDto = { isActive: false };
      const result = await service.update(user.id, dto);

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByUsername ────────────────────────────────────────────────────────────

  describe('findByUsername', () => {
    it('should return active user by username', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findByUsername('teacher1');
      expect(result).toEqual(user);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'teacher1', isActive: true },
      });
    });

    it('should return null when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.findByUsername('unknown');
      expect(result).toBeNull();
    });
  });

  // ── updatePassword ────────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('should update password hash and clear forcePasswordChange', async () => {
      await service.updatePassword('user-id', 'new-hash');
      expect(userRepo.update).toHaveBeenCalledWith('user-id', {
        passwordHash: 'new-hash',
        forcePasswordChange: false,
      });
    });
  });
});
