import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../../shared/api/client';
import type { TaskRecord } from '../tasks/task.types';

export interface DayInput {
  date: string;
  title: string;
  description: string;
}
export interface Day extends Omit<DayInput, 'description'> {
  id: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface DayDetail extends Day {
  tasks: TaskRecord[];
}

export function useDaysApi() {
  const { request } = useAuth();
  return useMemo(
    () => ({
      create: (input: DayInput, signal: AbortSignal) =>
        request<Day>('/days', { method: 'POST', body: input, signal }),
      update: (id: string, input: Partial<DayInput>, signal: AbortSignal) =>
        request<Day>(`/days/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: input,
          signal,
        }),
      remove: (id: string, signal: AbortSignal) =>
        request<void>(`/days/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          signal,
        }),
    }),
    [request],
  );
}

function useDaysQuery<T>(path: string) {
  const { request } = useAuth();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    error?: ApiError;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void request<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            path,
            error:
              error instanceof ApiError
                ? error
                : new ApiError(0, 'Kayıtlar yüklenemedi.'),
          });
      });
    return () => controller.abort();
  }, [path, request, revision]);
  const current = result?.path === path ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: !current,
    retry: () => {
      setResult(null);
      setRevision((value) => value + 1);
    },
  };
}

export const useDaysList = () => useDaysQuery<Day[]>('/days');
export const useDay = (id: string) =>
  useDaysQuery<DayDetail>(`/days/${encodeURIComponent(id)}`);

export function formatDayDate(date: string) {
  return date.split('-').reverse().join('.');
}
export function todayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
