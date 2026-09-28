# StajDefterim — Aşama 5

SRS 1.1 temel alınarak hazırlanmış React + NestJS uygulama iskeleti.
Bu aşamada React, HTTP üzerinden NestJS API'sine ulaşır; API, Prisma ile SQLite tablolarını sorgular.
Kayıt, giriş, Argon2id parola özeti, JWT, çıkış ve korumalı sayfalar çalışır. Staj günü ve güne bağlı görev işlemleri hem API'de hem arayüzde tamamlandı. Gün ayrıntısında görev ekleyebilir, durumunu değiştirebilir, düzenleyebilir ve onay vererek silebilirsiniz.

Beşinci aşamada iki gerçek yerel hesapla sahiplik, geçersiz veri, arayüz işlemleri ve başarı/hata mesajları kontrol edildi. Her hesaba 10 örnek gün ve her güne 10 görev eklendi: toplam 20 yeni gün ve 200 örnek görev. Birinci hesabın mevcut “3.gün” kaydı korunduğu için bu hesapta toplam 11 gün vardır; ikinci hesapta 10 gün vardır. Ayrıntılı sonuçlar ve API–arayüz matrisi: [İster kontrol raporu](docs/acceptance-report.md).

## Gereksinimler

- Node.js 22.12 veya üzeri (kurulum ortamı: 22.13.1)
- npm 10 veya üzeri (kurulum ortamı: 10.9.2)
- İlk kurulumda paket indirmek için internet bağlantısı

Bağımlılık sürümleri kökteki `package-lock.json` ile sabitlenir. Komutlar proje kökünden çalıştırılır. PowerShell script yürütme kısıtlaması varsa `npm` yerine `npm.cmd` kullanın.

## İlk kurulum

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run auth:setup
npm run db:generate
npm run db:deploy
npm run dev
```

Mevcut `.env` dosyalarınız varsa kopyalama adımlarını atlayın.

Birinci aşamadan devam ediyorsanız `npm ci`, `npm run auth:setup` ve `npm run dev` yeterlidir; üretilmiş Prisma istemcisi yoksa önce `npm run db:generate` çalıştırın. İkinci aşama şemayı değiştirmez ve yeni migration gerektirmez. `auth:setup`, rastgele bir anahtarı yalnızca yerel `backend/.env` dosyasına yazar; var olan dolu anahtarı değiştirmez, anahtarı ekrana yazdırmaz.

- Ön yüz: <http://localhost:5173>
- Kayıt: <http://localhost:5173/kayit>
- Giriş: <http://localhost:5173/giris>
- API bağlantı kontrolü: <http://localhost:3000/health>
- Durdurma: terminalde `Ctrl+C`

`npm run dev` iki projeyi birlikte başlatır. Ayrı terminal tercih edilirse `npm run dev -w backend` ve `npm run dev -w frontend` kullanılabilir. Ön yüzde “Bağlantı hazır” yazısı, React → NestJS → Prisma → SQLite zincirinin başarıyla çalıştığını belirtir. API kapalıysa veya tablolar eksikse hata gösterilir; tekrar kontrol düğmesi yeni bir istek gönderir.

## Ortam ayarları

| Dosya           | Değişken          | Varsayılan              |
| --------------- | ----------------- | ----------------------- |
| `backend/.env`  | `DATABASE_URL`    | `file:./prisma/dev.db`  |
| `backend/.env`  | `PORT`            | `3000`                  |
| `backend/.env`  | `FRONTEND_ORIGIN` | `http://localhost:5173` |
| `frontend/.env` | `VITE_API_URL`    | `http://localhost:3000` |

Backend komutları workspace üzerinden `backend` klasöründe çalışır. SQLite dosyası `backend/prisma/dev.db` konumunda oluşur. CLI ve uygulama aynı URL'yi kullanır. Portları değiştirirseniz istemci URL'sini ve CORS origin ayarını da eşleştirin. `VITE_` değişkenleri tarayıcıya açıktır; gizli değer içermemelidir.

`backend/.env` içinde ayrıca `JWT_SECRET` zorunludur. Anahtar en az 32 bayt olmalıdır; eksik veya kısa olduğunda API başlamaz. `npm run auth:setup` kriptografik rastgele bir anahtar üretir. Anahtarı değiştirmek mevcut JWT'leri geçersiz kılar. Gerçek anahtarı kaynak koduna veya ön yüz ortamına eklemeyin.

## Dosya düzeni

```text
frontend/src/
  app/                 # Router, başlangıç ekranı ve stiller
  features/auth/       # Formlar, bellek içi oturum ve korumalı yol
  features/days/       # Gün listesi, ayrıntı, ortak form ve veri erişimi
  features/tasks/      # Görev formu, satırları, durumlar ve HTTP işlemleri
  shared/ui/           # Erişilebilir silme onayı
  shared/api/          # HTTP istemcisi ve ortak hata türü
backend/
  prisma/              # Veri şeması ve migration geçmişi
  prisma.config.ts     # Prisma CLI bağlantı ayarı
  src/
    auth/              # DTO, controller, service, UserRepository ve Prisma adapter
    days/              # Sahiplik kontrollü gün API'si ve repository
    tasks/             # Bağlı gün üzerinden sahiplik kontrollü görev işlemleri
    common/            # Alan doğrulaması ve ortak hata yanıtı
    health/            # Controller → Service → Repository
    prisma/            # Paylaşılan bağlantı ve yaşam döngüsü
    generated/prisma/  # Otomatik üretilen istemci (Git'e eklenmez)
  test/                # Ayrı geçici SQLite ile entegrasyon testi
e2e/                   # Playwright ile gerçek tarayıcı akışları
```

`AuthService`, `DaysService` ve `TasksService`, Prisma yerine küçük repository sözleşmelerine bağımlıdır; NestJS DI bunları Prisma adapter'larına bağlar. Controller HTTP işlemini, servis iş kurallarını, repository kalıcılığı ve kullanıcıya göre sınırlandırılmış sorguları yönetir. Gün/görev başlık ve açıklama kuralları ortak doğrulama yardımcılarını kullanır.

## Veri modeli ve kararlar

- `User → InternshipDay → Task`: zorunlu dış anahtarlar; kullanıcı e-postası benzersiz.
- Kimlikler Prisma tarafından üretilen CUID metinleridir.
- Gün tarihi saat diliminden etkilenmemesi için `YYYY-MM-DD` metni olarak tutulur. Gerçek takvim tarihi (artık yıl dahil) ve alan uzunlukları sunucuda ve istemcide doğrulanır; arayüzde `GG.AA.YYYY` gösterilir.
- Aynı kullanıcı için aynı tarihte birden fazla gün mümkündür. `(userId, date)` bir arama indeksidir, benzersizlik kısıtı değildir.
- Görev başlangıç durumu `TODO`; diğer durumlar `IN_PROGRESS` ve `DONE`.
- Gün silme, SQLite dış anahtarındaki `ON DELETE CASCADE` ile görevleri aynı işlemde siler. Kullanıcı silme işlevi bu aşamada yoktur; günleri olan kullanıcının silinmesi kısıtlanır.
- Prisma 7, `@prisma/adapter-better-sqlite3` üzerinden bağlanır. NestJS için üretilen istemci CommonJS biçimindedir. Tek Prisma servisi açılışta bağlanır, kapanışta bağlantıyı kapatır.
- SQLite dosyaları, ortam dosyaları ve üretilmiş kod Git dışında tutulur. Gösterim için ayrı bir SQLite dosyası kullanın; testler her çalışmada ayrı geçici veritabanı oluşturur.

Şemayı değiştirdikten sonra:

```powershell
npm run db:migrate -- --name degisiklik_adi
npm run db:generate
```

Mevcut migration'ları uygulamak için `npm run db:deploy`, veritabanını incelemek için `npm run db:studio` kullanılır. Migration SQL dosyaları sürüm kontrolüne alınmalıdır.

Migration komutları `backend/scripts/prisma-migrate.cjs` üzerinden çalışır. Bu yardımcı, Windows'ta Prisma'nın henüz oluşmamış SQLite dosyasında verdiği başlangıç hatasını önlemek için önce klasörü ve boş dosyayı hazırlar. Var olan dosyayı sıfırlamaz; tabloları yalnızca Prisma migration'ları oluşturur.

## Bu aşamadaki API

`GET /health`, kullanıcı verisi döndürmeyen, kimlik doğrulamasız altyapı kontrolüdür. Üç tabloya gerçek sorgu yapar; eksik migration da başarısız sonuç verir. İşlem sayısı, kullanıcı bilgisi veya veritabanı yolu açıklanmaz.

Başarılı yanıt — **200**:

```json
{ "status": "ok", "database": "connected" }
```

Veritabanına erişilemiyorsa — **503**:

```json
{
  "code": "DATABASE_UNAVAILABLE",
  "message": "Veritabanı bağlantısı hazır değil."
}
```

Bağlantı kontrolü SRS'deki iş uçlarına ek bir geliştirme kontrolüdür.

### Kullanıcı API'si

| Yöntem / yol          | Başarı                                           | Erişim                          |
| --------------------- | ------------------------------------------------ | ------------------------------- |
| `POST /auth/register` | 201, güvenli kullanıcı alanları                  | Herkese açık                    |
| `POST /auth/login`    | 200, JWT ve güvenli kullanıcı alanları           | Herkese açık                    |
| `GET /auth/me`        | 200, oturum sahibinin güvenli kullanıcı alanları | `Authorization: Bearer <token>` |

Kayıt örneği (yalnızca örnek bilgiler):

```json
{
  "name": "Örnek Öğrenci",
  "email": "ogrenci@example.com",
  "password": "Ornek-sifre-2026"
}
```

Kayıt yanıtı:

```json
{
  "id": "cuid-kimlik",
  "name": "Örnek Öğrenci",
  "email": "ogrenci@example.com",
  "createdAt": "2026-09-25T12:00:00.000Z"
}
```

Giriş, yalnızca `email` ve `password` alanlarını kabul eder. Yanıtta `accessToken` (JWT), `tokenType` (`Bearer`), `expiresAt` (Unix zamanı, milisaniye) ve `user` (kayıt yanıtındaki güvenli alanlar) bulunur. `/auth/me` aynı güvenli kullanıcı alanlarını döndürür. `passwordHash` hiçbir API yanıtına eklenmez; kimlik yanıtlarında `Cache-Control: no-store` kullanılır.

Hata örneği — **400**:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Lütfen işaretli alanları kontrol edin.",
  "fieldErrors": { "name": ["Ad 2–80 karakter arasında olmalıdır."] }
}
```

- **400:** geçersiz alanlar veya kabul edilmeyen ek alanlar (`userId` gibi). `fieldErrors` alan bazlı mesajları içerir.
- **401 / INVALID_CREDENTIALS:** yanlış e-posta ve yanlış şifre için aynı “E-posta veya şifre hatalı.” mesajı.
- **401 / UNAUTHORIZED:** token eksik, bozuk, imzası geçersiz, süresi dolmuş veya kullanıcı artık mevcut değil.
- **409 / EMAIL_TAKEN:** e-posta daha önce kayıtlı. Eşzamanlı kayıtlar da veritabanının benzersizlik kısıtıyla korunur.
- **500 / INTERNAL_ERROR:** teknik ayrıntı içermeyen genel hata.

### Parola ve oturum kararları

- Ad kırpılarak 2–80 karakter, e-posta kırpılıp küçük harfe çevrilerek geçerli biçimde en fazla 254 karakter kabul edilir. Parola 8–128 karakterdir; baştaki/sondaki boşluklar korunur ve sessiz kesme yapılmaz.
- Parolalar `@node-rs/argon2` ile Argon2id olarak, rastgele tuzla saklanır: 19 MiB bellek, 2 iterasyon, 1 paralellik. Bu değerler [OWASP parola saklama rehberindeki](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) asgari Argon2id ayarını karşılar. Windows'ta ek SDK gerektirmeyen hazır ikilisi kullanılır.
- JWT 30 dakika geçerlidir. HS256 algoritması, imza, issuer, audience, süre sonu ve kullanıcının hâlâ mevcut olması her korumalı istekte kontrol edilir.
- Global guard nedeniyle yeni API controller'ları varsayılan olarak korumalıdır. Kayıt, giriş ve sağlık kontrolü açıkça `Public` olarak işaretlenir.
- JWT ve kullanıcı bilgisi yalnızca React belleğindedir; localStorage, sessionStorage ve cookie kullanılmaz. Sayfa yenileme, sekmeyi kapatma veya çıkış oturumu temizler.
- `/gunler` ve alt yolları oturum gerektirir. Sayfaya girişte `/auth/me` ile sunucu doğrulaması yapılır. Eksik oturum girişe yönlendirilir; ağ hatasında korumalı içerik açılmadan yeniden deneme sunulur. Korumalı HTTP isteğinde 401 veya 30 dakikalık sürenin dolması oturumu temizler.
- Kayıt sonrası kullanıcı başarı mesajıyla giriş sayfasına, başarılı giriş sonrası kendi günlerini listeleyen `/gunler` sayfasına yönlendirilir.
- Çıkış sunucuda iptal listesi oluşturmaz. Kopyalanmış token süre sonuna kadar çalışabilir; refresh token ve kalıcı oturum bu aşamanın dışında tutulur.

## Staj günü API'si ve ekranları

Tüm gün uçları `Authorization: Bearer <token>` gerektirir. Sahip kullanıcı yalnızca doğrulanmış oturumdan alınır; istemci `userId` atayamaz.

| Yöntem / yol       | Başarı                                           | Arayüz                         |
| ------------------ | ------------------------------------------------ | ------------------------------ |
| `GET /days`        | 200, yalnızca kullanıcının günleri; tarih azalan | `/gunler`                      |
| `POST /days`       | 201, yeni gün                                    | `/gunler/yeni`                 |
| `GET /days/:id`    | 200, gün ve yalnızca bağlı görevleri             | `/gunler/:id`                  |
| `PATCH /days/:id`  | 200, güncellenmiş gün                            | `/gunler/:id/duzenle`          |
| `DELETE /days/:id` | 204, boş gövde                                   | Ayrıntı sayfasında silme onayı |

Oluşturma örneği:

```json
{
  "date": "2026-09-25",
  "title": "API bağlantısını hazırladım",
  "description": "Öğrendiklerim ve yaptığım çalışmalar."
}
```

Gün yanıtı `id`, `date`, `title`, `description`, `createdAt`, `updatedAt` alanlarını taşır. Ayrıntıda bunlara `tasks` dizisi eklenir; görevlerde `id`, `title`, `description`, `status`, `createdAt`, `updatedAt` bulunur. Görev durumları arayüzde Türkçe metinle gösterilir. Boş liste `[]`, görevsiz gün `tasks: []` döndürür.

- Tarih tam `YYYY-MM-DD` olmalıdır; `2026-02-29` gibi takvimde bulunmayan günler reddedilir. 0001–9999 yılları, gelecek tarih ve aynı tarihte birden fazla kayıt kabul edilir.
- Başlık kırpıldıktan sonra 1–120 karakterdir. Açıklama isteğe bağlıdır ve en fazla 2000 karakterdir. Açıklamayı temizlemek için `"description": ""` gönderilir; `null` kabul edilmez.
- `PATCH`, yalnızca gönderilen alanları değiştirir. Örneğin `{ "title": "Yeni başlık" }`, tarihi ve açıklamayı korur. Boş gövde `400 / EMPTY_UPDATE`, bilinmeyen alanlar ve geçersiz değerler `400 / VALIDATION_ERROR` döndürür.
- Olmayan ve başka hesaba ait kayıtlar aynı `404 / DAY_NOT_FOUND` yanıtını verir. Okuma, güncelleme ve silme sorguları `id` ile birlikte oturumun `userId` değerini taşır.
- Silme diyaloğu bağlı tüm görevlerin de kaldırılacağını açıklar. Vazgeç/Escape veri değiştirmez; odak silme düğmesine geri döner. Onay sonrası veritabanındaki cascade silme tek işlemde gerçekleşir; hata halinde kısmi silme olmaz.
- Formlar ağ/sunucu hatasında girdileri korur. İstek sırasında tekrar gönderim engellenir; hata sonrasında yeniden denenebilir. Liste ve ayrıntıda yüklenme, boş kayıt, hata ve bulunamadı durumları vardır.

## Görev API'si ve kullanımı

Görevler `/gunler/:id` ekranında yönetilir. “Görev ekle” formu başlık ve isteğe bağlı açıklama alır. Görev satırındaki durum seçimi doğrudan kaydeder; “Görevi düzenle” formu başlık, açıklama ve durumu birlikte değiştirebilir. “Görevi sil” önce onay ister. Arayüz, başarı yanıtı gelmeden kaydı değiştirilmiş gibi göstermez.

| Yöntem / yol              | İstek                                                   | Başarı                 |
| ------------------------- | ------------------------------------------------------- | ---------------------- |
| `POST /days/:dayId/tasks` | `title`, isteğe bağlı `description`                     | 201, oluşturulan görev |
| `PATCH /tasks/:id`        | `title`, `description`, `status` alanlarının en az biri | 200, güncellenen görev |
| `DELETE /tasks/:id`       | Gövde yok                                               | 204, boş gövde         |

Tüm uçlar JWT gerektirir. Görevler `GET /days/:id` yanıtındaki `tasks` dizisiyle okunur; ayrı görev listeleme ucu yoktur. Görev yanıtları `id`, `title`, `description`, `status`, `createdAt`, `updatedAt` alanlarını içerir.

Oluşturma örneği:

```json
{
  "title": "API testlerini yaz",
  "description": "Başarılı ve hatalı istekleri kontrol et."
}
```

Durum değiştirme örneği:

```json
{ "status": "IN_PROGRESS" }
```

- Yeni görev her zaman `TODO` (Yapılacak) durumunda başlar. Oluşturma isteğinde `status` kabul edilmez.
- `TODO`, `IN_PROGRESS` (Devam Ediyor) ve `DONE` (Tamamlandı) arasında her yönde geçiş mümkündür. Durumlar metin ve renk birlikte kullanılarak gösterilir.
- Başlık kırpıldıktan sonra 1–120 karakterdir; açıklama isteğe bağlı ve en fazla 2000 karakterdir. Boş açıklama `""` ile temizlenir; `null` kabul edilmez.
- `PATCH` yalnızca gönderilen alanları değiştirir. `dayId`, `userId`, `id` ve diğer bilinmeyen alanlar reddedilir; görev bu işlemle başka güne taşınamaz. Boş güncelleme `400 / EMPTY_UPDATE`, geçersiz alan/durum `400 / VALIDATION_ERROR` döndürür.
- Oluşturmada bağlı gün `id + userId` ile, güncelleme/silmede görev `id + day.userId` ile sınırlandırılır. Başka hesaba ait ve olmayan günler aynı `404 / DAY_NOT_FOUND`, görevler aynı `404 / TASK_NOT_FOUND` yanıtını verir.
- Tek görev silme, staj gününü ve kardeş görevleri korur. Gün silme bütün bağlı görevleri aynı veritabanı işlemi içinde siler; hata durumunda işlem geri alınır.
- Ağ hatasında form girdileri korunur, durum seçimi son kaydedilmiş değerde kalır ve silme onayı yeniden denenebilir. İstek sürerken ilgili düğmeler devre dışıdır.

## Doğrulama

Görev testleri ek olarak iki hesaplı erişim ayrımını, üç durum arasındaki tüm geçişleri, kısmi güncellemeyi, görev taşımanın engellenmesini, tek görev silindiğinde diğer kayıtların korunmasını ve API'den oluşturulmuş görevlerle atomik gün silmeyi kapsar. Tarayıcı testlerinde görev oluşturma/düzenleme/durum/silme akışları, kayıt kalıcılığı, iptal/Escape, alan doğrulaması, ağ hatası sonrası tekrar deneme, yinelenen gönderim engeli, klavye kullanımı ve hedef ekran genişlikleri sınanır.

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run build
npm test
npm run test:e2e
```

Test, derlenmiş backend'i kullandığından önce `npm run build` çalıştırılmalıdır. Temiz veritabanına migration, e-posta benzersizliği, dış anahtar, aynı tarihli günler, varsayılan görev durumu, yeniden bağlantı sonrası kalıcılık, bağlı görev silme ve HTTP kontrolünün 200/503 davranışları sınanır. Test verileri gerçek kişisel veri içermez ve geliştirme veritabanına yazılmaz.

İkinci aşama API testleri ayrıca alan normalleştirme, parola özeti ve tuz, 8/128 karakter sınırları, geçersiz alanlar, eşzamanlı kayıt, ortak giriş hatası, JWT'nin 30 dakikalık süresi, algoritma/audience kontrolleri ve silinmiş kullanıcı erişimini kapsar.

Playwright testleri kurulu Microsoft Edge'i kullanır. `3100` ve `5174` portları boş olmalıdır. Test komutu kendi API/ön yüz süreçlerini, rastgele test anahtarını ve ayrı geçici SQLite dosyasını oluşturur; `dev.db` ve yerel JWT anahtarına dokunmaz. Edge olmayan sistemlerde `playwright.config.ts` içindeki `channel` ayarını kurulu tarayıcıya göre değiştirebilirsiniz. Başarısız test ekran görüntüleri `test-results` altında tutulur; bu klasör Git dışında bırakılmıştır.

Tarayıcı kontrolü: `npm run dev` sonrası başlangıç sayfasını açın, bağlantı durumunu doğrulayın. API'yi ayrı terminalden durdurup tekrar kontrol düğmesine basarak hata durumunu deneyin. Sayfayı 375, 768 ve 1440 pikselde ve klavyeyle kontrol edin.

Üretim derlemesi için `npm run build`, derlenmiş API için `npm run start -w backend`, ön yüzü yerel önizlemek için `npm run preview -w frontend` kullanılır. Önizleme portu için CORS origin eşleştirilmelidir. Bu kurulum yerel geliştirme içindir; yayımlama yapılmadı.

## Sonraki aşamalar

1. **Tamamlanan kapsam:** React/NestJS iskeleti, HTTP kontrolü, Prisma/SQLite şeması ve migration, strict TypeScript, lint/format ayarları.
2. **Tamamlanan kullanıcı sistemi:** kayıt, parola özeti, giriş, JWT, çıkış ve korumalı yollar.
3. **Tamamlanan staj günleri:** sahiplik kontrollü oluşturma, listeleme, ayrıntı, güncelleme ve silme.
4. **Tamamlanan görevler:** güne bağlı görev ekleme, düzenleme, durum değiştirme ve silme.
5. **İster kontrolü yapıldı:** iki hesap, geçersiz istekler, arayüz işlemleri ve bildirimler. Figma karşılaştırması ve yayın hazırlığı ayrıca ele alınacaktır.

SRS'nin tüm FR/NFR maddeleri henüz tamamlanmadı; Figma karşılaştırması teslim aşamasında yapılacak.

## Dördüncü aşama kontrol kaydı — 25 Eylül 2026

- Toplam 26 API/veritabanı testi ve 16 Edge tarayıcı testi geçti; kullanıcı ve gün testleri de tekrar çalıştırıldı.
- Yetkisiz erişim, bütün durum geçişleri, geçersiz alan/durum, görev taşıma girişimi, tek görev silme ve günle bağlı silme/geri alma doğrulandı.
- Görev formları ve uzun içerikler 375/768/1440 pikselde kontrol edildi; klavyeyle görev ekleme, silmeden vazgeçme ve ağ hatasında tekrar deneme başarılı.
- Yeni paket veya migration gerekmedi. Şema ve geliştirme verileri korundu; testler ayrı geçici SQLite dosyaları kullandı.

## Üçüncü aşama kontrol kaydı — 25 Eylül 2026

- Toplam 18 API/veritabanı testi ve 12 Edge tarayıcı testi geçti; önceki kullanıcı sistemi testleri de çalıştırıldı.
- Gün oluşturma, tarih sıralaması, ayrıntı, kısmi güncelleme, silme, geçersiz alanlar, iki hesapla erişim ayrımı ve bağlı görev silme doğrulandı. Silme sırasında yapay veritabanı hatasıyla gün ve görevlerin geri alındığı da sınandı.
- Tarayıcıda hata sonrası girdilerin korunması, tekrar deneme, mükerrer gönderim engeli, onay diyaloğunda Escape/odak dönüşü, yenileme ve yeniden giriş sonrası kalıcılık, uzun içerikle 375/768/1440 piksel görünüm doğrulandı.
- Şema değişmedi; yeni migration gerekmedi. Testler ayrı geçici veritabanlarında çalıştı ve mevcut geliştirme kayıtlarına dokunmadı.

## İkinci aşama kontrol kaydı — 25 Eylül 2026

- API/veritabanı testleri: 10 test geçti (Node test raporundaki toplam).
- Edge üzerinde 8 uçtan uca test geçti: kayıt/giriş/çıkış, yenilemede oturumun silinmesi, doğrudan korumalı URL, mükerrer kayıt ve alan hataları, yanlış parola/ağ kesintisi sonrası tekrar deneme, oturum süresi ve 401, profil kontrolü hatasında tekrar deneme, yinelenen gönderim engeli, 375/768/1440 pikselde taşma kontrolü ve klavyeyle giriş.
- Testler geliştirme veritabanında hesap oluşturmadı. Mevcut kayıtlara migration veya veri değişikliği yapılmadı.

## İlk aşama kontrol kaydı — 25 Eylül 2026

- TypeScript strict kontrolü, ESLint, Prettier ve her iki uygulamanın üretim derlemesi geçti.
- Ayrı, boş SQLite veritabanında migration ve veri bütünlüğü entegrasyon testi geçti; HTTP 200 ve 503 yanıtları doğrulandı.
- Headless Edge ile `http://localhost:5173` açıldı; React'in gerçek API isteği sonrasında ekranda “Bağlantı hazır” gösterildi.
- Figma karşılaştırması ve kapsamlı ekran genişliği/klavye testleri henüz yapılmadı.
- `npm audit`, Prisma CLI'nin `deepmerge-ts` ve `mysql2` bağımlılık zincirlerinde toplam 4 yüksek seviyeli bulgu raporladı. Bu kurulum SQLite kullanır; bulgular burada MySQL bağlantısı kullanıldığı anlamına gelmez. Önerilen otomatik düzeltme Prisma ana sürümünü geriye aldığı için uygulanmadı. Paket güncellemesi öncesinde uyumluluk kontrol edilmelidir.

Teknik başvuru: [NestJS kurulumu](https://docs.nestjs.com/first-steps), [Vite kurulumu](https://vite.dev/guide/).
