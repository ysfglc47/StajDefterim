export const TASK_STATUS_LABELS = {
  TODO: 'Yapılacak',
  IN_PROGRESS: 'Devam Ediyor',
  DONE: 'Tamamlandı',
} as const;
export type TaskStatus = keyof typeof TASK_STATUS_LABELS;
export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
export interface TaskDraft {
  title: string;
  description: string;
  status: TaskStatus;
}
