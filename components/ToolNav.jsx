import React from 'react';
import { toolLocales } from '../lib/toolI18n';

const LINKS = [
  { key: 'text', href: '/text' },
  { key: 'image', href: '/image' },
  { key: 'file', href: '/file' },
];

export default function ToolNav({ lang = 'tr', active }) {
  const t = toolLocales[lang].nav;
  return (
    <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
      <a href="/" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none', marginRight: '8px' }}>
        ← {t.home}
      </a>
      {LINKS.map(({ key, href }) => (
        <a
          key={key}
          href={href}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            background: active === key ? '#2563eb' : '#e5e7eb',
            color: active === key ? 'white' : '#374151',
          }}
        >
          {t[key]}
        </a>
      ))}
    </nav>
  );
}
