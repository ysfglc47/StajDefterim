import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { User } from './auth.api';

export function ProtectedRoute() {
  const { session, request } = useAuth();
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const token = session?.accessToken;

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void request<User>('/auth/me', { signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) setVerifiedToken(token);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Oturum kontrol edilemedi.',
          );
      });
    return () => controller.abort();
  }, [token, request, attempt]);

  if (!session) return <Navigate to="/giris" replace />;
  if (verifiedToken === token) return <Outlet />;
  if (error)
    return (
      <section className="auth-card">
        <h1>Bağlantı kurulamadı</h1>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            setError('');
            setAttempt((value) => value + 1);
          }}
        >
          Tekrar dene
        </button>
      </section>
    );
  return (
    <p className="page-status" role="status">
      Oturumun doğrulanıyor…
    </p>
  );
}
