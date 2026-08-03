import '../styles/globals.css'
import { useEffect, useState } from 'react';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }) {
  const [lang, setLang] = useState('tr');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLang = localStorage.getItem('lang') || 'tr';
    setLang(savedLang);
  }, []);

  return (
    <div suppressHydrationWarning>
      <Component {...pageProps} />
      <Footer lang={lang} />
    </div>
  )
}
