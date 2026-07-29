# LessToken Web Araçları — Tasarım Spesifikasyonu

**Tarih:** 2026-07-30
**Durum:** Kullanıcı onaylı tasarım
**Repo:** lesstoken-landing (Next.js, static export, Vercel → lesstoken.app)

## Amaç

Masaüstü uygulamasının üç iş akışını (Metin, Görsel, Dosya) üyeliksiz,
backend'siz web araçları olarak lesstoken.app üzerinde sunmak. Dileyen
kullanıcı uygulamayı indirmeden web üzerinden kullanabilsin.

## Temel kararlar (kullanıcı onaylı)

1. **Üyeliksiz.** Kayıt/giriş yok. Mevcut üyelikli `/app` bölümüne ve
   Railway'deki Flask backend'ine (api.lesstoken.app) DOKUNULMAZ — linksiz
   kalır, ileride değerlendirilir.
2. **Ziyaretçi kendi API anahtarını girer.** Anahtar yalnızca tarayıcıda
   (localStorage) saklanır ve doğrudan sağlayıcıya (OpenAI/Claude/Gemini)
   gönderilir. Sunucularımıza hiçbir zaman ulaşmaz.
3. **Anahtarsız temel mod.** Anahtar girilmemişse "Düzelt/temizle" kural
   tabanlı (yerel, JS) çalışır; diğer işlemler kibarca anahtar ister.
4. **PDF ilk sürümde yok.** /file yalnızca .txt, .md, .docx okur.
   (pdfjs-dist ağır; talep gelirse sonraki sürümde.)
5. **Önce PR #1 merge edilir.** Açık bekleyen `/image` PR'ı
   (feature/web-image-resize) bu işin temelidir; yeni sayfalar onun
   üzerine gelir.

## Sayfalar

### /image (PR #1'den, mevcut)
Panodan görsel yapıştır → küçült → otomatik panoya kopyala. Değişiklik yok;
sadece merge edilip navigasyona bağlanır.

### /text (yeni — Metin aracı)
Masaüstü Metin sekmesiyle birebir aynı 7 işlem:
Düzelt/temizle, Daha kısa yap, Daha resmi yap, Özetle, Madde madde yap,
İngilizceye çevir, E-posta haline getir.

- Giriş textarea'sı ("Metni buraya yapıştırın…")
- İşlem seçici (select) + Çalıştır butonu
- Hızlı işlem butonları (7 işlem, tek tık)
- Sonuç alanı (salt okunur textarea)
- "Sonucu kopyala" (navigator.clipboard.writeText) ve "Temizle" butonları
- Üstte ortak AI Ayarları kutusu (aşağıda)
- Anahtar yoksa: "Düzelt/temizle" yerel kurallarla çalışır (boşluk
  normalizasyonu, satır düzeni — masaüstü yerel modundan uyarlanır);
  diğer 6 işlem sonuç alanında "Bu işlem için AI Ayarları'ndan bir API
  anahtarı girin" mesajı gösterir.

### /file (yeni — Dosya aracı)
- Dosya seç butonu + sürükle-bırak alanı (.txt, .md, .docx)
- Metin tarayıcıda çıkarılır (docx için `mammoth` browser build'i;
  txt/md için FileReader). Hiçbir dosya sunucuya gitmez — bu, sayfada
  açıkça yazılır.
- Çıkan metin düzenlenebilir textarea'da gösterilir
- "Metin aracına aktar" → metni sessionStorage'a koyup /text'e yönlendirir;
  /text açılışta sessionStorage'daki aktarımı alıp giriş alanına koyar ve
  bu aktarım kaydını sessionStorage'dan siler (API anahtarına dokunulmaz)
- "Sonucu .txt indir" → Blob + download link

## Ortak bileşenler

### components/AiSettings.jsx
- Sağlayıcı seçimi: OpenAI / Claude / Gemini
- API anahtarı girişi (password tipi, göster/gizle)
- localStorage anahtarları: `lesstoken.provider`, `lesstoken.apiKey`
- Not metni: "Anahtarınız yalnızca bu tarayıcıda saklanır ve doğrudan
  sağlayıcıya gönderilir — sunucularımıza hiçbir zaman ulaşmaz."
- "Anahtarı sil" butonu

### lib/aiClient.js
- `runOperation(provider, apiKey, operation, text)` → Promise<string>
- Sağlayıcı uçları (tarayıcıdan doğrudan):
  - OpenAI: POST https://api.openai.com/v1/chat/completions
  - Claude: POST https://api.anthropic.com/v1/messages
    (header: `anthropic-dangerous-direct-browser-access: true`)
  - Gemini: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
- Varsayılan modeller implementasyon sırasında CANLI doğrulanır
  (geçmiş ders: model adları ezberden yazılmaz).
- İşlem prompt'ları masaüstü `src/aiclipboardoptimizer/ai/processor.py`
  içindeki prompt'lardan birebir uyarlanır — iki platform aynı davransın.

### lib/localText.js
- `localClean(text)` — anahtarsız "Düzelt/temizle": çoklu boşluk/boş satır
  normalizasyonu, satır sonu kırpma. Masaüstü yerel modundan uyarlanır.

## Navigasyon ve ana sayfa

- Ana sayfa nav'ına "Araçlar" (EN: "Tools") linki; /text, /image, /file
  sayfalarına giden küçük bir bölüm veya dropdown.
- Üç araç sayfası birbirine üst menüden bağlanır (Metin | Görsel | Dosya —
  masaüstü sekme yapısını yansıtır).
- Footer'daki "Ürün" sütununa araç linkleri eklenir.
- i18n: index.jsx'teki tr/en pattern'i aynen izlenir; tüm yeni metinler
  iki dilde yazılır.

## Hata durumları

- 401/403 → "API anahtarınız geçersiz görünüyor. Kontrol edip yeniden girin."
- 429 → "Sağlayıcı istek limitinize takıldınız. Biraz bekleyip tekrar deneyin."
- Ağ hatası → "Sağlayıcıya ulaşılamadı. İnternet bağlantınızı kontrol edin."
- Boş giriş → "Önce bir metin yapıştırın veya yazın."
- Desteklenmeyen dosya türü → "Bu araç .txt, .md ve .docx dosyalarını okur."
- Tüm mesajlar tr/en iki dilde.

## Test ve doğrulama

- `lib/localText.js` ve prompt eşlemesi için basit birim testleri
  (repo'da test altyapısı yoksa node ile çalışan hafif testler).
- Tarayıcı doğrulaması: dev server + üç sayfanın uçtan uca manuel akışı
  (anahtarsız yerel temizlik, anahtar girip AI işlemi, docx yükleme,
  metin aktarımı, kopyalama/indirme).
- Deploy sonrası canlıda smoke test.

## Kapsam dışı (bilinçli)

- PDF okuma (sonraki sürüm adayı)
- Görsel sayfasına OCR/format seçenekleri eklemek
- /app üyelikli bölümün kaldırılması veya geliştirilmesi
- Kullanım istatistikleri/analitik
