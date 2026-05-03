import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PasswordResetService } from './password-reset.service';
import { RequestResetDto } from './dto/request-reset.dto';
import { ConfirmResetDto } from './dto/confirm-reset.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  /**
   * POST /api/v1/auth/password-reset/request
   * Always returns 200 to prevent email enumeration.
   */
  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute per IP
  async request(@Body() dto: RequestResetDto): Promise<{ message: string }> {
    await this.passwordResetService.requestReset(dto.email);
    return {
      message:
        'Falls diese E-Mail-Adresse bei uns registriert ist, erhalten Sie in Kürze eine Nachricht.',
    };
  }

  /**
   * POST /api/v1/auth/password-reset/confirm
   * Validates token and sets new password.
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute per IP
  async confirm(
    @Body() dto: ConfirmResetDto,
  ): Promise<{ message: string }> {
    await this.passwordResetService.confirmReset(dto.token, dto.newPassword);
    return { message: 'Ihr Passwort wurde erfolgreich zurückgesetzt.' };
  }
}
