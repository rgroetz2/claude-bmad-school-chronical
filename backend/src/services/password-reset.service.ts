import * as crypto from 'crypto';
import { db } from '../config/db';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { hashPassword } from '../utils/password.util';
import { sendMail } from '../config/mailer';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const TOKEN_EXPIRY_HOURS = 24;

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export const PasswordResetService = {
  /**
   * Always resolves — never reveals whether email exists.
   */
  async requestReset(email: string): Promise<void> {
    const user = await UsersService.findByEmail(email);
    if (!user || !user.is_active) return;

    // Invalidate previous unused tokens
    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [user.id],
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt],
    );

    const resetUrl = `${env.frontendUrl}/reset-password?token=${rawToken}`;

    sendMail({
      to: user.email,
      subject: 'SchoolCronicle – Passwort zurücksetzen',
      template: 'password-reset',
      context: {
        username: user.username,
        resetUrl,
        expiryHours: TOKEN_EXPIRY_HOURS,
      },
    })
      .then(() => console.log(`[Mail] Password reset sent to ${user.email}`))
      .catch((err) =>
        console.error(`[Mail] Failed to send reset email:`, err.message),
      );
  },

  async confirmReset(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = sha256(rawToken);

    const result = await db.query<{
      id: string;
      user_id: string;
      used_at: Date | null;
      expires_at: Date;
      is_active: boolean;
    }>(
      `SELECT prt.id, prt.user_id, prt.used_at, prt.expires_at, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1`,
      [tokenHash],
    );

    const record = result.rows[0];

    if (!record) {
      throw new AppError(400, 'Ungültiger oder abgelaufener Token.');
    }
    if (record.used_at !== null) {
      throw new AppError(
        400,
        'Dieser Link wurde bereits verwendet. Bitte fordern Sie einen neuen an.',
      );
    }
    if (new Date(record.expires_at) < new Date()) {
      throw new AppError(
        400,
        'Dieser Link ist abgelaufen (Gültigkeit: 24 Stunden). Bitte fordern Sie einen neuen an.',
      );
    }
    if (!record.is_active) {
      throw new AppError(400, 'Ungültiger oder abgelaufener Token.');
    }

    const passwordHash = await hashPassword(newPassword);

    // Mark token used
    await db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [record.id],
    );

    // Update password
    await UsersService.updatePassword(record.user_id, passwordHash);

    // Purge all sessions
    await AuthService.invalidateAllSessions(record.user_id);

    console.log(
      `[Auth] Password reset completed for user ${record.user_id}; sessions purged`,
    );
  },
};
