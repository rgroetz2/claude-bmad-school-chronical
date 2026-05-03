import { v4 as uuidv4 } from 'uuid';
import { UsersService, User } from './users.service';
import { comparePassword } from '../utils/password.util';
import { signToken, JwtPayload } from '../utils/jwt.util';
import { redis, refreshTokenKey, userRefreshPattern } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;  // opaque: userId.tokenId
  refreshTokenId: string;
  expiresIn: number;     // seconds
}

export const AuthService = {
  async validateUser(username: string, password: string): Promise<User> {
    const user = await UsersService.findByUsername(username);

    const invalid = new AppError(401, 'Your username or password is incorrect.');

    if (!user) throw invalid;

    const match = await comparePassword(password, user.password_hash);
    if (!match) throw invalid;

    return user;
  },

  async login(user: User): Promise<TokenSet> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = signToken(payload);

    const refreshTokenId = uuidv4();
    const refreshToken = `${user.id}.${refreshTokenId}`;

    await redis.set(
      refreshTokenKey(user.id, refreshTokenId),
      user.id,
      'EX',
      env.jwt.refreshTokenTtlSeconds,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  },

  async refresh(rawRefreshToken: string): Promise<TokenSet> {
    const invalid = new AppError(401, 'Invalid or expired session.');

    const parts = rawRefreshToken.split('.');
    if (parts.length !== 2) throw invalid;

    const [userId, tokenId] = parts;
    const key = refreshTokenKey(userId, tokenId);
    const storedUserId = await redis.get(key);

    if (!storedUserId || storedUserId !== userId) throw invalid;

    const user = await UsersService.findById(userId);
    if (!user || !user.is_active) throw invalid;

    // Rotate: delete old, issue new
    await redis.del(key);
    return AuthService.login(user);
  },

  async logout(userId: string, refreshTokenId: string): Promise<void> {
    await redis.del(refreshTokenKey(userId, refreshTokenId));
  },

  async invalidateAllSessions(userId: string): Promise<void> {
    const pattern = userRefreshPattern(userId);
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
