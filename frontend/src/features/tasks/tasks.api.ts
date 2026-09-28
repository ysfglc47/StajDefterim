import { useMemo } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { TaskDraft, TaskRecord } from './task.types';

export function useTasksApi() {
  const { request } = useAuth();
  return useMemo(
    () => ({
      create: (
        dayId: string,
        input: Pick<TaskDraft, 'title' | 'description'>,
        signal: AbortSignal,
      ) =>
        request<TaskRecord>(`/days/${encodeURIComponent(dayId)}/tasks`, {
          method: 'POST',
          body: input,
          signal,
        }),
      update: (id: string, input: Partial<TaskDraft>, signal: AbortSignal) =>
        request<TaskRecord>(`/tasks/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: input,
          signal,
        }),
      remove: (id: string, signal: AbortSignal) =>
        request<void>(`/tasks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          signal,
        }),
    }),
    [request],
  );
}
