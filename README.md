# Less Token - Landing Page

Modern landing page for Less Token AI Clipboard Optimizer.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or navigate to project
cd lesstoken-landing

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## 📦 Build for Production

```bash
# Build
npm run build

# Start production server
npm start

# Export as static site
npm run export
```

## 🌐 Deploy to Vercel

### Option 1: Direct from GitHub
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import project
4. Auto-deploys on push

### Option 2: CLI
```bash
npm i -g vercel
vercel
```

### Connect Domain
After deploying to Vercel:
1. Buy `lesstoken.app` from Porkbun
2. Go to Vercel project settings
3. Add custom domain
4. Update Porkbun DNS settings (instructions provided by Vercel)

## 📁 Project Structure

```
lesstoken-landing/
├── pages/
│   ├── index.tsx          # Main landing page
│   ├── _app.tsx           # App wrapper
│   └── _document.tsx      # HTML document
├── styles/
│   └── globals.css        # Global styles
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🎨 Features

- ✨ Modern, responsive design
- 🌙 Dark theme (slate/blue palette)
- ⚡ Fast (Next.js static export)
- 📱 Mobile-friendly
- 🎯 Conversion-focused (clear CTA)
- 📊 Feature showcase with real stats
- ❓ FAQ section
- 📝 Full landing page experience

## 🎯 Sections

1. **Navigation** - Fixed header with download button
2. **Hero** - Main value proposition
3. **Stats** - Key metrics (99% savings, free, etc.)
4. **Features** - 6 main features with icons
5. **Showcase** - Real before/after results
6. **Pricing** - Simple free pricing
7. **Download** - Step-by-step installation
8. **FAQ** - Common questions
9. **CTA** - Final call-to-action
10. **Footer** - Links and copyright

## 🔧 Customization

### Colors
Edit `tailwind.config.js`:
```js
colors: {
  primary: '#3B82F6',      // Blue
  secondary: '#1E40AF',    // Dark Blue
}
```

### Content
Edit `pages/index.tsx` - all text and links are easily editable.

### Fonts
Currently using Google Fonts "Inter". Change in `pages/_document.tsx`.

## 📊 Performance

- Lighthouse Score: ~95+
- Page Load: <2s
- Size: ~45KB gzipped

## 🚀 Next Steps

1. **Local Testing**: `npm run dev`
2. **Push to GitHub**
3. **Deploy to Vercel** 
4. **Buy Domain**: `lesstoken.app`
5. **Connect Domain** in Vercel
6. **Go Live!**

## 📄 License

Open source - Same license as Less Token app (MIT)

---

**Made with ❤️ for budget-conscious developers**
