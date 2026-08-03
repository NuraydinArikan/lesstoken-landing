import '../styles/globals.css'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import { detectLang } from '../lib/toolI18n';

export default function App({ Component, pageProps }) {
  const [lang, setLang] = useState('tr');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLang(detectLang());
  }, []);

  // Don't render global Footer on home page (it has its own footer) or authenticated app routes
  const showGlobalFooter = router.pathname !== '/' && !router.pathname.startsWith('/app');

  return (
    <div suppressHydrationWarning>
      <Component {...pageProps} />
      {showGlobalFooter && <Footer lang={lang} />}
    </div>
  )
}
