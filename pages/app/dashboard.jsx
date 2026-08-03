import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiUrl } from '../../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/app/auth');
      return;
    }

    setUser(JSON.parse(userData));
    loadStats(token);
  }, [router]);

  const loadStats = async (token) => {
    try {
      const response = await fetch(apiUrl('/api/v1/history?limit=1'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    router.push('/app/auth');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - LessToken</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
          color: 'white',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/mark-sm.svg" alt="LessToken" style={{ width: '40px', height: '40px' }} />
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>LessToken</h1>
                <p style={{ fontSize: '12px', opacity: 0.9, margin: '0' }}>AI Token Optimizer</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>{user?.email}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <StatCard title="Toplam Optimizasyon" value={stats?.totalCount || 0} icon="⚡" />
            <StatCard title="Ort. Token Azalması" value={`${stats?.avgReduction || 0}%`} icon="📉" />
            <StatCard title="Toplam Girdi Token" value={(stats?.totalInput || 0).toLocaleString()} icon="📊" />
            <StatCard title="Toplam Tasarruf" value={(stats?.totalSaved || 0).toLocaleString()} icon="💰" />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            <button
              onClick={() => router.push('/app/optimize')}
              style={{
                background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ⚡ Yeni Optimizasyon
            </button>
            <button
              onClick={() => router.push('/app/history')}
              style={{
                background: 'white',
                color: '#0369a1',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #0369a1',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              📊 Geçmişi Görüntüle
            </button>
            <button
              onClick={() => router.push('/app/settings')}
              style={{
                background: 'white',
                color: '#666',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ⚙️ Ayarlar
            </button>
          </div>

          {/* Welcome Message */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#1f2937' }}>
              Hoş Geldiniz, {user?.email?.split('@')[0]}! 👋
            </h2>
            <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '16px' }}>
              LessToken, yapay zeka API maliyetlerini azaltmaya yardımcı olan akıllı bir araçtır.
              Metinlerinizi optimize ederek token kullanımını %99'a kadar azaltabilirsiniz.
            </p>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              🚀 <strong>Başlamak için:</strong> "Yeni Optimizasyon" butonuna tıklayın ve metninizi yapıştırın.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
        {title}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0369a1', margin: '0' }}>
        {value}
      </p>
    </div>
  );
}
