import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { HomePage } from './HomePage';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthPage } from '../features/auth/AuthPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DaysPage } from '../features/days/DaysPage';
import { NewDayPage, EditDayPage } from '../features/days/DayEditorPage';
import { DayDetailPage } from '../features/days/DayDetailPage';

function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        İçeriğe geç
      </a>
      <header>
        <Link to="/" className="brand">
          <span aria-hidden="true" className="brand-icon">
            ▤
          </span>
          StajDefterim<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Ana menü">
          {session ? (
            <>
              <Link to="/gunler">Staj günlerim</Link>
              <button
                className="nav-button"
                onClick={() => {
                  logout('logout');
                  navigate('/giris', { replace: true });
                }}
              >
                Çıkış yap
              </button>
            </>
          ) : (
            <>
              <Link to="/giris">Giriş yap</Link>
              <Link className="primary-link" to="/kayit">
                Kayıt ol
              </Link>
            </>
          )}
        </nav>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/giris"
            element={
              session ? (
                <Navigate to="/gunler" replace />
              ) : (
                <AuthPage key="login" mode="login" />
              )
            }
          />
          <Route
            path="/kayit"
            element={
              session ? (
                <Navigate to="/gunler" replace />
              ) : (
                <AuthPage key="register" mode="register" />
              )
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/gunler" element={<DaysPage />} />
            <Route path="/gunler/yeni" element={<NewDayPage />} />
            <Route path="/gunler/:id" element={<DayDetailPage />} />
            <Route path="/gunler/:id/duzenle" element={<EditDayPage />} />
            <Route
              path="/gunler/*"
              element={
                <section className="intro">
                  <h1>Sayfa bulunamadı.</h1>
                  <Link to="/gunler">Staj günlerime dön</Link>
                </section>
              }
            />
          </Route>
          <Route
            path="*"
            element={
              <section className="intro">
                <h1>Sayfa bulunamadı.</h1>
                <Link to="/">Başlangıca dön</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        <span>StajDefterim</span>
        <span>Her gün öğrendiklerine bir sayfa ayır.</span>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
