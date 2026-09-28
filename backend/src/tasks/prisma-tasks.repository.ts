import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksRepository } from './tasks.repository';
import { TaskInput, TaskUpdate } from './task.types';

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaTasksRepository extends TasksRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  createOwned(dayId: string, userId: string, input: TaskInput) {
    return this.prisma.$transaction(async (tx) => {
      const day = await tx.internshipDay.findFirst({
        where: { id: dayId, userId },
        select: { id: true },
      });
      if (!day) return null;
      return tx.task.create({
        data: {
          title: input.title,
          description: input.description,
          dayId: day.id,
          status: 'TODO',
        },
        select: taskSelect,
      });
    });
  }

  updateOwned(id: string, userId: string, input: TaskUpdate) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.task.updateMany({
        where: { id, day: { userId } },
        data: input,
      });
      if (!changed.count) return null;
      return tx.task.findFirst({
        where: { id, day: { userId } },
        select: taskSelect,
      });
    });
  }

  async deleteOwned(id: string, userId: string) {
    const result = await this.prisma.task.deleteMany({
      where: { id, day: { userId } },
    });
    return result.count > 0;
  }
}
