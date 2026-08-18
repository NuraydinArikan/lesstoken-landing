import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import ToolNav from '../components/ToolNav';
import { toolLocales, detectLang } from '../lib/toolI18n';
import { safeSet } from '../lib/safeStorage';

const TEXT_EXTENSIONS = ['txt', 'md', 'csv'];
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export default function FileToolPage() {
  const router = useRouter();
  const [lang, setLang] = useState('tr');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | reading | done | error | unsupported | toolarge | empty
  const inputRef = useRef(null);

  const t = toolLocales[lang].file;

  useEffect(() => {
    setLang(detectLang());
  }, []);

  const readFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStatus('toolarge');
      return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    setStatus('reading');
    try {
      if (TEXT_EXTENSIONS.includes(ext)) {
        setText(await file.text());
        setStatus('done');
      } else if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setText(result.value);
        setStatus('done');
      // public/pdf.worker.min.mjs is a hand-copied snapshot of this exact
      // pdfjs-dist version (see package.json) -- pdf.js throws if the API
      // and worker versions don't match exactly. Re-copy the worker file
      // from node_modules/pdfjs-dist/build/ any time this dependency's
      // version changes.
      } else if (ext === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item) => item.str).join(' '));
        }
        const extracted = pages.join('\n\n').trim();
        if (extracted) {
          setText(extracted);
          setStatus('done');
        } else {
          setText('');
          setStatus('empty');
        }
      } else {
        setStatus('unsupported');
      }
    } catch (err) {
      console.warn('file read failed', err);
      setStatus('error');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    readFile(e.dataTransfer?.files?.[0]);
  };

  const sendToText = () => {
    if (!text.trim()) return;
    safeSet('session', 'lesstoken.transferText', text);
    router.push('/text');
  };

  const download = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lesstoken.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <>
      <Head>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDescription} />
      </Head>
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <Header lang={lang} active="file" />
          <ToolNav lang={lang} active="file" />
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>{t.title}</h1>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            {/* Tailwind preflight makes img display:block, so textAlign alone
                will not centre it - the auto margins do. */}
            <img src="/mark.svg" alt="LessToken" style={{ width: '60px', height: '60px', margin: '0 auto' }} />
          </div>
          <p style={{ fontSize: '13px', color: '#059669', marginBottom: '16px' }}>{t.privacyNote}</p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            style={{ border: '2px dashed #9ca3af', borderRadius: '12px', background: 'white', padding: '28px', textAlign: 'center', marginBottom: '16px' }}
          >
            <img src="/mark-sm.svg" alt="LessToken" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
            <button type="button" onClick={() => inputRef.current?.click()} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              {t.pick}
            </button>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '10px' }}>{t.drop}</p>
            <input ref={inputRef} type="file" accept=".txt,.md,.docx,.csv,.pdf" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
            {status === 'reading' && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>{t.reading}</p>}
            {status === 'unsupported' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.unsupported}</p>}
            {status === 'error' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.readError}</p>}
            {status === 'toolarge' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.tooLarge}</p>}
            {status === 'empty' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.pdfEmpty}</p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/mark-sm.svg" alt="LessToken" style={{ width: '32px', height: '32px' }} />
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{t.textLabel}</label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.empty}
            rows={14}
            style={{ width: '100%', marginTop: '6px', marginBottom: '12px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontFamily: 'inherit', background: 'white' }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={sendToText} disabled={!text.trim()} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: !text.trim() ? 0.6 : 1 }}>
              {t.toText}
            </button>
            <button type="button" onClick={download} disabled={!text.trim()} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontWeight: 600, opacity: !text.trim() ? 0.6 : 1 }}>
              {t.download}
            </button>
            <button type="button" onClick={() => { setText(''); setStatus('idle'); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              {t.clear}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
