import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AUTH } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PasswordService } from './password.service';
import { UserRepository } from './user.repository';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || Buffer.byteLength(secret) < 32) {
          throw new Error(
            'JWT_SECRET must contain at least 32 bytes. Run npm run auth:setup.',
          );
        }
        return {
          secret,
          signOptions: {
            algorithm: 'HS256' as const,
            issuer: AUTH.issuer,
            audience: AUTH.audience,
          },
          verifyOptions: {
            algorithms: ['HS256' as const],
            issuer: AUTH.issuer,
            audience: AUTH.audience,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
