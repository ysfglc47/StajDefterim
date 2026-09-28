import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async checkSchema(): Promise<void> {
    // Query all three tables so an unmigrated database cannot report ready.
    await this.prisma.$transaction([
      this.prisma.user.findFirst({ select: { id: true } }),
      this.prisma.internshipDay.findFirst({ select: { id: true } }),
      this.prisma.task.findFirst({ select: { id: true } }),
    ]);
  }
}
