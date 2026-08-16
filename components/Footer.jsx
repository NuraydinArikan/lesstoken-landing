import React from 'react';

// Footer locale content
const footerLocales = {
  en: {
    tagline: "Optimize AI token usage",
    product: "Product",
    resources: "Resources",
    legal: "Legal",
    textTool: "Text",
    imageTool: "Image",
    fileTool: "File",
    features: "Features",
    pricingLink: "Pricing",
    downloadLink: "Download",
    docs: "Documentation",
    github: "GitHub",
    blog: "Blog",
    privacy: "Privacy",
    terms: "Terms",
    license: "License",
    copyright: "© 2026 LessToken. All rights reserved. Made with care for budget-conscious developers."
  },
  tr: {
    tagline: "AI token kullanımını optimize edin",
    product: "Ürün",
    resources: "Kaynaklar",
    legal: "Yasal",
    textTool: "Metin",
    imageTool: "Görsel",
    fileTool: "Dosya",
    features: "Özellikler",
    pricingLink: "Fiyatlandırma",
    downloadLink: "İndir",
    docs: "Dokümantasyon",
    github: "GitHub",
    blog: "Blog",
    privacy: "Gizlilik",
    terms: "Şartlar",
    license: "Lisans",
    copyright: "© 2026 LessToken. Tüm hakları saklıdır. Bütçe bilinci olan geliştiriciler için sevgiyle yapılmıştır."
  }
};

export default function Footer({ lang = 'tr' }) {
  const i18n = footerLocales[lang] || footerLocales.tr;

  return (
    <footer style={{
      background: '#f9fafb',
      borderTop: '1px solid #e5e7eb',
      padding: '40px 20px',
      marginTop: '60px'
    }}>
      {/* Mark + LessToken label */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <img src="/mark-sm.svg" alt="LessToken" style={{ width: '32px', height: '32px' }} />
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>LessToken</span>
      </div>

      {/* Footer content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '32px'
        }}>
          {/* Tagline section */}
          <div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '0'
            }}>
              {i18n.tagline}
            </p>
          </div>

          {/* Product section */}
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              {i18n.product}
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '12px' }}>
                <a href="/text" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {i18n.textTool}
                </a>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <a href="/image" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {i18n.imageTool}
                </a>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <a href="/file" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {i18n.fileTool}
                </a>
              </li>
              <li>
                <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {i18n.features}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources section */}
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              {i18n.resources}
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '12px' }}>
                <a href="/guide" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {i18n.docs}
                </a>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <a href="https://github.com/LessTokenApp/LessTokenDesktop" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {i18n.github}
                </a>
              </li>
              <li>
                <a href="/support" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {lang === 'tr' ? 'İletişim' : 'Contact'}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal section */}
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              {i18n.legal}
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '12px' }}>
                <a href="mailto:info@lesstoken.app" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  {lang === 'tr' ? 'E-posta' : 'Email'}
                </a>
              </li>
              <li>
                <a href="https://github.com/LessTokenApp" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '24px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          {i18n.copyright}
        </div>
      </div>
    </footer>
  );
}
