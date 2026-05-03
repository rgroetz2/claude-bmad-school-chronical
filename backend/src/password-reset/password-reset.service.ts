import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepo: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Request a password reset. Always returns 200 to prevent email enumeration.
   * If email exists: generates a token, stores its SHA-256 hash, sends email.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      // Silently succeed — do not reveal whether email exists
      this.logger.debug(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // Invalidate any previous unused tokens for this user
    await this.tokenRepo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ usedAt: new Date() })
      .where('user_id = :userId AND used_at IS NULL AND expires_at > NOW()', {
        userId: user.id,
      })
      .execute();

    // Generate a cryptographically random token
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    const record = this.tokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });
    await this.tokenRepo.save(record);

    // Build reset URL
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Send email — fire and forget, log on failure
    this.mailerService
      .sendMail({
        to: user.email,
        subject: 'SchoolCronicle – Passwort zurücksetzen',
        template: 'password-reset',
        context: {
          username: user.username,
          resetUrl,
          expiryHours: this.TOKEN_EXPIRY_HOURS,
        },
      })
      .then(() =>
        this.logger.log(`Password reset email sent to ${user.email}`),
      )
      .catch((err) =>
        this.logger.error(
          `Failed to send password reset email to ${user.email}`,
          err,
        ),
      );
  }

  /**
   * Confirm a password reset using the raw token from the email link.
   * Validates token, updates password, marks token used, purges sessions.
   */
  async confirmReset(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const record = await this.tokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!record) {
      throw new BadRequestException('Ungültiger oder abgelaufener Token.');
    }

    if (record.usedAt !== null) {
      throw new BadRequestException(
        'Dieser Link wurde bereits verwendet. Bitte fordern Sie einen neuen an.',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        'Dieser Link ist abgelaufen (Gültigkeit: 24 Stunden). Bitte fordern Sie einen neuen an.',
      );
    }

    const user = record.user;
    if (!user || !user.isActive) {
      throw new BadRequestException('Ungültiger oder abgelaufener Token.');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Mark token as used
    record.usedAt = new Date();
    await this.tokenRepo.save(record);

    // Update password
    await this.usersService.updatePassword(user.id, passwordHash);

    // Invalidate all active sessions (Redis purge)
    await this.authService.invalidateAllSessions(user.id);

    this.logger.log(
      `Password reset completed for user ${user.username}; all sessions invalidated`,
    );
  }
}
