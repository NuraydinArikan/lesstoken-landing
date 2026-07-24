import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AppHome() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/app/dashboard');
    } else {
      router.push('/app/auth');
    }
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
        <p style={{ fontSize: '18px' }}>Yükleniyor...</p>
      </div>
    </div>
  );
}
