import { Injectable } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { TaskInput, TaskUpdate } from './task.types';

export class TaskError extends Error {
  constructor(
    public readonly code: 'DAY_NOT_FOUND' | 'TASK_NOT_FOUND' | 'EMPTY_UPDATE',
  ) {
    super(code);
  }
}

@Injectable()
export class TasksService {
  constructor(private readonly tasks: TasksRepository) {}
  async create(dayId: string, userId: string, input: TaskInput) {
    const task = await this.tasks.createOwned(dayId, userId, input);
    if (!task) throw new TaskError('DAY_NOT_FOUND');
    return task;
  }
  async update(id: string, userId: string, input: TaskUpdate) {
    if (
      input.title === undefined &&
      input.description === undefined &&
      input.status === undefined
    )
      throw new TaskError('EMPTY_UPDATE');
    const task = await this.tasks.updateOwned(id, userId, input);
    if (!task) throw new TaskError('TASK_NOT_FOUND');
    return task;
  }
  async remove(id: string, userId: string) {
    if (!(await this.tasks.deleteOwned(id, userId)))
      throw new TaskError('TASK_NOT_FOUND');
  }
}
