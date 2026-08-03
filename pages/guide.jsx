import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';

export default function Guide() {
  const [activeTab, setActiveTab] = useState('desktop');

  const guides = {
    desktop: {
      title: 'Desktop Uygulaması Kullanım Kılavuzu',
      icon: '💻',
      steps: [
        {
          number: 1,
          title: 'Uygulamayı İndirin',
          description: 'Ana sayfadan "İndir" butonuna tıklayarak LessToken kurulum dosyasını indirin.',
          image: '📥'
        },
        {
          number: 2,
          title: 'Yükleyin',
          description: 'İndirilen lesstoken-setup.exe dosyasını çalıştırın ve kurulum sihirbazını takip edin.',
          image: '⚙️'
        },
        {
          number: 3,
          title: 'Uygulamayı Açın',
          description: 'Kurulumdan sonra başlat menüsünden veya masaüstü kısayolundan LessToken\'ı açın.',
          image: '🚀'
        },
        {
          number: 4,
          title: 'API Anahtarı Ekleyin',
          description: 'Ayarlar menüsünde tercih ettiğiniz AI sağlayıcısı (OpenAI, Claude, vb.) için API anahtarını ekleyin.',
          image: '🔑'
        },
        {
          number: 5,
          title: 'Metni Yapıştırın',
          description: 'Optimize etmek istediğiniz metni ana pencerye kopyala-yapıştır yapın.',
          image: '📝'
        },
        {
          number: 6,
          title: 'Optimize Edin',
          description: '"Optimize" butonuna tıklayın ve sonuçları anında görün. Token azalış yüzdesini kontrol edin.',
          image: '⚡'
        }
      ]
    },
    extension: {
      title: 'Tarayıcı Eklentisi Kullanım Kılavuzu',
      icon: '🧩',
      steps: [
        {
          number: 1,
          title: 'Eklentiyi Yükleyin',
          description: 'Chrome Web Store\'dan LessToken eklentisini bulun ve "Chrome\'a Ekle" butonuna tıklayın.',
          image: '🌐'
        },
        {
          number: 2,
          title: 'Çalıştırmayı Onayla',
          description: 'Eklentinin gerekli izinleri kabul edin ve tarayıcınıza eklenmesine izin verin.',
          image: '✅'
        },
        {
          number: 3,
          title: 'Ayarları Yapılandır',
          description: 'Eklenti simgesine tıklayın, ⚙️ butonuna basın ve API anahtarınızı girin.',
          image: '⚙️'
        },
        {
          number: 4,
          title: 'Sağlayıcı Seçin',
          description: 'Popup penceresinde kullanmak istediğiniz AI sağlayıcısını (OpenAI, Claude, Gemini) seçin.',
          image: '🤖'
        },
        {
          number: 5,
          title: 'Metni Yapıştırın veya Yazın',
          description: 'Eklentinin popup penceresine metni kopyala-yapıştır yapın veya doğrudan yazın.',
          image: '✍️'
        },
        {
          number: 6,
          title: 'Optimize Edin',
          description: '"Optimize" butonuna basın. Sonuçlar pop-up pencerede görüntülenecektir.',
          image: '⚡'
        },
        {
          number: 7,
          title: 'Geçmişi Görüntüleyin',
          description: '📊 butonuna tıklayarak tüm optimizasyonlarınızın geçmişini ve istatistiklerini görün.',
          image: '📊'
        }
      ]
    },
    web: {
      title: 'Web Uygulaması Kullanım Kılavuzu',
      icon: '🌐',
      steps: [
        {
          number: 1,
          title: 'lesstoken.app/app\'ye Gidin',
          description: 'Web tarayıcınızda lesstoken.app/app adresini açın.',
          image: '🌐'
        },
        {
          number: 2,
          title: 'Hesap Oluşturun',
          description: 'E-posta adresiniz ve güvenli bir şifre ile yeni hesap oluşturun. Hesaplar tamamen ücretsizdir.',
          image: '👤'
        },
        {
          number: 3,
          title: 'Giriş Yapın',
          description: 'E-posta ve şifreniz ile sisteme giriş yapın.',
          image: '🔐'
        },
        {
          number: 4,
          title: 'Ayarlar Bölümüne Gidin',
          description: 'Sağ üstteki menüden "Ayarlar"a tıklayın ve tercih ettiğiniz AI sağlayıcısını seçin.',
          image: '⚙️'
        },
        {
          number: 5,
          title: 'Metni Yapıştırın',
          description: 'Ana paneldeki metin alanına optimize etmek istediğiniz metni kopyala-yapıştır yapın.',
          image: '📄'
        },
        {
          number: 6,
          title: 'Tarzı Seçin',
          description: 'Optimizasyon tarzını seçin (Genel, Teknik, Pazarlama, Akademik).',
          image: '🎨'
        },
        {
          number: 7,
          title: 'Optimize Edin',
          description: '"Optimize" butonuna tıklayın ve sonuçları görin. Token azalış yüzdesini kontrol edin.',
          image: '⚡'
        },
        {
          number: 8,
          title: 'Geçmişi Yönetin',
          description: '"Geçmiş" sekmesinde tüm optimizasyonlarınızı, istatistikleri ve tasarruflarınızı görün.',
          image: '📈'
        }
      ]
    }
  };

  const providers = [
    {
      name: 'OpenAI GPT-4',
      description: 'En güçlü model. Yüksek kalite optimizasyonlar.',
      cost: '$0.01-0.03 / 1K token',
      speed: 'Hızlı',
      setup: 'https://platform.openai.com/api-keys'
    },
    {
      name: 'Claude (Anthropic)',
      description: 'Yüksek kaliteli, az hatası olan optimizasyonlar.',
      cost: '$0.015-0.06 / 1K token',
      speed: 'Orta',
      setup: 'https://console.anthropic.com/account/keys'
    },
    {
      name: 'Google Gemini',
      description: 'Hızlı ve güvenilir. Ücretsiz katman mevcut.',
      cost: 'Ücretsiz katman / $0.0001+',
      speed: 'Çok Hızlı',
      setup: 'https://ai.google.dev/tutorials/setup'
    },
    {
      name: 'Ollama (Yerel)',
      description: 'Bilgisayarınızda çalışır. Gizlilik odaklı.',
      cost: 'Ücretsiz',
      speed: 'Değişken',
      setup: 'https://ollama.ai'
    }
  ];

  const styles = {
    tab: {
      padding: '12px 24px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      color: '#6b7280',
      borderBottom: '2px solid transparent',
      transition: 'all 0.2s'
    },
    activeTab: {
      color: '#2563eb',
      borderBottomColor: '#2563eb'
    }
  };

  const currentGuide = guides[activeTab];

  return (
    <>
      <Head>
        <title>Kullanım Kılavuzu - LessToken</title>
        <meta name="description" content="LessToken nasıl kullanılır? Adım adım kılavuz." />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Header />

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '12px' }}>Kullanım Kılavuzu</h1>
          <p style={{ fontSize: '18px', opacity: 0.9 }}>LessToken\'ı adım adım öğrenin</p>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 20px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '40px', borderBottom: '1px solid #e5e7eb' }}>
            {Object.entries(guides).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  ...styles.tab,
                  ...(activeTab === key ? styles.activeTab : {})
                }}
              >
                <span style={{ marginRight: '8px' }}>{value.icon}</span>
                {value.title.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Guide Content */}
          <div style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '40px', color: '#1f2937' }}>
              {currentGuide.icon} {currentGuide.title}
            </h2>

            {/* Steps */}
            <div style={{ display: 'grid', gap: '30px' }}>
              {currentGuide.steps.map((step) => (
                <div
                  key={step.number}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr',
                    gap: '24px',
                    alignItems: 'start'
                  }}
                >
                  {/* Step Icon/Number */}
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '32px',
                      fontWeight: 'bold'
                    }}
                  >
                    {step.image}
                  </div>

                  {/* Step Content */}
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                      Adım {step.number}: {step.title}
                    </h3>
                    <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Providers Section */}
          <div style={{ marginBottom: '60px', paddingTop: '60px', borderTop: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '40px', color: '#1f2937' }}>
              🤖 AI Sağlayıcıları Karşılaştırması
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {providers.map((provider) => (
                <div
                  key={provider.name}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                    {provider.name}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', lineHeight: '1.6' }}>
                    {provider.description}
                  </p>

                  <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                    <p style={{ marginBottom: '8px', color: '#374151' }}>
                      <strong>Maliyet:</strong> {provider.cost}
                    </p>
                    <p style={{ color: '#374151' }}>
                      <strong>Hız:</strong> {provider.speed}
                    </p>
                  </div>

                  <a
                    href={provider.setup}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: '#3b82f6',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Setup
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Tips Section */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#1e40af' }}>
              💡 Faydalı İpuçları
            </h3>
            <ul style={{ listStyle: 'none', padding: '0', color: '#1e40af', lineHeight: '1.8' }}>
              <li style={{ marginBottom: '12px' }}>
                ✓ <strong>Token kullanımı azaltmak için:</strong> Metni kısa ve özlü tutun
              </li>
              <li style={{ marginBottom: '12px' }}>
                ✓ <strong>En iyi sonuçlar için:</strong> Doğru tarzı (Genel, Teknik, vb.) seçin
              </li>
              <li style={{ marginBottom: '12px' }}>
                ✓ <strong>Farklı sağlayıcıları deneyin:</strong> Hangi sonuçların size en iyi geldiğini görmek için
              </li>
              <li style={{ marginBottom: '12px' }}>
                ✓ <strong>Geçmişinizi takip edin:</strong> İstatistiklerde ne kadar tasarruf ettiğinizi görün
              </li>
              <li>
                ✓ <strong>Özel metinler için:</strong> Pazarlama ya da akademik yazılar için özel tarzları kullanın
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
