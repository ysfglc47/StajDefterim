import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { PrismaTasksRepository } from './prisma-tasks.repository';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    { provide: TasksRepository, useClass: PrismaTasksRepository },
  ],
})
export class TasksModule {}
