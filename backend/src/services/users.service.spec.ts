import { UsersService } from './users.service';
import { db } from '../config/db';
import * as passwordUtil from '../utils/password.util';
import { AppError } from '../middleware/error.middleware';

// ── Mock dependencies ─────────────────────────────────────────────────────────
jest.mock('../config/db', () => ({
  db: { query: jest.fn() },
}));

jest.mock('../utils/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
}));

const mockDb = db as jest.Mocked<typeof db>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeUserRow = (overrides = {}) => ({
  id: 'uuid-1',
  username: 'teacher1',
  email: 'teacher1@school.de',
  password_hash: 'hashed_pw',
  role: 'teacher' as const,
  is_active: true,
  force_password_change: false,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

const makePublic = (row = makeUserRow()) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  role: row.role,
  isActive: row.is_active,
  forcePasswordChange: row.force_password_change,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('UsersService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── findByUsername ──────────────────────────────────────────────────────────
  describe('findByUsername', () => {
    it('returns a user when found', async () => {
      const row = makeUserRow();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await UsersService.findByUsername('teacher1');

      expect(result).toEqual(row);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('username = $1'),
        ['teacher1'],
      );
    });

    it('returns null when no rows returned', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await UsersService.findByUsername('nobody');

      expect(result).toBeNull();
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns active user by id', async () => {
      const row = makeUserRow();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await UsersService.findById('uuid-1');

      expect(result).toEqual(row);
    });

    it('returns null when not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await UsersService.findById('missing-id');

      expect(result).toBeNull();
    });
  });

  // ── findByEmail ─────────────────────────────────────────────────────────────
  describe('findByEmail', () => {
    it('returns user matching email', async () => {
      const row = makeUserRow();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await UsersService.findByEmail('teacher1@school.de');

      expect(result).toEqual(row);
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all users as public DTOs', async () => {
      const rows = [makeUserRow(), makeUserRow({ id: 'uuid-2', username: 'admin1', role: 'admin' as const })];
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows });

      const result = await UsersService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password_hash');
      expect(result[0]).toHaveProperty('isActive');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────
  describe('create', () => {
    const payload = {
      username: 'newuser',
      email: 'new@school.de',
      temporaryPassword: 'Secret123!',
      role: 'teacher' as const,
    };

    it('creates a user and returns public DTO', async () => {
      const newRow = makeUserRow({ username: 'newuser', email: 'new@school.de', force_password_change: true });
      // username check → not taken
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // email check → not taken
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // INSERT RETURNING
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [newRow] });

      const result = await UsersService.create(payload);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('Secret123!');
      expect(result).toEqual(makePublic(newRow));
    });

    it('throws 409 when username is already taken', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      const err = await UsersService.create(payload).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(409);
    });

    it('throws 409 when email is already registered', async () => {
      // username free
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // email taken
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      await expect(UsersService.create(payload)).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('throws 404 when user does not exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(UsersService.update('ghost-id', { role: 'admin' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns current DTO unchanged when no fields provided', async () => {
      const row = makeUserRow();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await UsersService.update('uuid-1', {});

      expect(result).toEqual(makePublic(row));
      // Only the initial SELECT should have been called, no UPDATE
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('updates role correctly', async () => {
      const row = makeUserRow();
      const updatedRow = { ...row, role: 'admin' as const };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [row] })          // SELECT
        .mockResolvedValueOnce({ rows: [updatedRow] }); // UPDATE

      const result = await UsersService.update('uuid-1', { role: 'admin' });

      expect(result.role).toBe('admin');
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['admin', 'uuid-1']),
      );
    });

    it('updates isActive correctly', async () => {
      const row = makeUserRow();
      const updatedRow = { ...row, is_active: false };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await UsersService.update('uuid-1', { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });

  // ── updatePassword ──────────────────────────────────────────────────────────
  describe('updatePassword', () => {
    it('calls UPDATE with new hash and resets force_password_change', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await UsersService.updatePassword('uuid-1', 'new_hash');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('force_password_change = false'),
        ['new_hash', 'uuid-1'],
      );
    });
  });
});
