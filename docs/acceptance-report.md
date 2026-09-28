# Beşinci aşama — İster kontrol raporu

Tarih: 25 Eylül 2026. Yerel React/NestJS uygulaması ve SQLite veritabanı üzerinde kontrol edildi. Parolalar, JWT'ler ve JWT anahtarı bu rapora eklenmedi.

## İki hesap için hazırlanan örnekler

| Kullanıcının verdiği hesap | Alan                 | Yeni örnek gün | Gün başına görev | Yeni örnek görev | Son toplam gün |
| -------------------------- | -------------------- | -------------- | ---------------- | ---------------- | -------------- |
| Birinci hesap              | Yazılım mühendisliği | 10             | 10               | 100              | 11             |
| İkinci hesap               | Diş hekimliği        | 10             | 10               | 100              | 10             |

Birinci hesabın önceden var olan **“3.gün”** kaydı korunmuştur. Bu yüzden hesapta 10 yeni örnek güne ek olarak 1 mevcut gün vardır. Hesap parolaları değiştirilmedi; ikinci hesap verilen bilgilerle kayıt ekranından oluşturuldu.

Örnekler 14–25 Eylül 2026 arasındaki 10 iş gününe dağıtıldı. Yazılım örnekleri geliştirme ortamı, gereksinimler, Git, React/TypeScript, NestJS, Prisma/SQLite, kimlik doğrulama, test, kod kalitesi ve teslim hazırlığını içerir. Diş hekimliği örnekleri oryantasyon, enfeksiyon kontrolü, anamnez, radyoloji, restoratif diş hekimliği, endodonti, periodontoloji, protetik diş tedavisi, pedodonti/ortodonti ve staj değerlendirmesini içerir. Diş hekimliği içerikleri kurgusal, gözetmen eşliğinde eğitim/gözlem görevleridir; gerçek hasta verisi veya tedavi talimatı içermez.

İki hesaba da tarayıcıdan giriş yapıldı. **20 örnek gün ve 200 görev arayüzden oluşturuldu**; durum değişiklikleri de arayüzden kaydedildi. Son kontrolde her örnek günün 10 görevi bulunduğu API üzerinden tekrar sayıldı. Ayrıntılı, kimlik bilgisi içermeyen çalışma kaydı: [demo-verification.json](demo-verification.json). Örnek metinler: [demo-data.json](demo-data.json).

## Bu iki hesapla canlı kabul kontrolleri

- Her iki hesapta geçici kontrol günleri/görevleriyle gün oluşturma, listeleme, ayrıntı, düzenleme, görev oluşturma/düzenleme/durum değiştirme/silme ve gün silme arayüzden tamamlandı.
- Başarı mesajları görünür olarak doğrulandı: gün oluşturuldu, değişiklikler kaydedildi, görev eklendi/güncellendi/silindi ve gün ile görevler silindi.
- Boş görev başlığı için alan hatası gösterildi. Ağ hatası tarayıcıda canlandırıldı; kaydedilmiş görev durumu değişmedi, hata gösterildi ve yeniden deneme başarılı oldu.
- Görev silme onayındaki **Vazgeç**, gün silme onayındaki **Escape** kayıtları korudu. Onaylı silme doğru kayıtları kaldırdı. Çıkış sonrası giriş sayfasına yönlendirme ve çıkış mesajı doğrulandı.
- Sahiplik her iki yönde denendi: yabancı günü okuma, düzenleme, silme, yabancı güne görev ekleme ve yabancı görevi düzenleme/silme. **12 istek 404** ile reddedildi.
- Her iki hesapla geçersiz takvim tarihi, boş/uzun başlık, uzun açıklama, boş PATCH, sahte `userId`, oluşturma sırasında `status`, geçersiz görev durumu ve görev taşıma amacıyla `dayId` gönderildi. **20 istek 400** ile reddedildi.
- Toplam **32 reddedilen isteğin** ardından kontrol kayıtları önceki halleriyle karşılaştırıldı; yetkisiz/geçersiz istekler veri değiştirmedi. Kullanıcı listelerinde diğer hesabın kayıtları görünmedi.
- Bu kontrollerin geçici kayıtları kaldırıldı. Önceden bulunan kullanıcı kayıtlarına veya 200 örnek göreve test amaçlı silme uygulanmadı.

## API–arayüz eşleşmesi

| Gereksinim    | API / davranış                                   | Arayüz karşılığı                                 | Sonuç |
| ------------- | ------------------------------------------------ | ------------------------------------------------ | ----- |
| FR-01         | `POST /auth/register`                            | `/kayit`                                         | Geçti |
| FR-02         | `POST /auth/login`                               | `/giris`                                         | Geçti |
| FR-03, FR-15  | JWT kontrolü, `GET /auth/me`, yerel çıkış        | Korumalı yollar, çıkış düğmesi                   | Geçti |
| FR-04         | `GET /days`                                      | Staj günlerim, boş liste                         | Geçti |
| FR-05         | `POST /days`                                     | Yeni Gün Ekle                                    | Geçti |
| FR-06         | `GET /days/:id`                                  | Gün ayrıntısı ve bağlı görevler                  | Geçti |
| FR-07         | `PATCH /days/:id`                                | Gün düzenleme formu                              | Geçti |
| FR-08         | `DELETE /days/:id`                               | Günü sil ve onay diyaloğu                        | Geçti |
| FR-09         | `POST /days/:dayId/tasks`                        | Görev ekleme formu                               | Geçti |
| FR-10         | `PATCH /tasks/:id`                               | Görev düzenleme ve durum seçimi                  | Geçti |
| FR-11         | `DELETE /tasks/:id`                              | Görevi sil ve onay diyaloğu                      | Geçti |
| FR-12, NFR-08 | Yüklenme, başarı/hata, yinelenen gönderim engeli | Formlar, düğmeler, durum ve hata mesajları       | Geçti |
| FR-13, NFR-02 | İki hesapla sahiplik                             | Ayrı listeler, yabancı kayıtta bulunamadı ekranı | Geçti |
| FR-14, NFR-03 | Sunucu ve istemci doğrulaması                    | Alan hataları ve girdilerin korunması            | Geçti |
| FR-16         | Bütün temel API işlemlerinin erişilebilir olması | Yukarıdaki ekran ve eylemler                     | Geçti |

## Otomatik kontroller ve kanıtlar

Son çalıştırmada **26 API/veritabanı testi ve 18 tarayıcı testi geçti**. Üretim derlemesi, TypeScript strict, ESLint ve Prettier kontrolleri de başarılı. Bildirim seçicisi düzeltildikten sonraki tam tarayıcı koşusunda başarısız test kalmadı.

- `npm test`: **26 API/veritabanı testi**. Kayıt/giriş, parola özeti, JWT, tarih/uzunluk/durum sınırları, bilinmeyen alanlar, iki hesapla sahiplik, kısmi güncelleme, kayıt kalıcılığı, tek görev silme ve atomik bağlı silme/geri alma.
- `npm run test:e2e`: **18 Edge tarayıcı testi**. Temel kullanıcı/gün/görev akışları, doğrudan korumalı URL, yenileme/çıkış/süre dolması, hata sonrası tekrar deneme, iptal, mükerrer gönderim, klavye kullanımı ve 375/768/1440 piksel taşma kontrolleri.
- Bu aşamada eklenen [acceptance.spec.ts](../e2e/acceptance.spec.ts), gerçek API'ye değiştirilmiş geçersiz istek göndererek **400 alan hatasını**, bearer başlığını kaldırarak **401 sonrası oturum temizlenmesini**, kontrollü tarayıcı yanıtıyla **500 hata mesajı ve girdilerin korunmasını** sınar. 500 arayüz senaryosu simülasyondur; SQLite hatası ve geri alma gerçek veritabanıyla ayrı API testlerinde sınanır.
- Canlı hesap kontrolleri [demo-acceptance.cjs](../scripts/demo-acceptance.cjs) ile yürütüldü. Betik hesap bilgilerini standart girdiden okur; düz parolayı dosyaya yazmaz. Aynı örnek gün/görevleri yeniden oluşturmaz; eşleşen mevcut kayıtları korur.
- İlk otomatik çalıştırmada gün silme testi, aynı anda görünen başarı ve yüklenme bildirimlerini tek öğe sanan bir seçici nedeniyle başarısız oldu. Seçici beklenen silme başarı mesajıyla sınırlandırıldı; uygulama davranışını değiştirmek gerekmedi.
- Otomatik testlerin geçici veritabanları geliştirme veritabanından ayrıdır. Kullanıcının istediği 200 örnek görev ise bilinçli olarak yerel `backend/prisma/dev.db` içinde kalıcı oluşturuldu.

## Kapsam sınırı

Bu rapor, istenen işlevsel kabul kontrollerini ve örnek verilerin hazırlanmasını kapsar. Figma dosyası/prototipiyle görsel karşılaştırma yapılmadı. Tam erişilebilirlik denetimi veya üretim ortamına yayın bu çalışmanın çıktısı değildir. Önceki README'de kayıtlı bağımlılık denetimi bulguları ayrı izlenmektedir; test başarısı tüm güvenlik incelemelerinin tamamlandığı anlamına gelmez.
