// Support copy for lesstoken.app/support. Pure data on purpose: this is the
// file that changes most often, and keeping it out of JSX means editing a
// question never risks breaking the page. Shape is guarded by
// tests/supportContent.test.mjs -- in particular, tr and en must stay in step.
export const supportContent = {
  tr: {
    meta: {
      title: 'Destek - LessToken',
      heading: 'Destek',
      description: 'LessToken tarayıcı eklentisi, masaüstü uygulaması ve web araçları için yardım.'
    },
    tabs: { extension: 'Tarayıcı Eklentisi', desktop: 'Masaüstü', web: 'Web Araçları' },
    faq: {
      extension: [
        {
          q: 'API anahtarını nereden alırım?',
          a: 'Kullanmak istediğiniz sağlayıcıdan: OpenAI için platform.openai.com/api-keys, Anthropic Claude için console.anthropic.com, Google Gemini için ai.google.dev. Anahtarı eklentinin ayarlar sayfasına yapıştırmanız yeterli.'
        },
        {
          q: '"Geçersiz anahtar" hatası alıyorum.',
          a: 'Üç yaygın sebebi var. Ayarlarda seçili sağlayıcı ile anahtarın ait olduğu sağlayıcı farklı olabilir. Anahtarın başında veya sonunda kopyalarken bulaşan boşluk kalmış olabilir. Ya da hesabınızda kullanılabilir bakiye yoktur — sağlayıcılar bakiyesiz hesapta geçerli bir anahtarı bile reddeder.'
        },
        {
          q: 'Hangi sağlayıcıyı seçmeliyim?',
          a: 'Üçü de çalışır; fark maliyet ve üslupta. Kısa metinlerde farkı zor görürsünüz, o yüzden zaten hesabınızın olduğu sağlayıcıyla başlayın. Her optimizasyonda ayarlardan değiştirebilirsiniz.'
        },
        {
          q: 'Metnim sizin sunucularınıza gidiyor mu?',
          a: 'Hayır. Eklenti metni doğrudan seçtiğiniz yapay zeka sağlayıcısına gönderir; API anahtarınız yalnızca tarayıcınızda saklanır. Bu akışta bizim bir sunucumuz yok.'
        },
        {
          q: 'Optimize\'a basıyorum ama bir şey olmuyor.',
          a: 'Önce ayarlarda seçtiğiniz sağlayıcı için bir anahtar kayıtlı mı bakın — anahtar yoksa eklenti isteği hiç göndermez. Kayıtlıysa sağlayıcının kendi durum sayfasını kontrol edin; kesinti sırasında istek sessizce başarısız olur.'
        }
      ],
      desktop: [
        {
          q: 'Windows "bilinmeyen yayıncı" uyarısı gösteriyor.',
          a: 'Bu SmartScreen uyarısıdır ve kurulum dosyası henüz kod imzalama sertifikası taşımadığı için çıkar; dosyada bir sorun olduğu anlamına gelmez. Ana sayfada uyarının nasıl geçileceğini adım adım gösteren bir bölüm var; indirdiğiniz dosyanın SHA-256 özetini de orada yayınlıyoruz.'
        },
        {
          q: 'Uygulama bana hiç güncelleme önermiyor.',
          a: 'Otomatik güncelleme ilk kez v1.0.7 ile çalışmaya başladı. Sürümünüz v1.0.6 veya daha eskiyse uygulama güncelleme kontrolü yapamaz ve size hiçbir zaman yeni sürüm önermez. Tek seferlik çözüm: siteden güncel kurulumu indirip üzerine kurun. v1.0.7 ve sonrası kendini günceller.'
        }
      ],
      web: [
        {
          q: 'Web araçları için hesap açmam gerekiyor mu?',
          a: 'Hayır. Metin, Görsel ve Dosya araçları hesapsız çalışır. Yapay zeka gerektiren işlemlerde kendi API anahtarınızı girersiniz ve anahtar yalnızca tarayıcınızda kalır.'
        },
        {
          q: 'Hangi dosya türlerini yükleyebilirim?',
          a: 'Dosya aracı .txt, .md ve .docx okur; dosya boyutu en fazla 2 MB olabilir. Okuma tamamen tarayıcınızda yapılır, dosyanız hiçbir yere yüklenmez.'
        },
        {
          q: 'Görsel küçültme için de anahtar gerekiyor mu?',
          a: 'Hayır. Görsel küçültme ve dosyadan metin çıkarma anahtarsız çalışır, çünkü ikisi de tarayıcınızın içinde yapılır.'
        }
      ]
    },
    form: {
      title: 'Hâlâ takıldıysanız yazın',
      name: 'Adınız',
      email: 'E-posta adresiniz',
      subject: 'Konu',
      message: 'Mesajınız',
      send: 'Gönder',
      sending: 'Gönderiliyor…',
      success: 'Mesajınız ulaştı. En kısa sürede dönüş yapacağız.',
      errorGeneric: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
      errorRateLimit: 'Çok fazla mesaj gönderildi. Lütfen biraz bekleyip tekrar deneyin.',
      errorNetwork: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
    }
  },
  en: {
    meta: {
      title: 'Support - LessToken',
      heading: 'Support',
      description: 'Help for the LessToken browser extension, desktop app and web tools.'
    },
    tabs: { extension: 'Browser Extension', desktop: 'Desktop', web: 'Web Tools' },
    faq: {
      extension: [
        {
          q: 'Where do I get an API key?',
          a: 'From whichever provider you want to use: platform.openai.com/api-keys for OpenAI, console.anthropic.com for Anthropic Claude, ai.google.dev for Google Gemini. Paste the key into the extension\'s settings page and you are done.'
        },
        {
          q: 'I keep getting an "invalid key" error.',
          a: 'Three causes account for almost all of these. The provider selected in settings may not be the provider the key belongs to. The key may have picked up a leading or trailing space when it was copied. Or the account may have no credit — providers reject even a valid key once the balance runs out.'
        },
        {
          q: 'Which provider should I choose?',
          a: 'All three work; they differ in cost and phrasing. On short text the difference is hard to spot, so start with whichever provider you already have an account with. You can switch in settings before any optimization.'
        },
        {
          q: 'Does my text reach your servers?',
          a: 'No. The extension sends your text straight to the AI provider you chose, and your API key is stored only in your browser. We have no server in that path at all.'
        },
        {
          q: 'I click Optimize and nothing happens.',
          a: 'First check that a key is saved for the provider selected in settings — with no key the extension never sends the request. If a key is saved, check the provider\'s own status page; during an outage the request fails quietly.'
        }
      ],
      desktop: [
        {
          q: 'Windows warns about an unknown publisher.',
          a: 'That is SmartScreen, and it appears because the installer does not yet carry a code-signing certificate — it does not mean anything is wrong with the file. The home page walks through dismissing the warning step by step, and publishes the SHA-256 checksum of the download so you can verify it yourself.'
        },
        {
          q: 'The app never offers me an update.',
          a: 'Auto-update first worked in v1.0.7. If you are on v1.0.6 or older the app cannot check for updates and will never offer you a new version. The one-time fix is to download the current installer from the site and install it over your existing copy. v1.0.7 and later update themselves.'
        }
      ],
      web: [
        {
          q: 'Do I need an account for the web tools?',
          a: 'No. The Text, Image and File tools work without one. For the steps that call an AI you supply your own API key, and it stays in your browser.'
        },
        {
          q: 'Which file types can I upload?',
          a: 'The File tool reads .txt, .md and .docx, up to 2 MB. The reading happens entirely in your browser — your file is never uploaded anywhere.'
        },
        {
          q: 'Does image shrinking need a key too?',
          a: 'No. Image shrinking and file text extraction both run inside your browser, so neither needs a key.'
        }
      ]
    },
    form: {
      title: 'Still stuck? Write to us',
      name: 'Your name',
      email: 'Your email address',
      subject: 'Subject',
      message: 'Your message',
      send: 'Send',
      sending: 'Sending…',
      success: 'Your message reached us. We will get back to you shortly.',
      errorGeneric: 'The message could not be sent. Please try again.',
      errorRateLimit: 'Too many messages sent. Please wait a moment and try again.',
      errorNetwork: 'Could not connect. Check your internet connection and try again.'
    }
  }
};
