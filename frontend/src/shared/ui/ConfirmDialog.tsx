import { useEffect, useId, useRef, type ReactNode } from 'react';

export function ConfirmDialog({
  title,
  children,
  pending,
  error,
  onCancel,
  onConfirm,
  confirmLabel = 'Evet, günü sil',
}: {
  title: string;
  children: ReactNode;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <div id={`${id}-description`}>{children}</div>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      <div className="day-actions">
        <button ref={cancel} disabled={pending} onClick={onCancel}>
          Vazgeç
        </button>
        <button
          className="danger-button"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? 'Siliniyor…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
