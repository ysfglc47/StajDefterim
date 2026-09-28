import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DayInput, DaysRepository } from './days.repository';

const daySelect = {
  id: true,
  date: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;
const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaDaysRepository extends DaysRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  listOwned(userId: string) {
    return this.prisma.internshipDay.findMany({
      where: { userId },
      select: daySelect,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  createOwned(userId: string, input: DayInput) {
    return this.prisma.internshipDay.create({
      data: { ...input, userId },
      select: daySelect,
    });
  }

  findOwnedById(id: string, userId: string) {
    return this.prisma.internshipDay.findFirst({
      where: { id, userId },
      select: {
        ...daySelect,
        tasks: {
          select: taskSelect,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  updateOwned(id: string, userId: string, input: Partial<DayInput>) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.internshipDay.updateMany({
        where: { id, userId },
        data: input,
      });
      if (!changed.count) return null;
      return tx.internshipDay.findFirst({
        where: { id, userId },
        select: daySelect,
      });
    });
  }

  async deleteOwned(id: string, userId: string) {
    // The database cascades task deletion atomically with this statement.
    const result = await this.prisma.internshipDay.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}
