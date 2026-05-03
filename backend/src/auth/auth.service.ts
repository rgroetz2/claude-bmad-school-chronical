import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Parse "7d" → seconds
    this.refreshTokenTtlSeconds = 7 * 24 * 60 * 60;
  }

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.usersService.findByUsername(username);

    // Generic error — do not reveal whether username or password is wrong
    const invalid = new UnauthorizedException(
      'Your username or password is incorrect',
    );

    if (!user) throw invalid;

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) throw invalid;

    return user;
  }

  async login(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenId: string;
    expiresIn: number;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token: opaque UUID stored in Redis
    const refreshTokenId = uuidv4();
    const refreshToken = `${user.id}.${refreshTokenId}`;

    await this.redisService.set(
      this.redisService.refreshTokenKey(user.id, refreshTokenId),
      user.id,
      this.refreshTokenTtlSeconds,
    );

    this.logger.log(`User ${user.username} logged in`);

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async refresh(rawRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenId: string;
    expiresIn: number;
  }> {
    const invalid = new UnauthorizedException('Invalid or expired session');

    const parts = rawRefreshToken.split('.');
    if (parts.length !== 2) throw invalid;

    const [userId, tokenId] = parts;
    const key = this.redisService.refreshTokenKey(userId, tokenId);
    const storedUserId = await this.redisService.get(key);

    if (!storedUserId || storedUserId !== userId) throw invalid;

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) throw invalid;

    // Rotate: delete old token, issue new one
    await this.redisService.del(key);
    return this.login(user);
  }

  async logout(userId: string, refreshTokenId: string): Promise<void> {
    await this.redisService.del(
      this.redisService.refreshTokenKey(userId, refreshTokenId),
    );
    this.logger.log(`User ${userId} logged out`);
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await this.redisService.delPattern(
      this.redisService.userRefreshPattern(userId),
    );
  }
}
