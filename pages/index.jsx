import React, { useEffect, useState } from 'react';
import { Download, Zap, Cloud, BarChart3, Image as ImageIcon, FileText } from 'lucide-react';
import SmartScreenDemo from '../components/SmartScreenDemo';

// GitHub resolves /releases/latest/download/ to the newest non-prerelease
// asset, so this survives future releases without an edit here.
const DOWNLOAD_URL =
  'https://github.com/NuraydinArikan/LessTokenDesktop/releases/latest/download/lesstoken-setup.exe';

const localesData = {
  tr: {
    nav: { logo: "Less Token", download: "İndir" },
    hero: { title: "Yapay Zeka Kotalarınız Hemen Tükenmesin", subtitle: "Less Token ile AI Token Kullanımınızı Azaltın", description: "Görsel ve belge boyutlarını çok hızlı küçültün. Yüzde 99'a kadar token tüketimini azaltın. Yapay zeka API maliyetlerinden tasarruf edin.", downloadBtn: "Şimdi İndir", learnBtn: "Daha Fazla Bilgi" },
    stats: {
      savingsValue: "Yüzde 99",
      savings: "Token Tasarrufu",
      reductionValue: "Yüzde 96",
      reduction: "Boyut Azaltma",
      providers: "Çok Sayıda Yapay Zeka Aracından Yararlanma İmkanı",
      pricingValue: "Ücretsiz",
      pricing: "Açık Kaynak"
    },
    features: {
      title: "Güçlü Özellikler",
      imageOpt: { title: "Görüntü Optimizasyonu", desc: "Görselleri yeniden boyutlandır, sıkıştır ve özet metne dönüştür. 4000×2500px → 5KB OCR ile." },
      docProcess: { title: "Belge İşleme", desc: "PDF, Word, CSV dosyalarını özet metne dönüştür. Jeton tüketimini tahmin et." },
      multiProvider: { title: "Akıllı Yapay Zeka Seçimi", desc: "ChatGPT, Claude, Gemini, Ollama. En ucuz veya en hızlı yapay zekayı otomatik seç." },
      realtime: { title: "Gerçek Zamanlı İşlem", desc: "Panoyu izle, içeriği otomatik algıla, kısayollarla anında işle." },
      costTracking: { title: "Maliyet Takibi", desc: "Kullanılan jetonları (Token), sorgu başına maliyeti, toplam harcamayı tam tarih araması ile takip et." },
      easySetup: { title: "Kolay Kurulum", desc: "Tek tıkla bilgisayarına yükle. Ayar gerekmez. Windows'ta çalışır." }
    },
    results: {
      title: "Gerçek Sonuçlar",
      screenshot: { title: "4K Ekran Görüntüsü Optimizasyonu", before: "Öncesi", after: "Sonrası", savings: "%99 Tasarruf" },
      pdf: { title: "50 Sayfalık PDF Çıkarma", before: "Öncesi", after: "Sonrası", savings: "%95 Tasarruf" },
      comparison: { title: "Çok Sağlayıcı Karşılaştırması", before: "Öncesi", after: "Sonrası", savings: "%96 Tasarruf", detail: "Aynı sonuç, 24¢ tasarruf" }
    },
    pricing: { title: "Basit Fiyatlandırma", free: "Ücretsiz", desc: "Açık kaynak masaüstü uygulaması", features: ["✓ Görüntü ve PDF optimizasyonu", "✓ Çok sağlayıcı desteği", "✓ Gerçek zamanlı pano izleme", "✓ Tam tarih ve analitik", "✓ Windows masaüstü uygulaması"], btn: "Windows için İndir" },
    download: { title: "30 Saniyede Başla", step1: "Yükleyiciyi İndir", step1Desc: "lesstoken-setup.exe (58 MB)", step2: "Çalıştır ve Kur", step2Desc: "İleri, ileri, bitir'i tıkla", step3: "Optimize Etmeye Başla", step3Desc: "Metin/görsel kopyala → Sonuç al", btn: "Windows için İndir (v1.0.2)" },
    smartscreen: {
      title: "Windows bir uyarı gösterirse endişelenmeyin",
      body: "Kurulumu başlatırken Windows \"Kişisel bilgisayarınızı korudu\" ekranını gösterebilir. Bu bir virüs uyarısı değildir. Windows, yayıncısı ücretli bir sertifika satın almamış her uygulama için bu ekranı gösterir — biz de henüz almadık. Devam etmek için:",
      step1: "Ek bilgi",
      step2: "Yine de çalıştır",
      trust: "Merak ederseniz: Less Token açık kaynaktır, kurulumun içindeki her satırı kendiniz okuyabilirsiniz.",
      trustLink: "Kaynak kodu GitHub'da",
      demo: {
        dialogTitle: "Windows kişisel bilgisayarınızı korudu",
        dialogBody: "Microsoft Defender SmartScreen tanınmayan bir uygulamanın başlamasını engelledi.",
        more: "Ek bilgi",
        appLabel: "Uygulama:",
        publisherLabel: "Yayımcı:",
        publisherValue: "Bilinmeyen yayımcı",
        runAnyway: "Yine de çalıştır",
        dontRun: "Çalıştırma"
      }
    },
    faq: {
      title: "Sık Sorulan Sorular",
      items: [
        {
          q: "API anahtarı gerekli mi?",
          a: "Web uygulamasında hayır — hesap açıp doğrudan kullanmaya başlayabilirsiniz. Masaüstü uygulaması ve tarayıcı eklentisinde ise kendi API anahtarınızı girersiniz; bu sayede metniniz bizim sunucularımıza hiç uğramaz."
        },
        {
          q: "Verilerim gizli mi?",
          a: "Masaüstü uygulaması ve tarayıcı eklentisinde metniniz sunucularımıza gitmez: doğrudan seçtiğiniz yapay zeka sağlayıcısına gönderilir ve API anahtarınız yalnızca kendi cihazınızda saklanır. Web uygulamasında ise metniniz sunucumuzdan geçer ve geçmiş özelliğini sunabilmek için veritabanımızda saklanır. Hassas içerikler için masaüstü uygulamasını öneririz."
        },
        {
          q: "Hangi dosya türleri desteklenir?",
          a: "Masaüstü uygulaması görselleri küçültür (PNG, JPEG, WEBP) ve PDF, Word, CSV, JSON, Markdown ile düz metin dosyalarından metin çıkarır. Panoya düşen ekran görüntüsünü otomatik olarak küçültebilir. Web uygulaması ve tarayıcı eklentisi şu an yalnızca metin optimize eder."
        },
        {
          q: "Birden fazla AI sağlayıcı kullanabilir miyim?",
          a: "Evet. OpenAI, Claude ve Google Gemini arasında her optimizasyonda geçiş yapabilirsiniz. Masaüstü uygulaması ayrıca kendi bilgisayarınızda çalışan Ollama'yı destekler; bu durumda metniniz hiçbir buluta gitmez."
        },
        {
          q: "Hangi platformlarda çalışır?",
          a: "Masaüstü uygulaması Windows içindir. Web uygulaması güncel tarayıcıların hepsinde çalışır ve kurulum gerektirmez. Tarayıcı eklentisi Chrome ile Chromium tabanlı tarayıcılar (Edge, Brave) içindir."
        },
        {
          q: "Kurulumda Windows neden uyarı gösteriyor?",
          a: "Windows, yayıncısı ücretli bir kod imzalama sertifikası satın almamış her uygulama için \"Kişisel bilgisayarınızı korudu\" ekranını gösterir. Bu, dosyada bir sorun bulunduğu anlamına gelmez; yalnızca yayıncının Windows tarafından henüz tanınmadığını söyler. Kuruluma devam etmek için Ek bilgi bağlantısına, ardından Yine de çalıştır düğmesine tıklayın. Uygulama açık kaynak olduğu için kurulumun içine giren kodu GitHub'da inceleyebilirsiniz."
        }
      ]
    },
    cta: { title: "AI Maliyetlerinden %96'ya Kadar Tasarruf Edin", desc: "Bugün token'larınızı optimize etmeye başla. Sadece 30 saniye sürüyor.", btn: "Şimdi İndir" },
    footer: { tagline: "AI token kullanımını optimize edin", product: "Ürün", resources: "Kaynaklar", legal: "Yasal", features: "Özellikler", pricingLink: "Fiyatlandırma", downloadLink: "İndir", docs: "Dokümantasyon", github: "GitHub", blog: "Blog", privacy: "Gizlilik", terms: "Şartlar", license: "Lisans", copyright: "© 2026 Less Token. Tüm hakları saklıdır. Bütçe bilinci olan geliştiriciler için sevgiyle yapılmıştır." }
  },
  en: {
    nav: { logo: "Less Token", download: "Download" },
    hero: { title: "Don't Burn Through Your AI Quota", subtitle: "Cut your token usage with Less Token", description: "Reduce token consumption by up to 99%, slash AI API costs, and process images & documents instantly.", downloadBtn: "Download Now", learnBtn: "Learn More" },
    stats: {
      savingsValue: "99 percent",
      savings: "Token Savings",
      reductionValue: "96 percent",
      reduction: "Size Reduction",
      providers: "Your pick of several AI tools",
      pricingValue: "Free",
      pricing: "Open Source"
    },
    features: {
      title: "Powerful Features",
      imageOpt: { title: "Image Optimization", desc: "Resize, compress, and extract text from images. 4000×2500px → 5KB with OCR." },
      docProcess: { title: "Document Processing", desc: "Turn PDF, Word and CSV files into summarised text. Estimate token usage." },
      multiProvider: { title: "Smart AI Selection", desc: "ChatGPT, Claude, Gemini, Ollama. Automatically pick the cheapest or fastest AI." },
      realtime: { title: "Real-time Processing", desc: "Monitor clipboard, auto-detect content, process instantly with hotkeys." },
      costTracking: { title: "Cost Tracking", desc: "Track tokens used, cost per query and total spending, with full history search." },
      easySetup: { title: "Easy Setup", desc: "Install it on your computer in one click. No configuration needed. Works on Windows." }
    },
    results: {
      title: "Real Results",
      screenshot: { title: "4K Screenshot Optimization", before: "Before", after: "After", savings: "99% Savings" },
      pdf: { title: "50-Page PDF Extraction", before: "Before", after: "After", savings: "95% Savings" },
      comparison: { title: "Multi-Provider Comparison", before: "Before", after: "After", savings: "96% Savings", detail: "Same result, 24¢ saved" }
    },
    pricing: { title: "Simple Pricing", free: "Free", desc: "Open source desktop application", features: ["✓ Image & PDF optimization", "✓ Multi-provider support", "✓ Real-time clipboard monitoring", "✓ Full history & analytics", "✓ Windows desktop app"], btn: "Download for Windows" },
    download: { title: "Get Started in 30 Seconds", step1: "Download Installer", step1Desc: "lesstoken-setup.exe (58 MB)", step2: "Run & Install", step2Desc: "Click next, next, finish", step3: "Start Optimizing", step3Desc: "Copy text/images → Get results", btn: "Download for Windows (v1.0.2)" },
    smartscreen: {
      title: "If Windows shows a warning, don't worry",
      body: "When you start the installer, Windows may show its \"protected your PC\" screen. This is not a virus warning. Windows shows it for every app whose publisher has not bought a paid signing certificate — and we have not bought one yet. To continue:",
      step1: "More info",
      step2: "Run anyway",
      trust: "If you would rather check for yourself: Less Token is open source, so you can read every line that goes into the installer.",
      trustLink: "Source code on GitHub",
      demo: {
        dialogTitle: "Windows protected your PC",
        dialogBody: "Microsoft Defender SmartScreen prevented an unrecognised app from starting.",
        more: "More info",
        appLabel: "App:",
        publisherLabel: "Publisher:",
        publisherValue: "Unknown publisher",
        runAnyway: "Run anyway",
        dontRun: "Don't run"
      }
    },
    faq: {
      title: "FAQ",
      items: [
        {
          q: "Do I need an API key?",
          a: "Not for the web app — create an account and start using it. The desktop app and the browser extension use your own API key instead, which is what keeps your text from ever reaching our servers."
        },
        {
          q: "Is my data private?",
          a: "In the desktop app and the browser extension your text never reaches our servers: it goes straight to the AI provider you chose, and your API key stays on your own device. In the web app your text does pass through our server and is stored in our database so we can offer the history feature. For sensitive material we recommend the desktop app."
        },
        {
          q: "What file types are supported?",
          a: "The desktop app shrinks images (PNG, JPEG, WEBP) and extracts text from PDF, Word, CSV, JSON, Markdown and plain text files. It can also shrink a screenshot automatically as soon as it lands on your clipboard. The web app and the browser extension currently optimize text only."
        },
        {
          q: "Can I use multiple AI providers?",
          a: "Yes. You can switch between OpenAI, Claude and Google Gemini on every optimization. The desktop app also supports Ollama running on your own machine, in which case your text never leaves it."
        },
        {
          q: "Which platforms does it run on?",
          a: "The desktop app is for Windows. The web app runs in any current browser and needs no installation. The browser extension is for Chrome and Chromium-based browsers such as Edge and Brave."
        },
        {
          q: "Why does Windows warn me during installation?",
          a: "Windows shows its \"protected your PC\" screen for every app whose publisher has not bought a paid code signing certificate. It does not mean anything is wrong with the file - only that Windows does not recognise the publisher yet. To continue, click More info and then Run anyway. Since the app is open source, you can inspect exactly what goes into the installer on GitHub."
        }
      ]
    },
    cta: { title: "Save up to 96% on AI Costs", desc: "Start optimizing your tokens today. It only takes 30 seconds.", btn: "Download Now" },
    footer: { tagline: "Optimize AI token usage", product: "Product", resources: "Resources", legal: "Legal", features: "Features", pricingLink: "Pricing", downloadLink: "Download", docs: "Documentation", github: "GitHub", blog: "Blog", privacy: "Privacy", terms: "Terms", license: "License", copyright: "© 2026 Less Token. All rights reserved. Made with care for budget-conscious developers." }
  }
};

function HomeContent() {
  const [lang, setLang] = useState('tr');
  const [i18n, setI18n] = useState(localesData.tr);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedLang = localStorage.getItem('lang');
    let detectedLang = 'tr';

    if (savedLang) {
      detectedLang = savedLang;
    } else {
      const browserLang = navigator.language.split('-')[0];
      detectedLang = ['tr', 'en'].includes(browserLang) ? browserLang : 'tr';
      localStorage.setItem('lang', detectedLang);
    }

    setLang(detectedLang);
    setI18n(localesData[detectedLang]);
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    setI18n(localesData[newLang]);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur border-b border-slate-700/50 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {i18n?.nav?.logo}
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => changeLang('en')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  lang === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => changeLang('tr')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  lang === 'tr'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                TR
              </button>
            </div>
            <a
              href="#download"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition"
            >
              {i18n?.nav?.download}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {i18n?.hero?.title}
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-blue-200 mb-6">
            {i18n?.hero?.subtitle}
          </p>
          <p className="text-xl text-gray-300 mb-8">
            {i18n?.hero?.description}
          </p>
          <div className="flex gap-4 justify-center">
            <a href={DOWNLOAD_URL} className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold text-lg transition">
              {i18n?.hero?.downloadBtn}
            </a>
            <a href="#download" className="border border-blue-500 hover:bg-blue-500/10 px-8 py-3 rounded-lg font-semibold text-lg transition">
              {i18n?.hero?.learnBtn}
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-slate-700">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 items-start">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400 mb-2">{i18n?.stats?.savingsValue}</p>
            <p className="text-gray-400">{i18n?.stats?.savings}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400 mb-2">{i18n?.stats?.reductionValue}</p>
            <p className="text-gray-400">{i18n?.stats?.reduction}</p>
          </div>
          <div className="text-center">
            {/* No headline number here: the point is the choice, not a count. */}
            <p className="text-lg font-semibold text-blue-400 leading-snug">
              {i18n?.stats?.providers}
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400 mb-2">{i18n?.stats?.pricingValue}</p>
            <p className="text-gray-400">{i18n?.stats?.pricing}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">{i18n?.features?.title}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ImageIcon className="w-12 h-12" />}
              title={i18n?.features?.imageOpt?.title}
              description={i18n?.features?.imageOpt?.desc}
            />
            <FeatureCard
              icon={<FileText className="w-12 h-12" />}
              title={i18n?.features?.docProcess?.title}
              description={i18n?.features?.docProcess?.desc}
            />
            <FeatureCard
              icon={<Cloud className="w-12 h-12" />}
              title={i18n?.features?.multiProvider?.title}
              description={i18n?.features?.multiProvider?.desc}
            />
            <FeatureCard
              icon={<Zap className="w-12 h-12" />}
              title={i18n?.features?.realtime?.title}
              description={i18n?.features?.realtime?.desc}
            />
            <FeatureCard
              icon={<BarChart3 className="w-12 h-12" />}
              title={i18n?.features?.costTracking?.title}
              description={i18n?.features?.costTracking?.desc}
            />
            <FeatureCard
              icon={<Download className="w-12 h-12" />}
              title={i18n?.features?.easySetup?.title}
              description={i18n?.features?.easySetup?.desc}
            />
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">{i18n?.results?.title}</h2>

          <div className="space-y-8">
            <div className="bg-slate-700/30 border border-slate-600 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6">{i18n?.results?.screenshot?.title}</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <p className="text-sm text-gray-400 mb-2">{i18n?.results?.screenshot?.before}</p>
                  <p className="text-lg font-semibold">2.5 MB</p>
                  <p className="text-gray-300">50,000 tokens</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-3xl text-blue-400">→</div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">{i18n?.results?.screenshot?.after}</p>
                  <p className="text-lg font-semibold text-green-400">80 KB</p>
                  <p className="text-gray-300">500 tokens</p>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <p className="text-blue-400 font-semibold">{i18n?.results?.screenshot?.savings}</p>
              </div>
            </div>

            <div className="bg-slate-700/30 border border-slate-600 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6">{i18n?.results?.pdf?.title}</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <p className="text-sm text-gray-400 mb-2">{i18n?.results?.pdf?.before}</p>
                  <p className="text-lg font-semibold">40 MB</p>
                  <p className="text-gray-300">40,000 tokens</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-3xl text-blue-400">→</div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">{i18n?.results?.pdf?.after}</p>
                  <p className="text-lg font-semibold text-green-400">200 KB</p>
                  <p className="text-gray-300">2,000 tokens</p>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <p className="text-blue-400 font-semibold">{i18n?.results?.pdf?.savings}</p>
              </div>
            </div>

            <div className="bg-slate-700/30 border border-slate-600 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6">{i18n?.results?.comparison?.title}</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <p className="text-sm text-gray-400 mb-2">{i18n?.results?.comparison?.before}</p>
                  <p className="text-lg font-semibold">$0.250</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-3xl text-blue-400">→</div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">{i18n?.results?.comparison?.after}</p>
                  <p className="text-lg font-semibold text-green-400">$0.01</p>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <p className="text-blue-400 font-semibold">{i18n?.results?.comparison?.savings}</p>
                <p className="text-gray-400 text-sm">{i18n?.results?.comparison?.detail}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">{i18n?.pricing?.title}</h2>
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12">
            <p className="text-6xl font-bold mb-4">{i18n?.pricing?.free}</p>
            <p className="text-xl text-blue-100 mb-8">{i18n?.pricing?.desc}</p>
            <ul className="text-left text-lg space-y-3 text-blue-50 mb-8">
              {i18n?.pricing?.features?.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
            <a href={DOWNLOAD_URL} className="inline-block bg-white text-blue-600 font-bold px-8 py-3 rounded-lg hover:bg-blue-50 transition text-lg">
              {i18n?.pricing?.btn}
            </a>
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="py-20 px-6 border-t border-slate-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">{i18n?.download?.title}</h2>
          <div className="bg-slate-800/50 rounded-xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">1</div>
              <div className="text-left">
                <p className="font-semibold">{i18n?.download?.step1}</p>
                <p className="text-gray-400">{i18n?.download?.step1Desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">2</div>
              <div className="text-left">
                <p className="font-semibold">{i18n?.download?.step2}</p>
                <p className="text-gray-400">{i18n?.download?.step2Desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">3</div>
              <div className="text-left">
                <p className="font-semibold">{i18n?.download?.step3}</p>
                <p className="text-gray-400">{i18n?.download?.step3Desc}</p>
              </div>
            </div>
            <a href={DOWNLOAD_URL} className="block text-center w-full bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-bold text-lg transition mt-8">
              {i18n?.download?.btn}
            </a>

            <div className="mt-8 bg-blue-500/10 border border-blue-400/40 rounded-xl p-6">
              <p className="font-semibold text-blue-200 mb-3">
                {i18n?.smartscreen?.title}
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                {i18n?.smartscreen?.body}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="bg-slate-700 px-3 py-1 rounded">{i18n?.smartscreen?.step1}</span>
                <span className="text-blue-400">→</span>
                <span className="bg-slate-700 px-3 py-1 rounded">{i18n?.smartscreen?.step2}</span>
              </div>

              {i18n?.smartscreen?.demo && (
                <SmartScreenDemo labels={i18n.smartscreen.demo} />
              )}

              <p className="text-gray-400 text-sm mt-5">
                {i18n?.smartscreen?.trust}{' '}
                <a
                  href="https://github.com/NuraydinArikan/LessTokenDesktop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {i18n?.smartscreen?.trustLink}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">{i18n?.faq?.title}</h2>
          <div className="space-y-6">
            {(i18n?.faq?.items || []).map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <button
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                    className="w-full flex justify-between items-center gap-4 text-left font-semibold text-lg hover:text-blue-400 transition"
                  >
                    <span>{item.q}</span>
                    <span className="text-2xl leading-none shrink-0">{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <p className="mt-4 text-gray-300 leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-slate-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">{i18n?.cta?.title}</h2>
          <p className="text-xl text-gray-300 mb-8">{i18n?.cta?.desc}</p>
          <a href={DOWNLOAD_URL} className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-8 py-4 rounded-lg font-bold text-lg transition">
            {i18n?.cta?.btn}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="Less Token" style={{ width: '32px', height: '32px' }} />
                <p className="font-bold">Less Token</p>
              </div>
              <p className="text-gray-400 text-sm">{i18n?.footer?.tagline}</p>
            </div>
            <div>
              <p className="font-semibold mb-4">{i18n?.footer?.product}</p>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">{i18n?.footer?.features}</a></li>
                <li><a href="#" className="hover:text-white transition">{i18n?.footer?.pricingLink}</a></li>
                <li><a href="#" className="hover:text-white transition">{i18n?.footer?.downloadLink}</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4">{i18n?.footer?.resources}</p>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/guide" className="hover:text-white transition">Kılavuz</a></li>
                <li><a href="https://github.com/NuraydinArikan/LessTokenDesktop" target="_blank" className="hover:text-white transition">{i18n?.footer?.github}</a></li>
                <li><a href="/contact" className="hover:text-white transition">İletişim</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4">{i18n?.footer?.legal}</p>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="mailto:info@lesstoken.app" className="hover:text-white transition">Email: info@lesstoken.app</a></li>
                <li><a href="https://github.com/NuraydinArikan" target="_blank" className="hover:text-white transition">GitHub: @NuraydinArikan</a></li>
                <li><a href="/contact" className="hover:text-white transition">İletişim Formu</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-gray-400 text-sm">
            <p>{i18n?.footer?.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition">
      <div className="text-blue-400 mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default HomeContent;
