# Destek Sayfası (`/support`) — Tasarım Spesifikasyonu

**Tarih:** 2026-08-12
**Durum:** Kullanıcı onaylı tasarım
**Repo:** lesstoken-landing (Next.js statik export, Vercel → lesstoken.app)

## Amaç

Chrome uzantısı 2026-08-12'de Chrome Web Store'da yayına girdi (item ID
`nhmphgicjngcaenfhdjcjgpkockipooj`). Listedeki **Support URL** şu an
`https://github.com/LessTokenApp` adresini gösteriyor. Bu adres bir
organizasyon değil, kişisel bir GitHub hesabı ve içinde tek bir public repo
var: `LessTokenDesktop`. Yani uzantıda sorun yaşayan kullanıcı "Destek
merkezini ziyaret edin"e tıklayınca alakasız bir masaüstü uygulamasının
profil sayfasına düşüyor. Uzantı kaynağı orada bile değil —
`NuraydinArikan/lesstoken-landing/extension` altında.

Bu spec, Support URL'nin işaret edeceği gerçek bir destek sayfası tanımlar.

Sayfa yayına girdikten sonra Chrome Web Store panelinde Support URL
`https://lesstoken.app/support` olarak güncellenecek. Bu alan listing
metadata'sı olduğu için yeniden inceleme (review) gerektirmez.

## Temel kararlar (kullanıcı onaylı)

1. **İki dilli (tr/en) ve kendi kendine yeten.** Mağaza listesi en-US, sitenin
   varsayılanı ise Türkçe. Sayfa kurulum adımlarını kendi içinde barındırır ve
   yalnızca Türkçe olan `/guide`'a bağımlı kalmaz — böylece İngilizce kullanıcı
   hiçbir noktada Türkçe bir sayfaya düşmez.
2. **`/support` tek destek giriş noktasıdır.** `pages/contact.jsx` silinir,
   `/contact` → `/support` yönlendirilir. İki ayrı form bakımda tutulmaz.
3. **Üç ürünü de kapsar, uzantı önde.** Sekmeler: Uzantı (varsayılan),
   Masaüstü, Web Araçları. Trafik uzantıdan geleceği için varsayılan odur.
4. **Yönlendirme `permanent: false` (307).** 308'i tarayıcılar agresif
   cache'liyor; sayfa oturana kadar geri alınabilir kalsın. Sonra kalıcıya
   çevrilebilir.
5. **SSS içeriği ana sayfadakiyle paylaşılmaz.** Ana sayfadaki SSS kurulum
   *öncesi* pazarlama sorusuna ("kurmalı mıyım, verim güvende mi") cevap
   veriyor; destek SSS'i kurulum *sonrası* arıza sorusuna ("neden çalışmıyor").
   Farklı anlara hizmet ediyorlar ve ayrışabilmeleri doğru. Ortak modüle
   çekmek ~600 satırlık `index.jsx`'i az kazanç için ellemeyi gerektirirdi.

## Dosya yapısı

```
lib/supportContent.mjs        iki dilli metin, saf veri, JSX yok
components/ContactForm.jsx    form + POST + durum yönetimi
pages/support.jsx             sekmeler + kompozisyon
tests/supportContent.test.mjs içerik bütünlüğü testleri
vercel.json                   /contact → /support (307)
```

Silinen: `pages/contact.jsx`

Uzantı `.mjs` bilinçli. Repodaki ayrım şu: `.mjs` = `node --test` ile test
edilen saf modül (`localText`, `aiClient`, `imageInput`), `.js` = tarayıcıya
bağlı modül (`api`, `safeStorage`, `toolI18n`). İçerik saf veri olduğu için
test edilebilir tarafta durur. Next 14 `.mjs` import'unu sorunsuz çözer.

## Dil seçimi

`pages/support.jsx`, `index.jsx`'teki deseni birebir tekrar eder:

```js
const [lang, setLang] = useState('tr');
useEffect(() => {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('lang');
  const detected = saved && ['tr','en'].includes(saved)
    ? saved
    : (['tr','en'].includes(navigator.language.split('-')[0])
        ? navigator.language.split('-')[0]
        : 'tr');
  localStorage.setItem('lang', detected);
  setLang(detected);
}, []);
```

Aynı `lang` anahtarı kullanıldığı için ana sayfada İngilizceye geçen kullanıcı
`/support`'u da İngilizce açar.

## İçerik modeli

```js
export const supportContent = {
  tr: {
    meta: { title, description },
    tabs: { extension, desktop, web },
    faq: { extension: [{q, a}], desktop: [{q, a}], web: [{q, a}] },
    form: { title, name, email, subject, message, send, sending,
            success, errorGeneric, errorRateLimit, errorNetwork }
  },
  en: { /* aynı şekil */ }
};
```

SSS maddeleri `{q, a}` — ana sayfadaki mevcut şekille aynı, dolayısıyla aynı
akordeon mantığı çalışır.

Akordeon açık maddeyi `index.jsx`'teki gibi indeksle tutar (`openFaq`). Bu
yüzden **sekme değişince `openFaq` sıfırlanır**: aksi halde 3 maddeli sekmede
2. madde açıkken 1 maddeli sekmeye geçildiğinde var olmayan bir indeks açık
kalır ve hiçbir madde görünmez.

## SSS içeriği

**Uzantı:** API anahtarı nereden alınır (sağlayıcı linkleriyle) · "geçersiz
anahtar" hatasının yaygın sebepleri (yanlış sağlayıcı seçili, anahtarda bakiye
yok, başta/sonda boşluk) · hangi sağlayıcıyı seçmeli · metnim sunucunuza
gidiyor mu (hayır) · optimize'a basınca bir şey olmuyor.

**Web araçları:** hesap gerekmiyor · 2 MB dosya sınırı · desteklenen türler
(.txt, .md, .docx).

**Masaüstü:** iki madde özellikle yer alır, çünkü ikisi de bilinen gerçek
sorunlardır ve destek kutusuna düşmeleri kesindir:

1. **SmartScreen uyarısı.** Ana sayfada zaten `SmartScreenDemo` bileşeni ve
   `smartscreen` metinleri var; SSS oraya bağlanır, içerik tekrarlanmaz.
2. **"Neden güncelleme almıyorum?"** Auto-updater ilk kez v1.0.7'de çalıştı;
   v1.0.6 ve öncesindeki her kurulum mahsur durumda ve siteden elle yeniden
   indirmek zorunda. Bu şu an başka hiçbir yerde yazmıyor.

### Bilinçli dışarıda bırakılan

**"Token tasarrufu nasıl hesaplanıyor?"** sorusu eklenmeyecek. Mevcut formül
optimizasyon çağrısının kendi `input − output` farkını ölçüyor; yani
kullanıcının asıl tasarrufunu değil, optimize etmenin maliyetini gösteriyor.
Bu zaten açık bir ürün kararı olarak bekliyor. Halka açık bir SSS'te bunu
anlatmak ya yanlış beyan olur ya da hatayı ilan eder. Formül kararı verildikten
sonra tek madde olarak eklenir.

## `ContactForm` bileşeni

**Props:** `lang`, `defaultSubject`

`defaultSubject`, aktif sekmeye göre konu alanını önceden doldurur. Tek form üç
ürüne birden hizmet ettiği için, gelen mesajın hangi ürüne ait olduğu okumadan
görünür.

Önek **sayfa dilinden bağımsız olarak İngilizce sabittir**: `Extension — `,
`Desktop — `, `Web Tools — `. Gerekçe: bu metin son kullanıcıya değil, gelen
kutusuna hizmet ediyor; dile göre değişseydi aynı ürünün mesajları iki farklı
önekle gelir, filtrelemek ve aramak zorlaşırdı.

**Durum:** `idle | submitting | success | error`

**API sözleşmesi değişmez:** `POST` → `apiUrl('/api/v1/contact')`, gövde
`{name, email, subject, message}`. Backend'e dokunulmaz, yani Railway deploy'u
gerekmez — sadece Vercel.

### Taşınırken düzeltilecek dört sorun

Mevcut `pages/contact.jsx` okunurken çıkanlar:

1. **`alert()` ile hata gösterimi** (`contact.jsx:39`, `:42`), üstelik metinler
   Türkçe sabit. Yerine form içinde satır içi, iki dilli hata kutusu.
2. **`submitting` durumu yok.** Butona iki kez basılırsa iki POST gider.
   Backend'de IP başına rate limit olduğu için bu, kullanıcıyı kendi çift
   tıklamasıyla limite çarptırıp anlamsız bir hata görmesine yol açabilir.
   Gönderim sırasında buton `disabled`.
3. **429 ayrı ele alınmıyor.** Rate limit'e takılan kullanıcı genel hata
   görüyor. Ayrı mesaj: "Çok fazla mesaj gönderdiniz, biraz sonra tekrar
   deneyin."
4. **`setTimeout` unmount'ta temizlenmiyor** (`contact.jsx:37`). Kullanıcı 3
   saniye dolmadan sayfadan çıkarsa React uyarısı üretir. `useEffect` cleanup'ı
   ile temizlenir.

### Hata mesajı seçimi

| Durum | Gösterilen |
|---|---|
| HTTP 429 | `errorRateLimit` |
| Diğer non-OK | Sunucunun `data.error` alanı varsa o, yoksa `errorGeneric` |
| `fetch` throw | `errorNetwork` |

## Yönlendirme

`vercel.json` (yeni dosya):

```json
{
  "redirects": [
    { "source": "/contact", "destination": "/support", "permanent": false }
  ]
}
```

Vercel yönlendirmeleri dosya sisteminden önce çalışır, dolayısıyla çakışma
olmaz; yine de `pages/contact.jsx` silinir.

Ek olarak `/contact`'a veren üç iç link `/support`'a çevrilir:
`components/Footer.jsx:145`, `pages/index.jsx:594`, `pages/index.jsx:602`.
Yönlendirme, dışarıdan gelen ve yer imlerindeki linkler için emniyet ağı
olarak kalır.

Not: `index.jsx:594` ve `:602` aynı hedefe iki ayrı link veriyor ("İletişim" ve
"İletişim Formu"). İkisi de `/support`'a çevrilir; birleştirme bu spec'in
kapsamı dışında.

## Test

React test altyapısı (jsdom + testing-library) **kurulmayacak** — bu sayfa için
kapsamı gereksiz büyütür. Mevcut koşucu (`node --test`) ile test edilebilen tek
şey içerik verisidir ve asıl kırılgan nokta da orasıdır.

`tests/supportContent.test.mjs`:

1. **Dil paritesi** — `tr` ve `en` aynı ürün anahtarlarına sahip; her ürünün
   SSS madde sayısı iki dilde eşit. Buradaki bir numaralı gerçek hata biçimi
   budur: Türkçe madde eklenip İngilizcesi unutulur, kullanıcı boş bölüm görür,
   kimse fark etmez.
2. **Madde bütünlüğü** — her maddede `q` ve `a` dolu (boş/whitespace değil);
   her sekmede en az bir madde var.
3. **Yer tutucu kalmamış** — metinlerde "TODO", "TBD", "lorem" geçmiyor.

### Manuel doğrulama

Bu projede **`next dev` hydrate etmiyor**, yalnızca production build düzgün
çalışıyor. Sekmeler, akordeon ve form `npm run dev` üzerinde denenirse sonuç
yanıltıcı olur. Doğrulama `npm run build` çıktısı üzerinden yapılır.

Yönlendirme yerelde doğrulanamaz — `vercel.json` platform seviyesinde çalışır,
deploy sonrası kontrol edilir.

## Kapsam dışı

- `/guide` ve kalan sayfaların i18n'e taşınması
- Ana sayfa SSS'inin bu modülle birleştirilmesi
- `index.jsx` içindeki footer ile `components/Footer.jsx` arasındaki olası
  tekrarın giderilmesi
- Token tasarrufu formülünün düzeltilmesi (ayrı ürün kararı)
