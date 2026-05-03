import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_ID_COOKIE = 'refresh_token_id';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/v1/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Returns access token in body; sets refresh token as HttpOnly cookie
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute per IP
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.username, dto.password);
    const tokens = await this.authService.login(user);

    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    res.cookie(REFRESH_TOKEN_ID_COOKIE, tokens.refreshTokenId, COOKIE_OPTIONS);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange,
      },
    };
  }

  /**
   * POST /api/v1/auth/refresh
   * Reads refresh token from HttpOnly cookie, rotates tokens
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No active session');
    }

    const tokens = await this.authService.refresh(refreshToken);

    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    res.cookie(REFRESH_TOKEN_ID_COOKIE, tokens.refreshTokenId, COOKIE_OPTIONS);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidates refresh token in Redis; clears cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenId = req.cookies?.[REFRESH_TOKEN_ID_COOKIE];
    if (user && refreshTokenId) {
      await this.authService.logout(user.id, refreshTokenId);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
    res.clearCookie(REFRESH_TOKEN_ID_COOKIE, { path: '/api/v1/auth' });
  }
}
