import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { apiUrl } from '../../lib/api';

export default function History() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      router.push('/app/auth');
      return;
    }
    setToken(authToken);
    loadHistory(authToken);
  }, [router]);

  const loadHistory = async (authToken) => {
    try {
      const response = await fetch(apiUrl('/api/v1/history?limit=50'), {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Tüm geçmişi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(apiUrl('/api/v1/history'), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setHistory([]);
        setStats(null);
      }
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Geçmiş - LessToken</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Header />

        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
          color: 'white',
          padding: '20px'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/app/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Panoya Dön
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/mark-sm.svg" alt="LessToken" style={{ width: '40px', height: '40px' }} />
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>Optimizasyon Geçmişi</h1>
            </div>
            <div style={{ width: '100px' }}></div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
          {/* Stats Grid */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <StatCard title="Toplam Optimizasyon" value={stats.totalCount} icon="⚡" />
              <StatCard title="Ort. Azalış" value={`${stats.avgReduction}%`} icon="📉" />
              <StatCard title="Toplam Girdi" value={stats.totalInput.toLocaleString()} icon="📊" />
              <StatCard title="Tasarruf" value={stats.totalSaved.toLocaleString()} icon="💰" />
            </div>
          )}

          {/* Clear Button */}
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '20px'
              }}
            >
              🗑️ Geçmişi Temizle
            </button>
          )}

          {/* History List */}
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Yükleniyor...</p>
          ) : history.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '12px' }}>
                Henüz optimizasyon geçmişi yok.
              </p>
              <button
                onClick={() => router.push('/app/optimize')}
                style={{
                  background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                İlk Optimizasyonu Yap
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '16px',
                    alignItems: 'start'
                  }}
                >
                  {/* Content */}
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {item.provider}
                      </span>
                      <span style={{
                        background: '#e0e7ff',
                        color: '#3730a3',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {item.style}
                      </span>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px 0' }}>
                        <strong>Girdi:</strong> {item.input}...
                      </p>
                      <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>
                        <strong>Çıktı:</strong> {item.output}...
                      </p>
                    </div>

                    <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>
                      {new Date(item.timestamp).toLocaleDateString('tr-TR')} {new Date(item.timestamp).toLocaleTimeString('tr-TR')}
                    </p>
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '0 0 8px 0' }}>
                      {item.reduction}%
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>
                      {item.inputTokens} → {item.outputTokens}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
