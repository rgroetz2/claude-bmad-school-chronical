import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ── Auth helpers ────────────────────────────────────────────────────────────

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username, isActive: true },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      withDeleted: false,
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      forcePasswordChange: false,
    });
  }

  // ── Admin operations ────────────────────────────────────────────────────────

  /**
   * List all users (including inactive). Admin only.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find any user by ID regardless of isActive. Admin only.
   */
  async findByIdAdmin(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Create a new user account. Admin only.
   * - Hashes temporary password
   * - Sets forcePasswordChange = true
   */
  async create(dto: CreateUserDto): Promise<User> {
    const existingUsername = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException(
        `Username "${dto.username}" is already taken.`,
      );
    }

    const existingEmail = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Email "${dto.email}" is already registered.`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);

    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: dto.role,
      isActive: true,
      forcePasswordChange: true,
    });

    return this.userRepository.save(user);
  }

  /**
   * Update a user's role and/or active status. Admin only.
   * If deactivated (isActive → false), existing sessions will be denied
   * on next JWT validation (JwtStrategy checks isActive).
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }

    Object.assign(user, {
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return this.userRepository.save(user);
  }
}
