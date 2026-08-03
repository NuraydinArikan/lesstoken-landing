// components/Header.jsx
import React from 'react';

export default function Header({ lang = 'tr', active }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/mark-sm.svg" alt="LessToken" style={{ width: '40px', height: '40px' }} />
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0B2B45' }}>LessToken</span>
      </div>
      {/* Existing nav links will go here */}
    </header>
  );
}
