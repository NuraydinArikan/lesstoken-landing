# /support Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bilingual, self-contained `/support` page that becomes the single support entry point for lesstoken.app and the destination for the Chrome Web Store Support URL.

**Architecture:** Content lives as pure data in `lib/supportContent.mjs` so copy can be edited without touching JSX and can be tested by the existing `node --test` runner. `pages/support.jsx` composes product tabs, an FAQ accordion, and a `ContactForm` component extracted from the page being retired. `pages/contact.jsx` is deleted and `/contact` is redirected at the Vercel edge.

**Tech Stack:** Next.js 14 (pages router, `output: 'export'`), React 18, Tailwind CSS 3.3, `node --test` for unit tests, Vercel hosting.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-12-support-page-design.md`. Branch: `feature/support-page`.
- Repo root: `C:\Users\nuray\Desktop\Uygulamalar\lesstoken-landing`
- **Styling is Tailwind.** `contact.jsx`'s inline `style` objects are the repo's exception, not the pattern. Page theme matches `index.jsx`: `bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white`.
- **Language detection uses `detectLang()` from `lib/toolI18n.js`.** Do not hand-roll `localStorage.getItem('lang')` — `detectLang()` goes through `safeGet`, which survives blocked storage.
- **Do not add a footer.** `pages/_app.jsx` renders the global `<Footer lang={lang} />` on every route except `/` and `/app/*`; `/support` gets it automatically.
- **The contact API contract does not change:** `POST` to `apiUrl('/api/v1/contact')` with body `{name, email, subject, message}`. No backend edits, so no Railway deploy.
- **Do not add a "how is the saving calculated" FAQ item.** The current formula measures the cost of optimizing rather than the user's saving; that is an open product decision.
- **Do not mention Ollama.** It is being removed from the extension on branch `fix/remove-ollama-from-extension`.
- **`next dev` does not hydrate in this project.** Verify interactive behaviour with `npm run build` output, never `npm run dev`.
- Product tab order is Extension (default), Desktop, Web Tools.
- Contact subject prefixes are English regardless of page language: `Extension — `, `Desktop — `, `Web Tools — `.

## File Structure

| File | Responsibility |
|---|---|
| `lib/supportContent.mjs` | **Create.** Bilingual copy: tab labels, FAQ items per product, form strings. Pure data, no JSX, no imports. |
| `tests/supportContent.test.mjs` | **Create.** Guards language parity, item integrity, placeholder text. |
| `components/ContactForm.jsx` | **Create.** Form markup, submit lifecycle, error mapping. Owns the only `fetch` to the contact API. |
| `pages/support.jsx` | **Create.** Language detection, tab state, accordion state, composition. |
| `vercel.json` | **Create.** `/contact` → `/support` redirect (307). |
| `pages/contact.jsx` | **Delete.** Superseded. |
| `components/Footer.jsx:145` | **Modify.** `/contact` → `/support`. |
| `pages/index.jsx:594,602` | **Modify.** Two `/contact` links → `/support`. |

---

### Task 1: Bilingual content module

**Files:**
- Create: `lib/supportContent.mjs`
- Test: `tests/supportContent.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const supportContent` — an object keyed `tr` and `en`. Each locale has `{ meta: {title, description}, tabs: {extension, desktop, web}, faq: {extension: Array<{q,a}>, desktop: Array<{q,a}>, web: Array<{q,a}>}, form: {...} }`. Tasks 2 and 3 read from this shape. The product keys `extension | desktop | web` are the tab ids used throughout.

- [ ] **Step 1: Write the failing test**

Create `tests/supportContent.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { supportContent } from '../lib/supportContent.mjs';

const LOCALES = ['tr', 'en'];
const PRODUCTS = ['extension', 'desktop', 'web'];

test('both locales exist', () => {
  for (const locale of LOCALES) {
    assert.ok(supportContent[locale], `missing locale: ${locale}`);
  }
});

test('every locale covers every product, with matching item counts', () => {
  for (const product of PRODUCTS) {
    const counts = LOCALES.map((locale) => {
      const items = supportContent[locale].faq[product];
      assert.ok(Array.isArray(items), `${locale}.faq.${product} is not an array`);
      assert.ok(items.length > 0, `${locale}.faq.${product} is empty`);
      return items.length;
    });
    assert.equal(
      counts[0], counts[1],
      `${product}: tr has ${counts[0]} items, en has ${counts[1]} -- adding a ` +
      'question in one language and forgetting the other leaves a gap no one notices'
    );
  }
});

test('every FAQ item has a non-empty question and answer', () => {
  for (const locale of LOCALES) {
    for (const product of PRODUCTS) {
      supportContent[locale].faq[product].forEach((item, idx) => {
        for (const field of ['q', 'a']) {
          assert.equal(typeof item[field], 'string',
            `${locale}.${product}[${idx}].${field} is not a string`);
          assert.ok(item[field].trim().length > 0,
            `${locale}.${product}[${idx}].${field} is blank`);
        }
      });
    }
  }
});

test('tab labels and form strings are present in both locales', () => {
  for (const locale of LOCALES) {
    for (const product of PRODUCTS) {
      assert.ok(supportContent[locale].tabs[product]?.trim(),
        `${locale}.tabs.${product} is blank`);
    }
    for (const key of ['title', 'name', 'email', 'subject', 'message', 'send',
                       'sending', 'success', 'errorGeneric', 'errorRateLimit',
                       'errorNetwork']) {
      assert.ok(supportContent[locale].form[key]?.trim(),
        `${locale}.form.${key} is blank`);
    }
    for (const key of ['title', 'description', 'heading']) {
      assert.ok(supportContent[locale].meta[key]?.trim(),
        `${locale}.meta.${key} is blank`);
    }
  }
});

test('no placeholder text survived into shipped copy', () => {
  const banned = /\b(TODO|TBD|FIXME|lorem ipsum|XXX)\b/i;
  const walk = (value, path) => {
    if (typeof value === 'string') {
      assert.ok(!banned.test(value), `placeholder text at ${path}: ${value}`);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
    }
  };
  walk(supportContent, 'supportContent');
});

test('no Ollama references -- the extension does not support it', () => {
  assert.ok(!/ollama/i.test(JSON.stringify(supportContent)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/supportContent.mjs'`

- [ ] **Step 3: Write the content module**

Create `lib/supportContent.mjs`:

```js
// Support copy for lesstoken.app/support. Pure data on purpose: this is the
// file that changes most often, and keeping it out of JSX means editing a
// question never risks breaking the page. Shape is guarded by
// tests/supportContent.test.mjs -- in particular, tr and en must stay in step.
export const supportContent = {
  tr: {
    meta: {
      title: 'Destek - LessToken',
      heading: 'Destek',
      description: 'LessToken tarayıcı eklentisi, masaüstü uygulaması ve web araçları için yardım.'
    },
    tabs: { extension: 'Tarayıcı Eklentisi', desktop: 'Masaüstü', web: 'Web Araçları' },
    faq: {
      extension: [
        {
          q: 'API anahtarını nereden alırım?',
          a: 'Kullanmak istediğiniz sağlayıcıdan: OpenAI için platform.openai.com/api-keys, Anthropic Claude için console.anthropic.com, Google Gemini için ai.google.dev. Anahtarı eklentinin ayarlar sayfasına yapıştırmanız yeterli.'
        },
        {
          q: '"Geçersiz anahtar" hatası alıyorum.',
          a: 'Üç yaygın sebebi var. Ayarlarda seçili sağlayıcı ile anahtarın ait olduğu sağlayıcı farklı olabilir. Anahtarın başında veya sonunda kopyalarken bulaşan boşluk kalmış olabilir. Ya da hesabınızda kullanılabilir bakiye yoktur — sağlayıcılar bakiyesiz hesapta geçerli bir anahtarı bile reddeder.'
        },
        {
          q: 'Hangi sağlayıcıyı seçmeliyim?',
          a: 'Üçü de çalışır; fark maliyet ve üslupta. Kısa metinlerde farkı zor görürsünüz, o yüzden zaten hesabınızın olduğu sağlayıcıyla başlayın. Her optimizasyonda ayarlardan değiştirebilirsiniz.'
        },
        {
          q: 'Metnim sizin sunucularınıza gidiyor mu?',
          a: 'Hayır. Eklenti metni doğrudan seçtiğiniz yapay zeka sağlayıcısına gönderir; API anahtarınız yalnızca tarayıcınızda saklanır. Bu akışta bizim bir sunucumuz yok.'
        },
        {
          q: 'Optimize\'a basıyorum ama bir şey olmuyor.',
          a: 'Önce ayarlarda seçtiğiniz sağlayıcı için bir anahtar kayıtlı mı bakın — anahtar yoksa eklenti isteği hiç göndermez. Kayıtlıysa sağlayıcının kendi durum sayfasını kontrol edin; kesinti sırasında istek sessizce başarısız olur.'
        }
      ],
      desktop: [
        {
          q: 'Windows "bilinmeyen yayıncı" uyarısı gösteriyor.',
          a: 'Bu SmartScreen uyarısıdır ve kurulum dosyası henüz kod imzalama sertifikası taşımadığı için çıkar; dosyada bir sorun olduğu anlamına gelmez. Ana sayfada uyarının nasıl geçileceğini adım adım gösteren bir bölüm var; indirdiğiniz dosyanın SHA-256 özetini de orada yayınlıyoruz.'
        },
        {
          q: 'Uygulama bana hiç güncelleme önermiyor.',
          a: 'Otomatik güncelleme ilk kez v1.0.7 ile çalışmaya başladı. Sürümünüz v1.0.6 veya daha eskiyse uygulama güncelleme kontrolü yapamaz ve size hiçbir zaman yeni sürüm önermez. Tek seferlik çözüm: siteden güncel kurulumu indirip üzerine kurun. v1.0.7 ve sonrası kendini günceller.'
        }
      ],
      web: [
        {
          q: 'Web araçları için hesap açmam gerekiyor mu?',
          a: 'Hayır. Metin, Görsel ve Dosya araçları hesapsız çalışır. Yapay zeka gerektiren işlemlerde kendi API anahtarınızı girersiniz ve anahtar yalnızca tarayıcınızda kalır.'
        },
        {
          q: 'Hangi dosya türlerini yükleyebilirim?',
          a: 'Dosya aracı .txt, .md ve .docx okur; dosya boyutu en fazla 2 MB olabilir. Okuma tamamen tarayıcınızda yapılır, dosyanız hiçbir yere yüklenmez.'
        },
        {
          q: 'Görsel küçültme için de anahtar gerekiyor mu?',
          a: 'Hayır. Görsel küçültme ve dosyadan metin çıkarma anahtarsız çalışır, çünkü ikisi de tarayıcınızın içinde yapılır.'
        }
      ]
    },
    form: {
      title: 'Hâlâ takıldıysanız yazın',
      name: 'Adınız',
      email: 'E-posta adresiniz',
      subject: 'Konu',
      message: 'Mesajınız',
      send: 'Gönder',
      sending: 'Gönderiliyor…',
      success: 'Mesajınız ulaştı. En kısa sürede dönüş yapacağız.',
      errorGeneric: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
      errorRateLimit: 'Çok fazla mesaj gönderildi. Lütfen biraz bekleyip tekrar deneyin.',
      errorNetwork: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
    }
  },
  en: {
    meta: {
      title: 'Support - LessToken',
      heading: 'Support',
      description: 'Help for the LessToken browser extension, desktop app and web tools.'
    },
    tabs: { extension: 'Browser Extension', desktop: 'Desktop', web: 'Web Tools' },
    faq: {
      extension: [
        {
          q: 'Where do I get an API key?',
          a: 'From whichever provider you want to use: platform.openai.com/api-keys for OpenAI, console.anthropic.com for Anthropic Claude, ai.google.dev for Google Gemini. Paste the key into the extension\'s settings page and you are done.'
        },
        {
          q: 'I keep getting an "invalid key" error.',
          a: 'Three causes account for almost all of these. The provider selected in settings may not be the provider the key belongs to. The key may have picked up a leading or trailing space when it was copied. Or the account may have no credit — providers reject even a valid key once the balance runs out.'
        },
        {
          q: 'Which provider should I choose?',
          a: 'All three work; they differ in cost and phrasing. On short text the difference is hard to spot, so start with whichever provider you already have an account with. You can switch in settings before any optimization.'
        },
        {
          q: 'Does my text reach your servers?',
          a: 'No. The extension sends your text straight to the AI provider you chose, and your API key is stored only in your browser. We have no server in that path at all.'
        },
        {
          q: 'I click Optimize and nothing happens.',
          a: 'First check that a key is saved for the provider selected in settings — with no key the extension never sends the request. If a key is saved, check the provider\'s own status page; during an outage the request fails quietly.'
        }
      ],
      desktop: [
        {
          q: 'Windows warns about an unknown publisher.',
          a: 'That is SmartScreen, and it appears because the installer does not yet carry a code-signing certificate — it does not mean anything is wrong with the file. The home page walks through dismissing the warning step by step, and publishes the SHA-256 checksum of the download so you can verify it yourself.'
        },
        {
          q: 'The app never offers me an update.',
          a: 'Auto-update first worked in v1.0.7. If you are on v1.0.6 or older the app cannot check for updates and will never offer you a new version. The one-time fix is to download the current installer from the site and install it over your existing copy. v1.0.7 and later update themselves.'
        }
      ],
      web: [
        {
          q: 'Do I need an account for the web tools?',
          a: 'No. The Text, Image and File tools work without one. For the steps that call an AI you supply your own API key, and it stays in your browser.'
        },
        {
          q: 'Which file types can I upload?',
          a: 'The File tool reads .txt, .md and .docx, up to 2 MB. The reading happens entirely in your browser — your file is never uploaded anywhere.'
        },
        {
          q: 'Does image shrinking need a key too?',
          a: 'No. Image shrinking and file text extraction both run inside your browser, so neither needs a key.'
        }
      ]
    },
    form: {
      title: 'Still stuck? Write to us',
      name: 'Your name',
      email: 'Your email address',
      subject: 'Subject',
      message: 'Your message',
      send: 'Send',
      sending: 'Sending…',
      success: 'Your message reached us. We will get back to you shortly.',
      errorGeneric: 'The message could not be sent. Please try again.',
      errorRateLimit: 'Too many messages sent. Please wait a moment and try again.',
      errorNetwork: 'Could not connect. Check your internet connection and try again.'
    }
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all 6 tests in `supportContent.test.mjs`, plus the repo's existing `aiClient`, `imageInput` and `localText` tests.

- [ ] **Step 5: Commit**

```bash
git add lib/supportContent.mjs tests/supportContent.test.mjs
git commit -m "feat(support): add bilingual support content module

Copy lives as pure data so editing a question never touches JSX, and so the
existing node --test runner can guard it. The parity test is the point: adding
a Turkish question and forgetting the English one leaves a blank section that
nobody notices."
```

---

### Task 2: /support page with tabs and FAQ

**Files:**
- Create: `pages/support.jsx`

**Interfaces:**
- Consumes: `supportContent` from Task 1; `detectLang()` from `lib/toolI18n.js`.
- Produces: the `/support` route. Task 3 adds `<ContactForm>` into the marked slot at the bottom of this page and needs `activeTab` (one of `'extension' | 'desktop' | 'web'`) to build its `defaultSubject`.

- [ ] **Step 1: Create the page**

Create `pages/support.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { supportContent } from '../lib/supportContent.mjs';
import { detectLang } from '../lib/toolI18n';

const PRODUCTS = ['extension', 'desktop', 'web'];

export default function Support() {
  const [lang, setLang] = useState('tr');
  const [activeTab, setActiveTab] = useState('extension');
  const [openFaq, setOpenFaq] = useState(null);

  // detectLang reads the same 'lang' key the rest of the site uses, through
  // safeGet -- so a blocked-storage browser falls back instead of throwing.
  useEffect(() => { setLang(detectLang()); }, []);

  const t = supportContent[lang];
  const items = t.faq[activeTab];

  const selectTab = (product) => {
    setActiveTab(product);
    // openFaq is an index into the current tab's list. Leaving it set would
    // point past the end of a shorter tab and collapse every item.
    setOpenFaq(null);
  };

  return (
    <>
      <Head>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-10">
            <img src="/mark-sm.svg" alt="LessToken" style={{ width: '40px', height: '40px' }} />
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              LessToken
            </a>
          </div>

          <h1 className="text-4xl font-bold mb-4">{t.meta.heading}</h1>
          <p className="text-xl text-gray-300 mb-12">{t.meta.description}</p>

          <div className="flex flex-wrap gap-2 mb-10">
            {PRODUCTS.map((product) => (
              <button
                key={product}
                onClick={() => selectTab(product)}
                aria-pressed={activeTab === product}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === product
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 border border-slate-700 text-gray-400 hover:text-white'
                }`}
              >
                {t.tabs[product]}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {items.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <button
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                    className="w-full flex justify-between items-center gap-4 text-left font-semibold text-lg hover:text-blue-400 transition"
                  >
                    <span>{item.q}</span>
                    <span className="text-2xl leading-none shrink-0">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="mt-4 text-gray-300 leading-relaxed">{item.a}</p>}
                </div>
              );
            })}
          </div>

          {/* Task 3 mounts ContactForm here */}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build and confirm the route is emitted**

Run: `npm run build`
Expected: build succeeds and the route list includes `/support`. Confirm the file exists:

```bash
ls out/support.html
```

Expected: the path prints. (If `npm run build` fails on a missing dependency, run `npm install` first — the lockfile is installed on Vercel but not necessarily locally.)

- [ ] **Step 3: Verify both languages and the tab reset in a real browser**

`next dev` does not hydrate in this project, so serve the built export instead:

```bash
npx serve out -l 3000
```

Check, at `http://localhost:3000/support`:
1. Page renders with the extension tab selected.
2. Open the third FAQ item, switch to Desktop (2 items) — no item is left open and none are missing.
3. In DevTools console run `localStorage.setItem('lang','en')` and reload — copy switches to English.
4. Reset with `localStorage.setItem('lang','tr')`.

- [ ] **Step 4: Commit**

```bash
git add pages/support.jsx
git commit -m "feat(support): add /support page with product tabs and FAQ

Extension is the default tab because that is where the traffic will come
from -- the Chrome Web Store Support URL points here. Switching tabs clears
the open accordion index, which would otherwise point past the end of a
shorter tab and silently collapse every item."
```

---

### Task 3: ContactForm component

**Files:**
- Create: `components/ContactForm.jsx`
- Modify: `pages/support.jsx` (mount the form at the marked slot)

**Interfaces:**
- Consumes: `supportContent[lang].form` from Task 1; `apiUrl` from `lib/api.js`.
- Produces: `<ContactForm lang={string} defaultSubject={string} />`, a default export.

- [ ] **Step 1: Create the component**

Create `components/ContactForm.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { supportContent } from '../lib/supportContent.mjs';
import { apiUrl } from '../lib/api';

const FIELD_CLASS =
  'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 ' +
  'text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function ContactForm({ lang = 'tr', defaultSubject = '' }) {
  const t = supportContent[lang].form;
  const [form, setForm] = useState({ ...EMPTY, subject: defaultSubject });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // Follows the active tab while the user has not typed their own subject.
  useEffect(() => {
    setForm((prev) =>
      prev.subject === '' || prev.subject.endsWith('— ')
        ? { ...prev, subject: defaultSubject }
        : prev
    );
  }, [defaultSubject]);

  // The success banner clears itself; without the cleanup this timer fires
  // after unmount and React warns about setting state on a dead component.
  useEffect(() => {
    if (status !== 'success') return undefined;
    const timer = setTimeout(() => setStatus('idle'), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  const change = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setError('');

    try {
      const response = await fetch(apiUrl('/api/v1/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setForm({ ...EMPTY, subject: defaultSubject });
        setStatus('success');
        return;
      }

      // The backend rate-limits per IP. Without this branch a throttled user
      // sees the generic failure and retries immediately, making it worse.
      if (response.status === 429) {
        setError(t.errorRateLimit);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t.errorGeneric);
      }
      setStatus('error');
    } catch {
      setError(t.errorNetwork);
      setStatus('error');
    }
  };

  const submitting = status === 'submitting';

  return (
    <section className="mt-16 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6">{t.title}</h2>

      {status === 'success' && (
        <p className="mb-6 px-4 py-3 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-200">
          {t.success}
        </p>
      )}
      {status === 'error' && (
        <p className="mb-6 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-gray-300">
          {t.name}
          <input type="text" name="name" required value={form.name}
                 onChange={change} className={`${FIELD_CLASS} mt-1`} />
        </label>

        <label className="text-sm font-medium text-gray-300">
          {t.email}
          <input type="email" name="email" required value={form.email}
                 onChange={change} className={`${FIELD_CLASS} mt-1`} />
        </label>

        <label className="text-sm font-medium text-gray-300">
          {t.subject}
          <input type="text" name="subject" required value={form.subject}
                 onChange={change} className={`${FIELD_CLASS} mt-1`} />
        </label>

        <label className="text-sm font-medium text-gray-300">
          {t.message}
          <textarea name="message" required rows="6" value={form.message}
                    onChange={change} className={`${FIELD_CLASS} mt-1 resize-y`} />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="self-start px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {submitting ? t.sending : t.send}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Mount it in the page**

In `pages/support.jsx`, add the import below the existing imports:

```jsx
import ContactForm from '../components/ContactForm';
```

Add the subject-prefix map below the `PRODUCTS` constant:

```jsx
// English regardless of page language: this reaches the maintainer's inbox,
// and a per-language prefix would split one product across two labels.
const SUBJECT_PREFIX = {
  extension: 'Extension — ',
  desktop: 'Desktop — ',
  web: 'Web Tools — '
};
```

Replace the comment `{/* Task 3 mounts ContactForm here */}` with:

```jsx
<ContactForm lang={lang} defaultSubject={SUBJECT_PREFIX[activeTab]} />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds, `/support` still emitted.

- [ ] **Step 4: Verify the form against the live API**

Serve the build and submit a real message:

```bash
npx serve out -l 3000
```

At `http://localhost:3000/support`:
1. The subject field is pre-filled `Extension — `; switching to Desktop changes it to `Desktop — `.
2. Type into the subject, then switch tabs — your text is **not** overwritten.
3. Submit a real message. Expected: the green success banner, fields cleared, and the message arrives at `info@lesstoken.app`.
4. Submit repeatedly until the backend rate limit trips. Expected: the red banner shows the rate-limit sentence, not the generic failure.
5. In DevTools, set Network to Offline and submit. Expected: the network error sentence.

- [ ] **Step 5: Commit**

```bash
git add components/ContactForm.jsx pages/support.jsx
git commit -m "feat(support): add contact form with per-product subject

Carries over the form from /contact with four fixes: errors render inline
instead of alert(), the submit button disables while in flight so a double
click cannot trip the backend rate limit, HTTP 429 gets its own message
rather than the generic failure, and the success timer is cleared on unmount.

The subject prefix is English in both locales -- it serves the inbox, not the
reader, and a per-language prefix would split one product across two labels."
```

---

### Task 4: Retire /contact

**Files:**
- Delete: `pages/contact.jsx`
- Create: `vercel.json`
- Modify: `components/Footer.jsx:145`, `pages/index.jsx:594`, `pages/index.jsx:602`

**Interfaces:**
- Consumes: the `/support` route from Tasks 2–3.
- Produces: nothing further depends on this task.

- [ ] **Step 1: Add the redirect**

Create `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/contact",
      "destination": "/support",
      "permanent": false
    }
  ]
}
```

`permanent: false` issues a 307. A 308 is cached hard by browsers, and this consolidation should stay reversible until the page has settled.

- [ ] **Step 2: Delete the superseded page**

```bash
git rm pages/contact.jsx
```

- [ ] **Step 3: Update the three internal links**

In `components/Footer.jsx` line 145, change `href="/contact"` to `href="/support"`:

```jsx
                <a href="/support" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
```

In `pages/index.jsx` line 594:

```jsx
                <li><a href="/support" className="hover:text-white transition">İletişim</a></li>
```

In `pages/index.jsx` line 602:

```jsx
                <li><a href="/support" className="hover:text-white transition">İletişim Formu</a></li>
```

- [ ] **Step 4: Confirm no `/contact` links remain and the route is gone**

```bash
grep -rn 'href="/contact"' --include=*.jsx --include=*.js .
```

Expected: no output.

```bash
npm run build && ls out/contact.html
```

Expected: build succeeds; `ls` reports that `out/contact.html` does not exist.

- [ ] **Step 5: Commit**

```bash
git add vercel.json components/Footer.jsx pages/index.jsx
git commit -m "feat(support): retire /contact in favour of /support

/support now carries the same form plus the FAQ, so two pages would mean two
forms to keep in step. Internal links point straight at /support; the 307
catches bookmarks and anything already published. 307 rather than 308 keeps
the consolidation reversible -- browsers cache a 308 hard."
```

- [ ] **Step 6: Verify the redirect after deploy**

The redirect lives in `vercel.json` and is applied at the edge, so it cannot be tested locally. After the branch is deployed:

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://lesstoken.app/contact
```

Expected: `307 -> https://lesstoken.app/support`

---

## After the plan

Once deployed, update the Chrome Web Store listing's Support URL to
`https://lesstoken.app/support`. It is a listing field, not a package field,
so it needs no new version upload.
