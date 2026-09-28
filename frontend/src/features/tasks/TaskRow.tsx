import { useEffect, useId, useRef, useState } from 'react';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { TaskForm } from './TaskForm';
import { useTasksApi } from './tasks.api';
import {
  TASK_STATUS_LABELS,
  type TaskDraft,
  type TaskRecord,
  type TaskStatus,
} from './task.types';

export function TaskRow({
  task,
  onChange,
  onDelete,
  announce,
}: {
  task: TaskRecord;
  onChange: (task: TaskRecord) => void;
  onDelete: (id: string) => void;
  announce: (message: string) => void;
}) {
  const api = useTasksApi();
  const statusId = useId();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function save(values: TaskDraft, signal: AbortSignal) {
    const changes: Partial<TaskDraft> = {};
    if (values.title !== task.title) changes.title = values.title;
    if (values.description !== (task.description ?? ''))
      changes.description = values.description;
    if (values.status !== task.status) changes.status = values.status;
    const saved = Object.keys(changes).length
      ? await api.update(task.id, changes, signal)
      : task;
    if (!signal.aborted) {
      onChange(saved);
      setEditing(false);
      announce(
        Object.keys(changes).length
          ? 'Görev güncellendi.'
          : 'Değişiklik yapılmadı.',
      );
    }
  }

  async function changeStatus(status: TaskStatus) {
    if (controller.current || status === task.status) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError('');
    announce('');
    try {
      const saved = await api.update(task.id, { status }, request.signal);
      if (!request.signal.aborted) {
        onChange(saved);
        announce(
          `Görev durumu “${TASK_STATUS_LABELS[saved.status]}” olarak güncellendi.`,
        );
      }
    } catch (reason) {
      if (!request.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Görev durumu değiştirilemedi.',
        );
    } finally {
      if (!request.signal.aborted) {
        controller.current = null;
        setPending(false);
      }
    }
  }
  async function remove() {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError('');
    announce('');
    try {
      await api.remove(task.id, request.signal);
      if (!request.signal.aborted) {
        setConfirm(false);
        onDelete(task.id);
        announce('Görev silindi.');
      }
    } catch (reason) {
      if (!request.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : 'Görev silinemedi.',
        );
    } finally {
      if (!request.signal.aborted) {
        controller.current = null;
        setPending(false);
      }
    }
  }
  return (
    <li className="task-row" aria-label={task.title}>
      {editing ? (
        <TaskForm
          initial={{
            title: task.title,
            description: task.description ?? '',
            status: task.status,
          }}
          editing
          onSave={save}
          onCancel={() => {
            setEditing(false);
            requestAnimationFrame(() => editButton.current?.focus());
          }}
        />
      ) : (
        <>
          <div className="task-row-heading">
            <h3>{task.title}</h3>
            <span className={`task-status ${task.status}`}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
          {task.description && (
            <p className="day-description">{task.description}</p>
          )}
          <div className="task-controls">
            <div className="task-state-select">
              <label htmlFor={statusId}>Görev durumu</label>
              <select
                id={statusId}
                value={task.status}
                disabled={pending}
                onChange={(event) =>
                  void changeStatus(event.target.value as TaskStatus)
                }
              >
                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="day-actions">
              <button
                ref={editButton}
                disabled={pending}
                onClick={() => {
                  setError('');
                  announce('');
                  setEditing(true);
                }}
              >
                Görevi düzenle
              </button>
              <button
                className="danger-button"
                disabled={pending}
                onClick={() => {
                  setError('');
                  setConfirm(true);
                }}
              >
                Görevi sil
              </button>
            </div>
          </div>
          {pending && !confirm && (
            <p role="status" className="field-hint">
              Durum kaydediliyor…
            </p>
          )}
          {error && !confirm && (
            <p className="feedback error" role="alert">
              {error} Tekrar denemek için durumu yeniden seçebilirsin.
            </p>
          )}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title="Bu görev silinsin mi?"
          confirmLabel="Evet, görevi sil"
          pending={pending}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void remove()}
        >
          <p>
            “{task.title}” silinecek. Staj günü ve diğer görevler korunacak. Bu
            işlem geri alınamaz.
          </p>
        </ConfirmDialog>
      )}
    </li>
  );
}
