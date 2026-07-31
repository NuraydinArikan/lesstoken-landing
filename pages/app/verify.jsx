import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiUrl } from '../../lib/api';

export default function Verify() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('checking'); // checking | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setStatus('error');
      setErrorMessage('Doğrulama bağlantısı eksik.');
      return;
    }

    fetch(apiUrl(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          setStatus('error');
          setErrorMessage(data.error || 'Doğrulama başarısız oldu.');
          return;
        }
        // No session is stored here: the endpoint deliberately issues no
        // token, because this link arrives by email and gets pre-fetched by
        // security scanners. The user logs in normally from here.
        setStatus('success');
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Bağlantı hatası.');
      });
  }, [router.isReady, token]);

  const handleResend = async (e) => {
    e.preventDefault();
    await fetch(apiUrl('/api/v1/auth/resend-verification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resendEmail }),
    });
    setResendSent(true);
  };

  return (
    <>
      <Head>
        <title>E-posta Doğrulama - LessToken</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          {status === 'checking' && <p>Doğrulanıyor...</p>}

          {status === 'success' && (
            <>
              <p style={{ color: '#166534', fontWeight: 600, marginBottom: '20px' }}>
                E-postanız doğrulandı. Artık giriş yapabilirsiniz.
              </p>
              <a
                href="/app/auth"
                style={{
                  display: 'block',
                  background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Giriş Yap
              </a>
            </>
          )}

          {status === 'error' && (
            <>
              <p style={{ color: '#991b1b', marginBottom: '20px' }}>{errorMessage}</p>
              {!resendSent ? (
                <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email"
                    required
                    placeholder="E-posta adresiniz"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                      color: 'white',
                      padding: '12px',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Yeni Doğrulama Bağlantısı Gönder
                  </button>
                </form>
              ) : (
                <p>Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderildi.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
