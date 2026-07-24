# Less Token Browser Extension

AI-powered browser extension to optimize text and reduce API token usage.

## Features

✅ **Text Optimization** - Reduce content while maintaining meaning
✅ **Multi-AI Support** - OpenAI, Claude, Google Gemini, Ollama
✅ **Local Processing** - API keys stored locally, never sent to external servers
✅ **Real-time Stats** - See token reduction percentage
✅ **Clipboard Integration** - Auto-load text from clipboard

## Installation

### For Development

1. **Clone and navigate to extension folder:**
```bash
cd C:\Projects\lesstoken-landing\extension
```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extension` folder

3. **Configure API Keys:**
   - Click the extension icon (⚡)
   - Click ⚙️ (settings)
   - Enter your API keys for your chosen provider

### For Production

1. **Prepare for distribution:**
```bash
# Zip the extension folder
# Remove node_modules and dev files
```

2. **Submit to Chrome Web Store:**
   - Go to https://chrome.google.com/webstore/devconsole/
   - Create new item
   - Upload the zipped extension

## Usage

1. **Paste or type text** in the popup
2. **Select AI provider** (OpenAI, Claude, Gemini, Ollama)
3. **Click Optimize** button
4. **See results** with token reduction stats

## Configuration

### API Keys Setup

#### OpenAI
- Get key from: https://platform.openai.com/api-keys
- Model: GPT-4 Turbo
- Cost: ~$0.01-0.03 per 1K tokens

#### Claude (Anthropic)
- Get key from: https://console.anthropic.com/account/keys
- Model: Claude 3 Opus
- Cost: ~$0.015-0.06 per 1K tokens

#### Google Gemini
- Get key from: https://ai.google.dev/tutorials/setup
- Model: Gemini Pro
- Cost: Free tier available

#### Ollama (Local)
- Download from: https://ollama.ai
- No API key needed (runs locally)
- Models: Mistral, Llama 2, etc.

## Project Structure

```
extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI popup
├── popup.js              # Popup controller
├── content.js            # Content script (webpage injection)
├── background.js         # Service worker (processing)
├── options.html          # Settings page
├── options.js            # Settings controller
├── icons/                # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md             # This file
```

## Development

### Testing

1. **Make changes** to files
2. **Reload extension** in `chrome://extensions/` (click reload icon)
3. **Test functionality** in popup

### Debugging

- **Popup errors:** Right-click extension icon → Inspect popup
- **Background worker:** In `chrome://extensions/`, click "Inspect views: background page"
- **Content script:** Open DevTools on any webpage, check console

## Architecture

### Popup (UI Layer)
- `popup.html` - User interface with input/output
- `popup.js` - Handles user interactions
- Communicates with background worker via `chrome.runtime.sendMessage`

### Content Script
- `content.js` - Injected into webpages
- Captures clipboard content
- Can highlight optimized text in pages

### Background Service Worker
- `background.js` - Core processing logic
- Calls AI APIs (OpenAI, Claude, Gemini, Ollama)
- Manages API keys and settings
- Calculates token reduction stats

### Storage
- Uses `chrome.storage.local` for settings persistence
- API keys stored locally in browser (never sent externally)

## API Integration

### OpenAI GPT-4
```javascript
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer {apiKey}
```

### Claude (Anthropic)
```javascript
POST https://api.anthropic.com/v1/messages
x-api-key: {apiKey}
```

### Google Gemini
```javascript
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
```

### Ollama (Local)
```javascript
POST http://localhost:11434/api/generate
```

## Privacy & Security

🔒 **Your privacy is protected:**
- API keys stored locally in browser, never sent to Less Token servers
- Extension doesn't track your data
- All optimization happens via your chosen AI provider
- No analytics or telemetry

## Roadmap

- [ ] Week 1: Foundation (manifest, popup, scripts) ✅
- [ ] Week 2: Core features (AI integration, UI refinement)
- [ ] Week 3: Polish & Chrome Web Store submission
- [ ] Future: Firefox port, edge cases handling

## Contributing

To contribute or report bugs:
1. Open issue on GitHub
2. Describe the problem with steps to reproduce
3. Include your OS, Chrome version, and extension version

## License

MIT License - See LICENSE file for details

## Support

For issues:
1. Check this README
2. Open DevTools (F12) and check console for errors
3. Try resetting settings and re-entering API keys
4. Clear browser cache and reload extension

---

**Made with ❤️ by the Less Token team**
