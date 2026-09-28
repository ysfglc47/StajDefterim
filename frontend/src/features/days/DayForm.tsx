import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';
import type { DayInput } from './days.api';
import { validateTextFields } from '../../shared/text.validation';

function validate(values: DayInput) {
  const errors = validateTextFields(values);
  const [year, month, day] = values.date.split('-').map(Number);
  const parsed = new Date(`${values.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(values.date) ||
    year < 1 ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  )
    errors.date = ['Geçerli bir takvim tarihi seçin.'];
  return errors;
}

export function DayForm({
  initial,
  cancelTo,
  submitLabel,
  onSave,
}: {
  initial: DayInput;
  cancelTo: string;
  submitLabel: string;
  onSave: (input: DayInput, signal: AbortSignal) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (error) summary.current?.focus();
  }, [error]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    const errors = validate(values);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      form.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`)
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
          reason instanceof Error ? reason.message : 'Gün kaydedilemedi.',
        );
        if (reason instanceof ApiError) setFieldErrors(reason.fieldErrors);
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
      className="day-form auth-card"
      ref={form}
      onSubmit={submit}
      noValidate
      aria-busy={pending}
    >
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
        <label htmlFor="date">Tarih</label>
        <input
          id="date"
          name="date"
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          value={values.date}
          onChange={(event) =>
            setValues({ ...values, date: event.target.value })
          }
          disabled={pending}
          aria-invalid={!!fieldErrors.date}
          aria-describedby={fieldErrors.date ? 'date-error' : 'date-hint'}
        />
        <p id="date-hint" className="field-hint">
          Gelecek tarihleri seçebilir, aynı tarihe birden fazla gün
          ekleyebilirsin.
        </p>
        {fieldErrors.date && (
          <p id="date-error" className="field-error">
            {fieldErrors.date.join(' ')}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="title">Başlık</label>
        <input
          id="title"
          name="title"
          value={values.title}
          onChange={(event) =>
            setValues({ ...values, title: event.target.value })
          }
          disabled={pending}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'title-error' : 'title-hint'}
        />
        <p id="title-hint" className="field-hint">
          Bugünün çalışmasını kısaca özetle. En fazla 120 karakter.
        </p>
        {fieldErrors.title && (
          <p id="title-error" className="field-error">
            {fieldErrors.title.join(' ')}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="description">Açıklama (isteğe bağlı)</label>
        <textarea
          id="description"
          name="description"
          rows={8}
          value={values.description}
          onChange={(event) =>
            setValues({ ...values, description: event.target.value })
          }
          disabled={pending}
          aria-invalid={!!fieldErrors.description}
          aria-describedby={
            fieldErrors.description ? 'description-error' : 'description-hint'
          }
        />
        <p id="description-hint" className="field-hint">
          {Array.from(values.description).length} / 2000 karakter
        </p>
        {fieldErrors.description && (
          <p id="description-error" className="field-error">
            {fieldErrors.description.join(' ')}
          </p>
        )}
      </div>
      <div className="day-actions">
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Kaydediliyor…' : submitLabel}
        </button>
        {!pending && <Link to={cancelTo}>Vazgeç</Link>}
      </div>
    </form>
  );
}
