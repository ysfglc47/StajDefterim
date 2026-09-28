import { TaskInput, TaskRecord, TaskUpdate } from './task.types';

export abstract class TasksRepository {
  abstract createOwned(
    dayId: string,
    userId: string,
    input: TaskInput,
  ): Promise<TaskRecord | null>;
  abstract updateOwned(
    id: string,
    userId: string,
    input: TaskUpdate,
  ): Promise<TaskRecord | null>;
  abstract deleteOwned(id: string, userId: string): Promise<boolean>;
}
