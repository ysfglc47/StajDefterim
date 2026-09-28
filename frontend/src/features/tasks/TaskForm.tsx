import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { validateTextFields } from '../../shared/text.validation';
import {
  TASK_STATUS_LABELS,
  type TaskDraft,
  type TaskStatus,
} from './task.types';

export function TaskForm({
  initial,
  editing = false,
  onSave,
  onCancel,
}: {
  initial: TaskDraft;
  editing?: boolean;
  onSave: (input: TaskDraft, signal: AbortSignal) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    form.current?.querySelector('input')?.focus();
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (error) summary.current?.focus();
  }, [error]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    const fieldErrors = validateTextFields(values);
    setErrors(fieldErrors);
    setError('');
    if (Object.keys(fieldErrors).length) {
      form.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(fieldErrors)[0]}"]`)
        ?.focus();
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    try {
      await onSave({ ...values, title: values.title.trim() }, request.signal);
    } catch (reason) {
      if (!request.signal.aborted) {
        setError(
          reason instanceof Error ? reason.message : 'Görev kaydedilemedi.',
        );
        if (reason instanceof ApiError) setErrors(reason.fieldErrors);
      }
    } finally {
      if (!request.signal.aborted) {
        controller.current = null;
        setPending(false);
      }
    }
  }
  return (
    <form
      className="task-form"
      ref={form}
      onSubmit={submit}
      noValidate
      aria-busy={pending}
      aria-label={editing ? 'Görevi düzenle' : 'Yeni görev'}
    >
      <h3>{editing ? 'Görevi düzenle' : 'Yeni görev'}</h3>
      {error && (
        <div
          className="feedback error"
          role="alert"
          tabIndex={-1}
          ref={summary}
        >
          {error}
        </div>
      )}
      <div className="form-field">
        <label htmlFor={`${id}-title`}>Görev başlığı</label>
        <input
          id={`${id}-title`}
          name="title"
          value={values.title}
          disabled={pending}
          onChange={(event) =>
            setValues({ ...values, title: event.target.value })
          }
          aria-invalid={!!errors.title}
          aria-describedby={`${id}-title-hint`}
        />
        <p
          className={errors.title ? 'field-error' : 'field-hint'}
          id={`${id}-title-hint`}
        >
          {errors.title?.join(' ') ?? 'En fazla 120 karakter.'}
        </p>
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-description`}>
          Görev açıklaması (isteğe bağlı)
        </label>
        <textarea
          id={`${id}-description`}
          name="description"
          rows={4}
          value={values.description}
          disabled={pending}
          onChange={(event) =>
            setValues({ ...values, description: event.target.value })
          }
          aria-invalid={!!errors.description}
          aria-describedby={`${id}-description-hint`}
        />
        <p
          className={errors.description ? 'field-error' : 'field-hint'}
          id={`${id}-description-hint`}
        >
          {errors.description?.join(' ') ??
            `${Array.from(values.description).length} / 2000 karakter`}
        </p>
      </div>
      {editing ? (
        <div className="form-field">
          <label htmlFor={`${id}-status`}>Görev durumu</label>
          <select
            id={`${id}-status`}
            value={values.status}
            disabled={pending}
            onChange={(event) =>
              setValues({ ...values, status: event.target.value as TaskStatus })
            }
            aria-invalid={!!errors.status}
            aria-describedby={errors.status ? `${id}-status-error` : undefined}
          >
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="field-error" id={`${id}-status-error`}>
              {errors.status.join(' ')}
            </p>
          )}
        </div>
      ) : (
        <p className="field-hint">
          Yeni görev “Yapılacak” durumunda oluşturulur.
        </p>
      )}
      <div className="day-actions">
        <button className="primary-button" disabled={pending} type="submit">
          {pending
            ? 'Kaydediliyor…'
            : editing
              ? 'Görevi kaydet'
              : 'Görevi ekle'}
        </button>
        <button type="button" disabled={pending} onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
