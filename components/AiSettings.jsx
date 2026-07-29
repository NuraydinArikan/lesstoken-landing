import React, { useEffect, useState } from 'react';
import { toolLocales } from '../lib/toolI18n';
import { safeGet, safeSet } from '../lib/safeStorage';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
];

export default function AiSettings({ lang = 'tr', onChange }) {
  const t = toolLocales[lang].settings;
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const storedProvider = safeGet('local', 'lesstoken.provider') || 'openai';
    const storedKey = safeGet('local', 'lesstoken.apiKey') || '';
    setProvider(storedProvider);
    setApiKey(storedKey);
    onChange?.({ provider: storedProvider, apiKey: storedKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (nextProvider, nextKey) => {
    setProvider(nextProvider);
    setApiKey(nextKey);
    safeSet('local', 'lesstoken.provider', nextProvider);
    safeSet('local', 'lesstoken.apiKey', nextKey);
    onChange?.({ provider: nextProvider, apiKey: nextKey });
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
      <p style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937', margin: '0 0 10px 0' }}>{t.title}</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '13px', color: '#374151' }}>
          {t.provider}{' '}
          <select value={provider} onChange={(e) => update(e.target.value, apiKey)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '13px', color: '#374151', flex: 1, minWidth: '220px' }}>
          {t.apiKey}{' '}
          <input
            type={visible ? 'text' : 'password'}
            value={apiKey}
            placeholder={t.placeholder}
            onChange={(e) => update(provider, e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', width: '60%' }}
          />
        </label>
        <button type="button" onClick={() => setVisible(!visible)} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}>
          {visible ? t.hide : t.show}
        </button>
        <button type="button" onClick={() => update(provider, '')} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}>
          {t.clear}
        </button>
      </div>
      <p style={{ fontSize: '12px', color: '#059669', margin: '10px 0 0 0' }}>{t.note}</p>
    </div>
  );
}
