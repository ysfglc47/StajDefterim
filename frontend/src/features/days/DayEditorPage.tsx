import { Link, useNavigate, useParams } from 'react-router-dom';
import { DayForm } from './DayForm';
import { DaysFeedback } from './DaysFeedback';
import { todayDate, useDay, useDaysApi, type DayInput } from './days.api';

export function NewDayPage() {
  const api = useDaysApi();
  const navigate = useNavigate();
  async function save(input: DayInput, signal: AbortSignal) {
    const day = await api.create(input, signal);
    if (!signal.aborted)
      navigate(`/gunler/${day.id}`, {
        replace: true,
        state: { message: 'Staj günün oluşturuldu.' },
      });
  }
  return (
    <section className="days-section">
      <Link to="/gunler">← Staj günlerim</Link>
      <h1>Yeni staj günü</h1>
      <p className="muted">
        Bugün yaptıklarını ve öğrendiklerini defterine ekle.
      </p>
      <DayForm
        initial={{ date: todayDate(), title: '', description: '' }}
        cancelTo="/gunler"
        submitLabel="Günü oluştur"
        onSave={save}
      />
    </section>
  );
}

export function EditDayPage() {
  const { id = '' } = useParams();
  const query = useDay(id);
  const api = useDaysApi();
  const navigate = useNavigate();
  if (!query.data) return <DaysFeedback {...query} />;
  const day = query.data;
  async function save(input: DayInput, signal: AbortSignal) {
    const changes: Partial<DayInput> = {};
    if (input.date !== day.date) changes.date = input.date;
    if (input.title !== day.title) changes.title = input.title;
    if (input.description !== (day.description ?? ''))
      changes.description = input.description;
    if (Object.keys(changes).length) await api.update(id, changes, signal);
    if (!signal.aborted)
      navigate(`/gunler/${id}`, {
        replace: true,
        state: {
          message: Object.keys(changes).length
            ? 'Değişikliklerin kaydedildi.'
            : 'Değişiklik yapılmadı.',
        },
      });
  }
  return (
    <section className="days-section">
      <Link to={`/gunler/${id}`}>← Gün ayrıntısı</Link>
      <h1>Staj gününü düzenle</h1>
      <DayForm
        key={day.id}
        initial={{
          date: day.date,
          title: day.title,
          description: day.description ?? '',
        }}
        cancelTo={`/gunler/${id}`}
        submitLabel="Değişiklikleri kaydet"
        onSave={save}
      />
    </section>
  );
}
