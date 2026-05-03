import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Config (loads .env.local then .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USER', 'schoolchronicle'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME', 'schoolchronicle'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Rate limiting (global default: 60 req/min; auth routes override to 5/min)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Email (Nodemailer via @nestjs-modules/mailer)
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST', 'localhost'),
          port: configService.get<number>('SMTP_PORT', 1025),
          secure: configService.get<boolean>('SMTP_SECURE', false),
          auth:
            configService.get<string>('SMTP_USER') &&
            configService.get<string>('SMTP_PASS')
              ? {
                  user: configService.get<string>('SMTP_USER'),
                  pass: configService.get<string>('SMTP_PASS'),
                }
              : undefined,
        },
        defaults: {
          from: configService.get<string>(
            'SMTP_FROM',
            '"SchoolCronicle" <noreply@schoolchronicle.local>',
          ),
        },
        template: {
          dir: join(__dirname, '..', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
      inject: [ConfigService],
    }),

    // Infrastructure
    RedisModule,

    // Feature modules
    UsersModule,
    AuthModule,
    PasswordResetModule,

    // Future: SchoolsModule, PersonsModule, ContributionsModule,
    //         MediaModule, GdprModule, ExportModule, AdminModule
  ],
  controllers: [HealthController],
})
export class AppModule {}
