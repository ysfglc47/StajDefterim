import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { formatDayDate, useDaysList } from './days.api';
import { DaysFeedback } from './DaysFeedback';

export function DaysPage() {
  const { session } = useAuth();
  const query = useDaysList();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;
  return (
    <section className="days-section">
      <span className="eyebrow">KİŞİSEL STAJ DEFTERİN</span>
      <div className="day-heading">
        <div>
          <h1>Merhaba, {session?.user.name}.</h1>
          <p className="muted">Staj günlerin, en yeniden en eskiye.</p>
        </div>
        <Link className="primary-link" to="/gunler/yeni">
          Yeni Gün Ekle
        </Link>
      </div>
      {message && (
        <p className="feedback success" role="status">
          {message}
        </p>
      )}
      {query.loading || query.error ? (
        <DaysFeedback {...query} />
      ) : query.data?.length ? (
        <ul className="day-list">
          {query.data.map((day) => (
            <li key={day.id}>
              <Link className="day-card" to={`/gunler/${day.id}`}>
                <time dateTime={day.date}>{formatDayDate(day.date)}</time>
                <h2>{day.title}</h2>
                <p>{day.description || 'Henüz açıklama eklenmemiş.'}</p>
                <span className="card-action">Günü görüntüle →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="days-placeholder">
          <h2>Defterinin ilk sayfası seni bekliyor.</h2>
          <p>
            Henüz staj günü eklemedin. İlk gününü kaydederek başlayabilirsin.
          </p>
          <Link className="primary-link" to="/gunler/yeni">
            Yeni Gün Ekle
          </Link>
        </div>
      )}
      <p className="session-note muted">
        Çıkış bu tarayıcıdaki oturumu temizler. Kopyalanmış erişim anahtarları
        süreleri dolana kadar geçerli kalabilir.
      </p>
    </section>
  );
}
