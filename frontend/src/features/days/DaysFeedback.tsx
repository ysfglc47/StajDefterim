import { Link } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';

export function DaysFeedback({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: ApiError;
  retry: () => void;
}) {
  if (loading)
    return (
      <p className="page-status" role="status">
        Staj günlerin yükleniyor…
      </p>
    );
  const missing = error?.status === 404;
  return (
    <section className="days-placeholder">
      <h1>{missing ? 'Staj günü bulunamadı.' : 'Kayıtlar yüklenemedi.'}</h1>
      <p role="alert">
        {missing
          ? 'Bu kayıt silinmiş olabilir veya bu hesaptan erişilemiyor.'
          : error?.message}
      </p>
      <div className="day-actions">
        <Link to="/gunler">Staj günlerime dön</Link>
        {!missing && <button onClick={retry}>Tekrar dene</button>}
      </div>
    </section>
  );
}
