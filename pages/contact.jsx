import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import { apiUrl } from '../lib/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(apiUrl('/api/v1/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitted(false), 3000);
      } else {
        alert('Hata: ' + (data.error || 'Mesaj gönderilemedi'));
      }
    } catch (error) {
      alert('Bağlantı hatası: ' + error.message);
    }
  };

  return (
    <>
      <Head>
        <title>İletişim - LessToken</title>
        <meta name="description" content="LessToken ile iletişime geçin" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Header />

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '60px 20px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '12px' }}>İletişime Geçin</h1>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>Sorularınız veya önerileriniz varsa, bize yazın.</p>
            <div style={{ marginBottom: '24px', textAlign: 'center', marginTop: '24px' }}>
              <img src="/mark.svg" alt="LessToken" style={{ width: '60px', height: '60px', margin: '0 auto' }} />
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '60px' }}>
            {/* Email */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>E-posta</h3>
              <a href="mailto:info@lesstoken.app" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '16px' }}>
                info@lesstoken.app
              </a>
            </div>

            {/* GitHub */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>GitHub</h3>
              <a href="https://github.com/LessTokenApp/LessTokenDesktop" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '16px' }}>
                GitHub Repository
              </a>
            </div>

            {/* Twitter */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>Twitter</h3>
              <a href="https://twitter.com/NuraydinArikan" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '16px' }}>
                @NuraydinArikan
              </a>
            </div>
          </div>

          {/* Mark before Contact Form */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <img src="/mark-sm.svg" alt="LessToken" style={{ width: '32px', height: '32px', margin: '0 auto' }} />
          </div>

          {/* Contact Form */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>Mesaj Gönder</h2>

            {submitted && (
              <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                ✓ Mesajınız başarıyla gönderildi! En kısa sürede geri dönüş yapılacaktır.
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Adınız
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Adınızı giriniz"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  E-posta Adresiniz
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Konu
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Mesajınızın konusu"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Mesaj
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Mesajınızı yazınız..."
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Gönder
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
