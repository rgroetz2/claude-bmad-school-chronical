import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetController } from './password-reset.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken]),
    forwardRef(() => UsersModule), // avoid circular dep with UsersModule
    AuthModule,
  ],
  providers: [PasswordResetService],
  controllers: [PasswordResetController],
  exports: [PasswordResetService], // exported so UsersController can inject it
})
export class PasswordResetModule {}
