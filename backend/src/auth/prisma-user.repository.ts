import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { AuthError } from './auth.errors';
import { AuthUser, UserRepository } from './user.repository';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  async create(data: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>) {
    try {
      return await this.prisma.user.create({ data, select: safeUserSelect });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AuthError('EMAIL_TAKEN');
      }
      throw error;
    }
  }
}
