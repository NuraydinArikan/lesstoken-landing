import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Optimize() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [provider, setProvider] = useState('openai');
  const [style, setStyle] = useState('general');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      router.push('/app/auth');
      return;
    }
    setToken(authToken);
  }, [router]);

  const handleOptimize = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOutputText('');
    setStats(null);

    try {
      const response = await fetch('/api/v1/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: inputText,
          provider: provider,
          style: style
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Optimizasyon başarısız');
        return;
      }

      setOutputText(data.result);
      setStats(data.stats);
    } catch (err) {
      setError('Bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText);
  };

  return (
    <>
      <Head>
        <title>Optimize Et - Less Token</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
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
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>Metni Optimize Et</h1>
            <div style={{ width: '100px' }}></div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
          <form onSubmit={handleOptimize} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Left Column: Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Settings */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Ayarlar
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                    AI Sağlayıcı
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="ollama">Ollama (Yerel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                    Tarz
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="general">Genel</option>
                    <option value="technical">Teknik</option>
                    <option value="marketing">Pazarlama</option>
                    <option value="academic">Akademik</option>
                  </select>
                </div>
              </div>

              {/* Input Text */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                flex: 1
              }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Metni Yapıştırın
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Optimize etmek istediğiniz metni buraya yapıştırın..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '300px',
                    resize: 'vertical'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Kelime Sayısı: {inputText.split(/\s+/).filter(w => w).length}
                </p>
              </div>
            </div>

            {/* Right Column: Output */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Error Message */}
              {error && (
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Stats */}
              {stats && (
                <div style={{
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #6ee7b7'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#065f46' }}>
                    ✓ Optimizasyon Sonuçları
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Azalış</p>
                      <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                        {stats.reduction}%
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Tasarruf</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                        {(stats.inputTokens - stats.outputTokens).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Output Text */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                flex: 1
              }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Optimize Edilmiş Metin
                </label>
                <textarea
                  value={outputText}
                  readOnly
                  placeholder="Sonuçlar burada görüntülenecektir..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '300px',
                    resize: 'vertical',
                    background: '#f9fafb'
                  }}
                />
                {outputText && (
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    style={{
                      marginTop: '8px',
                      padding: '8px 16px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    📋 Kopyala
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button (Full Width) */}
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              style={{
                gridColumn: '1 / -1',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Optimize Ediliyor...' : '⚡ Metni Optimize Et'}
            </button>
          </form>
        </main>
      </div>
    </>
  );
}
