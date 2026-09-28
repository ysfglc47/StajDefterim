import type { TaskRecord } from '../tasks/task.types';

export interface DayInput {
  date: string;
  title: string;
  description?: string;
}
export interface Day {
  id: string;
  date: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface DayDetail extends Day {
  tasks: TaskRecord[];
}

export abstract class DaysRepository {
  abstract listOwned(userId: string): Promise<Day[]>;
  abstract createOwned(userId: string, input: DayInput): Promise<Day>;
  abstract findOwnedById(id: string, userId: string): Promise<DayDetail | null>;
  abstract updateOwned(
    id: string,
    userId: string,
    input: Partial<DayInput>,
  ): Promise<Day | null>;
  abstract deleteOwned(id: string, userId: string): Promise<boolean>;
}
