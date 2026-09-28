export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export interface TaskInput {
  title: string;
  description?: string;
}
export interface TaskUpdate extends Partial<TaskInput> {
  status?: TaskStatus;
}
export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}
