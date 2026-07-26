# Chrome Web Store Submission Guide

Complete checklist for submitting Less Token to Chrome Web Store.

## Pre-Submission Checklist

### 1. Icon Conversion
SVG icons need to be converted to PNG for Web Store:

```bash
# Install ImageMagick (one-time)
choco install imagemagick

# Convert icons
python convert_icons.py
```

Expected output:
- `icons/icon-16.png` (16x16 pixels)
- `icons/icon-48.png` (48x48 pixels)  
- `icons/icon-128.png` (128x128 pixels)

### 2. Review Manifest
- [ ] `manifest_version: 3` ✓
- [ ] `name` is clear and concise ✓
- [ ] `version` follows semantic versioning ✓
- [ ] `description` explains purpose ✓
- [ ] `permissions` are justified ✓
- [ ] `icons` point to PNG files ✓

### 3. Code Quality
- [ ] No hardcoded API keys
- [ ] No console errors on load
- [ ] XSS prevention (escaping user input)
- [ ] CORS handled properly
- [ ] Error messages are user-friendly

### 4. Privacy & Security
- [ ] API keys stored locally only ✓
- [ ] No tracking/analytics
- [ ] Privacy policy drafted
- [ ] No third-party scripts

### 5. Documentation
- [ ] README.md complete ✓
- [ ] Screenshots prepared (1280x800 min)
- [ ] Feature list clear ✓
- [ ] Usage instructions included ✓

---

## Screenshots & Marketing Assets

### Required Screenshots (1280x800 or 640x400)
1. **Main functionality** - Popup with optimization in action
2. **Settings page** - API key configuration
3. **History page** - Stats and optimization history
4. **Before/After** - Text optimization example

### Creation Tips
- Show real usage scenario
- Highlight key features
- Use clear, readable text
- Consistent branding (blue + white)

---

## Step-by-Step Submission

### 1. Create Developer Account
1. Go to https://chrome.google.com/webstore/devconsole/
2. Sign in with Google account
3. Pay $5 one-time developer registration fee

### 2. Upload Extension

**Prepare ZIP file:**
```bash
# From extension folder root
# Include:
# - manifest.json
# - *.html (popup, options, history)
# - *.js (all scripts)
# - icons/*.png
# - package.json
# 
# Exclude:
# - .git/
# - node_modules/
# - .env files
# - *.svg (keep only for development)
```

**Upload:**
1. Dashboard → Create new item
2. Select "Upload" 
3. Choose ZIP file
4. Review auto-detected info

### 3. Fill Store Listing

**Title:**
```
Less Token - AI Text Optimizer
```

**Description (Short):**
```
Reduce AI API token usage with one click. Optimize text while preserving meaning and quality.
```

**Description (Detailed):**
```
Less Token is an AI-powered browser extension that optimizes your text to reduce API token usage and costs.

✨ Features:
• Multiple AI providers (OpenAI, Claude, Google Gemini, Ollama)
• Optimization styles (General, Technical, Marketing, Academic)
• Real-time token reduction tracking
• Full optimization history with analytics
• Privacy-first design (keys stored locally)

🎯 Use Cases:
• Reduce OpenAI/Claude API costs
• Prepare content for AI processing
• Optimize documentation and marketing copy
• Technical writing refinement

🔒 Privacy:
Your API keys are stored locally in your browser and never sent to our servers.

📊 Track Your Savings:
See how many tokens you've saved across all optimizations with detailed analytics.

🚀 Get Started:
1. Install extension
2. Click ⚙️ to add your API key
3. Paste text and click Optimize
4. Watch your tokens shrink!
```

**Category:**
- Productivity

**Language:**
- English

**Website:**
- https://lesstoken.app

**Support Email:**
- info@lesstoken.app

**Privacy Policy:**
```
https://lesstoken.app/privacy
```

### 4. Upload Screenshots
- Main popup (optimization UI)
- Settings page (API key setup)
- History dashboard
- Before/after example

**Screenshot dimensions:** 1280x800 or 640x400

### 5. Review Requirements

**Permissions Review:**
- `clipboardRead` - Read clipboard for optimization
- `clipboardWrite` - Copy optimized text
- `activeTab` - Interact with active page
- `scripting` - Inject content scripts
- `storage` - Save settings and history

**Host Permissions:**
- OpenAI API
- Anthropic API  
- Google API
- Ollama (localhost)

**Explanation:**
```
"This extension optimizes text using AI providers. It requires clipboard 
access to read user content, and API permissions to send text to the 
chosen AI service (OpenAI, Claude, Google Gemini, or local Ollama)."
```

### 6. Content Rating
- Rate extension for content appropriateness
- No adult content, violence, etc.
- Should be G or PG rated

### 7. Submit for Review

1. Review all information
2. Accept Chrome Web Store policies
3. Click "Publish"
4. Extension goes to review queue

**Review time:** 
- Usually 1-3 days
- Can take up to 1 week for first submission

---

## After Publishing

### Monitoring
- Check Chrome Web Store dashboard weekly
- Monitor user reviews and ratings
- Track installation numbers
- Watch for policy violations

### Updates
To release a new version:
1. Increment `version` in manifest.json
2. Create ZIP with new code
3. Go to dashboard → click extension
4. Click "Package" button
5. Upload new ZIP
6. Accept updated permissions if needed
7. Submit for review

---

## Common Rejection Reasons

❌ **Misleading Description** - Don't over-promise
❌ **Unclear Permissions** - Explain why each permission is needed
❌ **Security Issues** - Never store API keys server-side
❌ **Poor UX** - Make it clear how to use the extension
❌ **External Links** - Avoid suspicious links in description

---

## Promotion

Once published, promote on:
- Twitter/X: #ChromeExtension #AI #Productivity
- Product Hunt: https://www.producthunt.com/
- Hacker News: Submit to "Show HN"
- Reddit: /r/productivity, /r/webdev
- Your personal blog/newsletter

---

## Helpful Resources

- [Chrome Web Store Policy](https://developer.chrome.com/docs/webstore/program_policies/)
- [Extension Submission Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest v3 Reference](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Store Basics](https://developer.chrome.com/docs/webstore/)

---

## Final Checklist

- [ ] Icons converted to PNG
- [ ] manifest.json reviewed
- [ ] No console errors
- [ ] API keys only stored locally
- [ ] Screenshots ready (4x)
- [ ] Description written
- [ ] Privacy policy drafted
- [ ] Developer account created
- [ ] $5 registration paid
- [ ] ZIP file prepared
- [ ] All permissions explained
- [ ] Content rating completed
- [ ] Ready to submit! 🚀

---

**Estimated timeline:** 1 week from preparation to published

**Budget:** $5 (one-time developer fee) + your time

Good luck! 🎉
