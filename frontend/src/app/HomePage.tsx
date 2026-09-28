import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth } from '../shared/api/health';

type Connection = 'loading' | 'ready' | 'error';

export function HomePage() {
  const [connection, setConnection] = useState<Connection>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let active = true;
    void checkHealth(controller.signal)
      .then(() => {
        if (active) setConnection('ready');
      })
      .catch(() => {
        if (active) setConnection('error');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <>
      <section className="intro">
        <span className="eyebrow">HER GÜN BİR ADIM İLERİ</span>
        <h1>
          Staj yolculuğun,
          <br />
          <span>senin defterin.</span>
        </h1>
        <p>
          Öğrendiklerini kaydet, görevlerini takip et ve staj deneyimini gün gün
          bir araya getir.
        </p>
      </section>
      <section className="workspace" aria-labelledby="welcome-title">
        <div className="welcome">
          <span className="book-mark" aria-hidden="true">
            SD
          </span>
          <span className="eyebrow">STAJDEFTERİM’E HOŞ GELDİN</span>
          <h2 id="welcome-title">
            Yeni bir başlangıç için
            <br />
            her şey adım adım.
          </h2>
          <p>
            Staj günlerini kaydet, öğrendiklerini not al ve geçmiş çalışmalarına
            kolayca geri dön. Kişisel defterinin sayfaları seni bekliyor.
          </p>
          <p>
            <Link className="primary-link" to="/kayit">
              Hesabını oluştur
            </Link>{' '}
            <Link to="/giris">Giriş yap</Link>
          </p>
          <span className="stage-badge">Aşama 5 · İster kontrolü</span>
        </div>
        <div className="connection-panel">
          <h2>Bağlantı durumu</h2>
          <p className="muted">Uygulama altyapısının canlı kontrolü.</p>
          <div
            className={`connection-status ${connection}`}
            role="status"
            aria-live="polite"
          >
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>
                {connection === 'ready'
                  ? 'Bağlantı hazır'
                  : connection === 'error'
                    ? 'Bağlantı kurulamadı'
                    : 'Bağlantı kontrol ediliyor…'}
              </strong>
              <p>
                {connection === 'ready'
                  ? 'Sunucuya ulaşıldı ve veritabanı doğrulandı.'
                  : connection === 'error'
                    ? 'Sunucuya veya veritabanına ulaşılamıyor. Biraz sonra tekrar deneyebilirsin.'
                    : 'Sunucu ve veritabanından yanıt bekleniyor.'}
              </p>
            </div>
          </div>
          <dl className="connection-details">
            <div>
              <dt>Ön yüz</dt>
              <dd>React</dd>
            </div>
            <div>
              <dt>Sunucu</dt>
              <dd>NestJS</dd>
            </div>
            <div>
              <dt>Veritabanı</dt>
              <dd>SQLite + Prisma</dd>
            </div>
          </dl>
          <button
            disabled={connection === 'loading'}
            onClick={() => {
              setConnection('loading');
              setAttempt((value) => value + 1);
            }}
          >
            {connection === 'loading'
              ? 'Kontrol ediliyor…'
              : 'Bağlantıyı tekrar kontrol et'}
          </button>
        </div>
      </section>
      <section className="roadmap" aria-labelledby="roadmap-title">
        <div className="section-heading">
          <h2 id="roadmap-title">Birlikte, adım adım</h2>
          <span>Geliştirme yol haritası</span>
        </div>
        <ol>
          {[
            ['Temel yapı', 'Uygulama ve veritabanı', 'Tamamlandı'],
            [
              'Kullanıcı hesabı',
              'Kayıt, giriş ve güvenli oturum',
              'Tamamlandı',
            ],
            ['Staj günleri', 'Günlük kayıt ve düzenleme', 'Tamamlandı'],
            ['Görev takibi', 'Güne bağlı görevler', 'Tamamlandı'],
            [
              'İster kontrolü',
              'İki hesap ve uçtan uca testler',
              'Kontrol edildi',
            ],
          ].map(([title, description, state], index) => (
            <li key={title} className={index === 4 ? 'current' : ''}>
              <span className="step-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="step-state">{state}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
