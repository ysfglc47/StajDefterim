import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';
import { login, register } from './auth.api';
import { useAuth } from './AuthProvider';
import { validateAuth } from './auth.validation';

export function AuthPage({ mode }: { mode: 'register' | 'login' }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession, notice } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const registered = (location.state as { registered?: boolean } | null)
    ?.registered;

  useEffect(() => () => inFlight.current?.abort(), []);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const errors = validateAuth(values, mode);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      form.current
        ?.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true);
    const credentials = {
      email: values.email.trim().toLowerCase(),
      password: values.password,
    };
    try {
      if (isRegister) {
        await register(
          { ...credentials, name: values.name.trim() },
          controller.signal,
        );
        if (!controller.signal.aborted)
          navigate('/giris', { replace: true, state: { registered: true } });
      } else {
        const session = await login(credentials, controller.signal);
        if (!controller.signal.aborted) {
          startSession(session);
          navigate('/gunler', { replace: true });
        }
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(
          reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.',
        );
        if (reason instanceof ApiError) setFieldErrors(reason.fieldErrors);
      }
    } finally {
      if (!controller.signal.aborted) {
        inFlight.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">SENİN YOLCULUĞUN, SENİN DEFTERİN</span>
        <h1>
          {isRegister
            ? 'İlk sayfanı birlikte açalım.'
            : 'Defterine hoş geldin.'}
        </h1>
        <p>Öğrendiklerini bir araya getireceğin kişisel alanın burada.</p>
        <div className="auth-note">
          <strong>Oturumun hakkında</strong>
          <p>
            Oturumun 30 dakika sürer. Sayfayı yenilediğinde veya tarayıcıyı
            kapattığında yeniden giriş yapman gerekir.
          </p>
        </div>
      </div>
      <div className="auth-card">
        <h2>{isRegister ? 'Hesap oluştur' : 'Giriş yap'}</h2>
        <p className="muted">
          {isRegister
            ? 'Staj yolculuğun için küçük bir başlangıç.'
            : 'E-posta adresin ve şifrenle devam et.'}
        </p>
        {!isRegister && registered && (
          <p className="feedback success" role="status">
            Hesabın oluşturuldu. Şimdi giriş yapabilirsin.
          </p>
        )}
        {!isRegister && !registered && notice && (
          <p className="feedback" role="status">
            {notice === 'expired'
              ? 'Oturumunun süresi doldu veya oturum geçersiz. Lütfen yeniden giriş yap.'
              : 'Çıkış yaptın. Bu tarayıcıdaki oturumun temizlendi.'}
          </p>
        )}
        {error && (
          <div
            className="feedback error"
            ref={errorSummary}
            tabIndex={-1}
            role="alert"
          >
            {error}
          </div>
        )}
        <form ref={form} onSubmit={submit} noValidate aria-busy={pending}>
          {isRegister && (
            <div className="form-field">
              <label htmlFor="name">Adın</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                value={values.name}
                disabled={pending}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                onChange={(event) =>
                  setValues({ ...values, name: event.target.value })
                }
              />
              {fieldErrors.name && (
                <p className="field-error" id="name-error">
                  {fieldErrors.name.join(' ')}
                </p>
              )}
            </div>
          )}
          <div className="form-field">
            <label htmlFor="email">E-posta adresi</label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="email"
              value={values.email}
              disabled={pending}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              onChange={(event) =>
                setValues({ ...values, email: event.target.value })
              }
            />
            {fieldErrors.email && (
              <p className="field-error" id="email-error">
                {fieldErrors.email.join(' ')}
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="password">Şifre</label>
            <div className="password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={values.password}
                disabled={pending}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={`password-hint${fieldErrors.password ? ' password-error' : ''}`}
                onChange={(event) =>
                  setValues({ ...values, password: event.target.value })
                }
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
            <p className="field-hint" id="password-hint">
              8–128 karakter. Şifrende kullandığın boşluklar korunur.
            </p>
            {fieldErrors.password && (
              <p className="field-error" id="password-error">
                {fieldErrors.password.join(' ')}
              </p>
            )}
          </div>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending
              ? isRegister
                ? 'Hesap oluşturuluyor…'
                : 'Giriş yapılıyor…'
              : isRegister
                ? 'Hesap oluştur'
                : 'Giriş yap'}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Zaten bir hesabın var mı?' : 'Henüz hesabın yok mu?'}{' '}
          <Link to={isRegister ? '/giris' : '/kayit'}>
            {isRegister ? 'Giriş yap' : 'Kayıt ol'}
          </Link>
        </p>
      </div>
    </section>
  );
}
