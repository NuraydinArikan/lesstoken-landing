import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import ToolNav from '../components/ToolNav';
import AiSettings from '../components/AiSettings';
import { toolLocales, detectLang } from '../lib/toolI18n';
import { OPERATIONS, runOperation } from '../lib/aiClient.mjs';
import { localClean } from '../lib/localText.mjs';

export default function TextToolPage() {
  const [lang, setLang] = useState('tr');
  const [settings, setSettings] = useState({ provider: 'openai', apiKey: '' });
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [note, setNote] = useState('');
  const [operationKey, setOperationKey] = useState('clean');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = toolLocales[lang].text;
  const errors = toolLocales[lang].errors;

  useEffect(() => {
    setLang(detectLang());
    const transferred = sessionStorage.getItem('lesstoken.transferText');
    if (transferred) {
      setInput(transferred);
      sessionStorage.removeItem('lesstoken.transferText');
    }
  }, []);

  const run = async (key) => {
    const source = input.trim();
    setCopied(false);
    setNote('');
    if (!source) {
      setOutput('');
      setNote(t.emptyInput);
      return;
    }
    if (!settings.apiKey) {
      if (key === 'clean') {
        setOutput(localClean(source));
        setNote(t.localNote);
      } else {
        setOutput('');
        setNote(t.needKey);
      }
      return;
    }
    setBusy(true);
    setOutput('');
    try {
      const result = await runOperation({
        provider: settings.provider,
        apiKey: settings.apiKey,
        operationKey: key,
        text: source,
      });
      setOutput(result);
    } catch (err) {
      setNote(errors[err.code] || errors.provider);
    } finally {
      setBusy(false);
    }
  };

  const copyResult = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  const opLabel = (op) => (lang === 'tr' ? op.tr : op.en);

  return (
    <>
      <Head>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDescription} />
      </Head>
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <ToolNav lang={lang} active="text" />
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>{t.title}</h1>
          <AiSettings lang={lang} onChange={setSettings} />

          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{t.inputLabel}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.inputPlaceholder}
            rows={8}
            style={{ width: '100%', marginTop: '6px', marginBottom: '14px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', color: '#374151' }}>
              {t.operation}{' '}
              <select value={operationKey} onChange={(e) => setOperationKey(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                {OPERATIONS.map((op) => (
                  <option key={op.key} value={op.key}>{opLabel(op)}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy} onClick={() => run(operationKey)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? t.working : t.run}
            </button>
            <button type="button" onClick={() => { setInput(''); setOutput(''); setNote(''); setCopied(false); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              {t.clear}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {OPERATIONS.map((op) => (
              <button key={op.key} type="button" disabled={busy} onClick={() => { setOperationKey(op.key); run(op.key); }} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer' }}>
                {opLabel(op)}
              </button>
            ))}
          </div>

          {note && <p style={{ fontSize: '13px', color: '#b45309', marginBottom: '10px' }}>{note}</p>}

          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{t.resultLabel}</label>
          <textarea
            value={output}
            readOnly
            rows={8}
            style={{ width: '100%', marginTop: '6px', marginBottom: '12px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontFamily: 'inherit', background: 'white' }}
          />
          <button type="button" onClick={copyResult} disabled={!output} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontWeight: 600 }}>
            {copied ? `✓ ${t.copied}` : t.copy}
          </button>
        </div>
      </div>
    </>
  );
}
