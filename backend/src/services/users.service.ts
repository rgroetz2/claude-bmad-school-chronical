import { db } from '../config/db';
import { hashPassword } from '../utils/password.util';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '../utils/jwt.util';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  force_password_change: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toPublic(row: User): UserPublic {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    forcePasswordChange: row.force_password_change,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const UsersService = {
  async findByUsername(username: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE username = $1 AND is_active = true AND deleted_at IS NULL',
      [username],
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] ?? null;
  },

  async findByIdAdmin(id: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email],
    );
    return result.rows[0] ?? null;
  },

  async findAll(): Promise<UserPublic[]> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC',
    );
    return result.rows.map(toPublic);
  },

  async create(data: {
    username: string;
    email: string;
    temporaryPassword: string;
    role: UserRole;
  }): Promise<UserPublic> {
    // Uniqueness checks
    const existingUsername = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [data.username],
    );
    if (existingUsername.rows.length > 0) {
      throw new AppError(409, `Username "${data.username}" is already taken.`);
    }

    const existingEmail = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email],
    );
    if (existingEmail.rows.length > 0) {
      throw new AppError(409, `Email "${data.email}" is already registered.`);
    }

    const passwordHash = await hashPassword(data.temporaryPassword);

    const result = await db.query<User>(
      `INSERT INTO users (username, email, password_hash, role, is_active, force_password_change)
       VALUES ($1, $2, $3, $4, true, true)
       RETURNING *`,
      [data.username, data.email, passwordHash, data.role],
    );
    return toPublic(result.rows[0]);
  },

  async update(
    id: string,
    data: { role?: UserRole; isActive?: boolean },
  ): Promise<UserPublic> {
    const user = await db.query<User>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (!user.rows[0]) {
      throw new AppError(404, `User ${id} not found.`);
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.role !== undefined) {
      setClauses.push(`role = $${idx++}`);
      params.push(data.role);
    }
    if (data.isActive !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      params.push(data.isActive);
    }

    if (setClauses.length === 0) {
      return toPublic(user.rows[0]);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query<User>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return toPublic(result.rows[0]);
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db.query(
      `UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId],
    );
  },
};
