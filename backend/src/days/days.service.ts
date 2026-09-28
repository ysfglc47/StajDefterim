import { Injectable } from '@nestjs/common';
import { DayInput, DaysRepository } from './days.repository';

export class DayError extends Error {
  constructor(public readonly code: 'DAY_NOT_FOUND' | 'EMPTY_UPDATE') {
    super(code);
  }
}

@Injectable()
export class DaysService {
  constructor(private readonly days: DaysRepository) {}
  list(userId: string) {
    return this.days.listOwned(userId);
  }
  create(userId: string, input: DayInput) {
    return this.days.createOwned(userId, input);
  }
  async detail(id: string, userId: string) {
    const day = await this.days.findOwnedById(id, userId);
    if (!day) throw new DayError('DAY_NOT_FOUND');
    return day;
  }
  async update(id: string, userId: string, input: Partial<DayInput>) {
    if (
      input.date === undefined &&
      input.title === undefined &&
      input.description === undefined
    )
      throw new DayError('EMPTY_UPDATE');
    const day = await this.days.updateOwned(id, userId, input);
    if (!day) throw new DayError('DAY_NOT_FOUND');
    return day;
  }
  async remove(id: string, userId: string) {
    if (!(await this.days.deleteOwned(id, userId)))
      throw new DayError('DAY_NOT_FOUND');
  }
}
