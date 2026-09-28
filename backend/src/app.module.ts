import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { createValidationPipe } from './common/validation.pipe';
import { DaysModule } from './days/days.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, DaysModule, TasksModule],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class AppModule {}
