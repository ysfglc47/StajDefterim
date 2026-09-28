import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DaysFeedback } from './DaysFeedback';
import { formatDayDate, useDay, useDaysApi } from './days.api';
import { TasksPanel } from '../tasks/TasksPanel';

export function DayDetailPage() {
  const { id = '' } = useParams();
  const query = useDay(id);
  const api = useDaysApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!query.data) return <DaysFeedback {...query} />;
  const day = query.data;
  const message = (location.state as { message?: string } | null)?.message;
  async function remove() {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError('');
    try {
      await api.remove(id, request.signal);
      if (!request.signal.aborted)
        navigate('/gunler', {
          replace: true,
          state: { message: 'Staj günü ve bağlı görevleri silindi.' },
        });
    } catch (reason) {
      if (!request.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Gün silinemedi.');
    } finally {
      if (!request.signal.aborted) {
        controller.current = null;
        setPending(false);
      }
    }
  }
  return (
    <section className="days-section">
      <Link to="/gunler">← Staj günlerim</Link>
      {message && (
        <p className="feedback success" role="status">
          {message}
        </p>
      )}
      <div className="day-heading">
        <div>
          <time dateTime={day.date}>{formatDayDate(day.date)}</time>
          <h1>{day.title}</h1>
        </div>
        <div className="day-actions">
          <Link className="primary-link" to={`/gunler/${id}/duzenle`}>
            Düzenle
          </Link>
          <button
            className="danger-button"
            onClick={() => {
              setError('');
              setConfirm(true);
            }}
          >
            Günü sil
          </button>
        </div>
      </div>
      <article className="day-content">
        <h2>Günün notları</h2>
        <p className="day-description">
          {day.description || 'Bu gün için açıklama eklenmemiş.'}
        </p>
      </article>
      <TasksPanel key={day.id} dayId={day.id} initialTasks={day.tasks} />
      {confirm && (
        <ConfirmDialog
          title="Bu staj günü silinsin mi?"
          pending={pending}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void remove()}
        >
          <p>
            “{day.title}” ve bu güne bağlı tüm görevler birlikte silinecek. Bu
            işlem geri alınamaz.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
