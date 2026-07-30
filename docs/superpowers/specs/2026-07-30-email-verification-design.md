# E-posta Doğrulama — Tasarım Spesifikasyonu

**Tarih:** 2026-07-30
**Durum:** Kullanıcı onaylı tasarım
**Repo:** lesstoken-landing (Next.js frontend + Flask backend `web/`, Railway → api.lesstoken.app)

## Amaç

Hesaplı panelde (`/app`) ücretsiz kayıt açmak çok kolay — kötüye kullanım
riski var (bkz. `web/app.py`'daki `DAILY_OPTIMIZE_LIMIT` zaten bu riski
azaltmak için eklenmişti). Kayıt sırasında e-posta doğrulaması, sahte/atma
hesapların önüne geçen ek bir katman.

Bu özellik, contact formunun az önce SMTP'den Resend HTTP API'sine taşınmasına
dayanıyor (Railway outbound SMTP portlarını engelliyor — bkz. commit
`daeb8eb`) — aynı gönderim yolu doğrulama e-postaları için de kullanılacak.

## Temel kararlar (kullanıcı onaylı)

1. **Doğrulama yöntemi: tek tıkla link**, kod girme yok.
2. **Doğrulanmamış hesap hiçbir şey yapamaz** — kayıt sonrası JWT verilmez,
   login da `403 email_not_verified` döner. `/optimize` gibi route'larda
   ayrıca kontrol gerekmez çünkü token zaten hiç verilmiyor.
3. **Link 24 saat geçerli.**
4. **Migration: Flask-Migrate/Alembic şimdi kurulacak.** Proje şu ana kadar
   migration aracı kullanmıyordu (`db.create_all()` var olan tabloları
   değiştirmiyor). Bu, hem bu özellik hem de ayrıca planlanan Stripe
   abonelik kolonları için tekrar kullanılacak altyapı.
5. **Var olan kullanıcılar grandfather edilir** — migration'da
   `email_verified` için `server_default='true'`, yeni kayıtlar kodda
   açıkça `False` ile oluşturulur. Aksi halde mevcut kullanıcılar bir
   sonraki girişte aniden kilitlenir.

## Veri modeli (`web/database.py`, `User`)

Yeni kolonlar:
- `email_verified` (Boolean, default `False` — kod tarafında; migration'da
  mevcut satırlar için `server_default='true'`)
- `verification_token` (String, nullable) — `secrets.token_urlsafe(32)`,
  tek kullanımlık, doğrulandıktan sonra `None`'a çekilir
- `verification_token_expires` (DateTime, nullable) — üretim anı + 24 saat

JWT kullanılmıyor çünkü token DB'de tutulup harcandıktan sonra siliniyor;
üretim zamanı ayrıca saklanmıyor, `verification_token_expires - 24h` ile
resend rate-limit kontrolü için geriye hesaplanıyor.

## Migration altyapısı

- Yeni bağımlılık: `Flask-Migrate==4.0.5` (`web/requirements-backend.txt`)
- `web/app.py`: `from flask_migrate import Migrate` + `Migrate(app, db)`
- `flask db init` → `web/migrations/` (commit edilir)
- İlk migration: `flask db migrate -m "add email verification fields"`,
  `email_verified` için `server_default='true'`
- Deploy akışına (Dockerfile/start komutu) `flask db upgrade`,
  `gunicorn` başlamadan önce eklenir — her deploy otomatik migration uygular

## Kayıt/giriş akışı değişikliği (`web/app.py`)

**`POST /api/v1/auth/register`** (satır ~113-159):
- `email_verified=False`, `verification_token`, `verification_token_expires`
  (+24h) ile kullanıcı oluşturulur
- JWT dönülmez — cevap sadece `{"message": "Doğrulama e-postası gönderildi..."}`, 201
- `send_verification_email()` çağrılır (Resend API, `send_contact_email`
  ile aynı desen). **Gönderim başarısız olursa kullanıcı kaydı rollback
  edilir**, 502 dönülür — aksi halde asla doğrulanamayacak bir hesap kalır

**`POST /api/v1/auth/login`** (satır ~162-200):
- Şifre doğru ama `email_verified=False` ise JWT verilmez,
  `403` + `{"error": "...", "code": "email_not_verified"}`

## Yeni endpoint'ler

**`GET /api/v1/auth/verify?token=<token>`**
- Token bulunamaz/süresi geçmişse: `400`
- Bulunursa: `email_verified=True`, `verification_token=None`, 30 günlük
  JWT üretilip döner (link'e tıklar tıklamaz otomatik giriş)

**`POST /api/v1/auth/resend-verification`**
- Body: `{"email": "..."}`
- Kullanıcı yok / zaten doğrulanmış / rate-limit'e takıldı — **hepsinde
  aynı genel mesaj** döner (`"Eğer bu e-posta kayıtlıysa..."`) — e-posta
  enumeration'ı önlemek için
- Aynı e-posta için 60 saniyede bir istekten fazlası reddedilir
  (`verification_token_expires - 24h` üretim zamanı hesaplanarak)
- Yeni token + süre üretilip eskisinin üzerine yazılır, e-posta tekrar gönderilir

## E-posta içeriği

Düz metin (contact formundaki `send_contact_email` deseniyle aynı, Resend
API'ye `text` alanı olarak):

```
LessToken hesabınızı doğrulamak için:
https://lesstoken.app/app/verify?token=<token>

Bu bağlantı 24 saat geçerlidir.
```

## Frontend

**Yeni sayfa: `pages/app/verify.jsx`**
- `?token=` okunur, yüklenince `GET /api/v1/auth/verify` çağrılır
- Başarılı: JWT `localStorage`'a yazılır, "doğrulandı" mesajı, `/app/dashboard`'a yönlendirme
- Başarısız: hata mesajı + "Yeni link gönder" formu (`resend-verification` çağırır)

**`pages/app/auth.jsx` değişikliği:**
- Login `403 email_not_verified` dönerse: "E-postanızı doğrulayın" ekranı + yeniden gönder butonu
- Register başarılı olduğunda (artık token dönmediği için) doğrudan dashboard yerine aynı "e-postanızı kontrol edin" ekranına yönlendirme

## Test planı

`web/tests/test_email_verification.py` (mevcut `test_optimize_limits.py`
deseniyle — in-memory SQLite, Flask test client, `requests.post` mock'lanır):

- Kayıt sonrası `email_verified=False`, JWT dönmüyor
- Geçersiz/mevcut olmayan token → 400
- Süresi dolmuş token → 400
- Doğru token → `email_verified=True`, token temizlenir, JWT döner
- Doğrulanmamış hesapla login → 403 `email_not_verified`
- `resend-verification`: var olmayan e-posta ve zaten doğrulanmış e-posta
  için aynı genel mesaj (enumeration koruması)
- 60 saniye içinde ikinci resend isteği reddedilir
- Migration'ın gerçek Postgres üzerinde mevcut kullanıcıyı
  `email_verified=True` bıraktığı staging'de elle doğrulanacak (otomatik
  test kapsamı dışında)
