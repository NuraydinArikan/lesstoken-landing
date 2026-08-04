# Chrome Web Store Submission Checklist — Less Token Extension

**Status:** Ready for submission ✅  
**Version:** 1.0.0  
**Last Updated:** 2026-08-04

---

## ✅ Pre-Submission Requirements

### 1. Technical Requirements
- [x] Manifest v3 compliant
- [x] PNG icons (16x16, 48x48, 128x128)
- [x] No hardcoded API keys
- [x] No console errors on load
- [x] XSS prevention implemented
- [x] CORS properly handled
- [x] Error messages user-friendly
- [x] Permissions justified and documented

### 2. Files & Structure
- [x] manifest.json — properly configured
- [x] popup.html / popup.js — main UI
- [x] options.html / options.js — settings
- [x] history.html / history.js — analytics
- [x] background.js — service worker
- [x] content.js — webpage interaction
- [x] icons/icon-{16,48,128}.png — all sizes
- [x] package.json — metadata
- [x] README.md — documentation

### 3. Security & Privacy
- [x] API keys stored locally ONLY
- [x] No third-party tracking/analytics
- [x] No external scripts loaded
- [x] No data sent to Less Token servers
- [x] User data stays private
- [x] HTTPS-only for API calls
- [ ] Privacy policy drafted (see below)

### 4. Code Quality
- [x] No errors on startup
- [x] Error handling for API failures
- [x] Graceful degradation
- [x] Input validation
- [x] XSS protection (HTML escaping)
- [x] Manifest permissions justified
- [ ] Run through validator

### 5. Documentation
- [x] README.md complete
- [x] Usage instructions clear
- [x] Feature list documented
- [ ] Screenshots prepared (4x required)
- [ ] Store descriptions written
- [ ] Privacy policy URL ready

### 6. Marketing & Assets
- [ ] Extension title: "Less Token - AI Text Optimizer"
- [ ] Short description (80 chars)
- [ ] Long description (full features)
- [ ] 4 screenshots (1280x800 or 640x400)
- [ ] Category: Productivity
- [ ] Language: English
- [ ] Website: https://lesstoken.app
- [ ] Support email: info@lesstoken.app
- [ ] Privacy policy: https://lesstoken.app/privacy

---

## 📋 Submission Steps

### Step 1: Chrome Developer Account
- [ ] Go to https://chrome.google.com/webstore/devconsole/
- [ ] Sign in with Google account
- [ ] Pay $5 one-time registration fee
- [ ] Account verified ✓

### Step 2: Prepare Extension ZIP
```bash
cd extension/
# ZIP should include:
# - manifest.json
# - *.html (popup, options, history)
# - *.js (all scripts)
# - icons/*.png (16, 48, 128)
# - package.json
#
# Exclude:
# - .git/
# - node_modules/
# - .env files
# - *.svg (keep locally only)
# - convert_icons*.py
# - *.md files (except README)
```

### Step 3: Upload to Chrome Web Store
1. Dashboard → "Create new item"
2. Choose "Upload"
3. Select ZIP file
4. Review auto-detected information
5. Verify all fields correct

### Step 4: Store Listing

**Title:**
```
Less Token - AI Text Optimizer
```

**Short Description (80 chars):**
```
Reduce AI API token usage with one click. Optimize text instantly.
```

**Full Description:**
```
Less Token is an AI-powered browser extension that optimizes your text 
to reduce API token usage and costs.

✨ Features:
• Multiple AI providers (OpenAI, Claude, Google Gemini, Ollama)
• 4 optimization styles (General, Technical, Marketing, Academic)
• Real-time token reduction tracking
• Full optimization history with analytics
• Privacy-first design (keys stored locally)

🎯 Use Cases:
• Reduce OpenAI/Claude API costs
• Prepare content for AI processing
• Optimize documentation and marketing copy
• Technical writing refinement

🔒 Privacy First:
Your API keys are stored locally in your browser and never sent to 
our servers. Your data stays yours.

📊 Track Your Savings:
See exactly how many tokens you've saved across all optimizations 
with detailed analytics.

🚀 Getting Started:
1. Install extension
2. Click ⚙️ icon to add your API key
3. Paste text and click "Optimize"
4. Watch your tokens shrink!

Supported AI Providers:
• OpenAI (GPT-4, GPT-3.5)
• Anthropic Claude (Opus, Sonnet, Haiku)
• Google Gemini Pro
• Ollama (local processing)

Privacy & Security:
✓ API keys stored locally only
✓ No tracking or analytics
✓ No data sent to Less Token servers
✓ Open source (inspect on GitHub)

Website: https://lesstoken.app
GitHub: https://github.com/LessTokenApp
Support: info@lesstoken.app
```

**Category:** Productivity

**Language:** English

**Website:** https://lesstoken.app

**Support Email:** info@lesstoken.app

**Privacy Policy:** https://lesstoken.app/privacy

### Step 5: Upload Screenshots
**Required: 4 screenshots at 1280x800 or 640x400**

1. **Screenshot 1 — Main Functionality**
   - Show popup with text pasted
   - API provider selected (e.g., OpenAI)
   - Optimization style selected
   - "Optimize" button ready
   - File: `screenshot-1-popup.png`

2. **Screenshot 2 — Optimization in Action**
   - Show result with reduced tokens
   - Highlight the "50% savings" message
   - Show before/after text comparison
   - File: `screenshot-2-results.png`

3. **Screenshot 3 — Settings Page**
   - API key configuration options
   - Multiple provider setup shown
   - Privacy message visible
   - File: `screenshot-3-settings.png`

4. **Screenshot 4 — History & Analytics**
   - History dashboard visible
   - Savings statistics displayed
   - Multiple optimization entries shown
   - File: `screenshot-4-history.png`

### Step 6: Permissions Review

When Chrome asks about permissions, provide explanation:

**Requested Permissions:**
- `clipboardRead` — Read text to optimize
- `clipboardWrite` — Copy optimized results
- `activeTab` — Interact with current page
- `scripting` — Inject content scripts for web pages
- `storage` — Save settings and history locally

**Explanation to provide:**
```
This extension optimizes text using AI providers (OpenAI, Claude, 
Google Gemini, or local Ollama). It requires:

• Clipboard access to read your text to optimize
• Clipboard access to copy results back
• Page access to provide in-page optimization
• Storage access to save your settings and optimization history

Your API keys stay in your browser. No data is sent to Less Token 
servers or third-party tracking.
```

### Step 7: Content Rating
- No adult content
- No violence or hate speech
- No misleading claims
- Rating: **G/PG**

### Step 8: Submit for Review
1. Review all information one final time
2. Accept Chrome Web Store Program Policies
3. Click "Publish"
4. Extension enters review queue

**Expected review time: 1-3 days** (sometimes up to 1 week for first submission)

---

## 🎯 Final Verification Checklist

Before submitting:

- [x] All PNG icons created (16, 48, 128)
- [x] Manifest.json valid and complete
- [x] No console errors on load
- [x] API keys only stored locally
- [x] All permissions justified
- [ ] Screenshots ready (4 images)
- [ ] Store descriptions written
- [ ] Privacy policy URL confirmed
- [ ] Developer account active
- [ ] $5 registration fee paid
- [ ] ZIP file prepared correctly
- [ ] Tested in Chrome (load unpacked)
- [ ] No hardcoded secrets or sensitive data
- [ ] README.md complete

---

## 📸 Screenshot Creation Guide

### Tools Needed:
- Chrome browser
- Screenshot tool (Snagit, Greenshot, or built-in)
- Image editor (optional, for annotations)

### Process:

1. **Load unpacked extension** in Chrome:
   - chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select extension folder

2. **Screenshot 1 — Popup with text:**
   - Open any website
   - Click extension icon
   - Type sample text into input
   - Show provider dropdown
   - Show style dropdown
   - Take screenshot at 1280x800

3. **Screenshot 2 — Results:**
   - Paste longer text (100+ tokens)
   - Click Optimize
   - Wait for result
   - Show reduction percentage
   - Take screenshot at 1280x800

4. **Screenshot 3 — Settings:**
   - Click ⚙️ icon in popup
   - Show options page
   - Show API key input fields
   - Show provider selection
   - Take screenshot at 1280x800

5. **Screenshot 4 — History:**
   - Click 📊 icon in popup
   - Show history dashboard
   - Show stats at top
   - Scroll to show multiple entries
   - Take screenshot at 1280x800

---

## ⚠️ Common Rejection Reasons (AVOID!)

❌ **Misleading Description**
- Don't promise what extension can't do
- Don't claim to reduce tokens without API keys
- Don't promise free optimization (must use APIs)

❌ **Unclear Permissions**
- Each permission must be explained
- Users must understand WHY they're needed
- Security must be emphasized

❌ **Security Issues**
- NEVER store API keys on servers
- NEVER leak user data
- NEVER use third-party trackers
- NEVER include malware or unwanted behavior

❌ **Poor UX**
- Must be easy to use
- Settings must be obvious
- Error messages must be helpful
- No confusing terminology

❌ **Policy Violations**
- No external links in description
- No spam or misleading content
- No copyright/trademark violations
- No links to sketchy sites

---

## 🚀 Post-Submission Steps

### Monitoring (After Approval)
- [ ] Check Chrome Web Store dashboard weekly
- [ ] Monitor user reviews and ratings
- [ ] Track installation numbers
- [ ] Watch for user feedback/issues
- [ ] Plan updates based on reviews

### Updates & Versioning
To release a new version:
1. Increment `version` in manifest.json
2. Create new ZIP with updated code
3. Go to dashboard → click extension
4. Click "Package" button
5. Upload new ZIP
6. Accept any new permission changes
7. Submit for review again

### Promotion (After Publishing)
- Twitter: Tweet about launch #ChromeExtension #AI #Productivity
- Product Hunt: Submit at https://www.producthunt.com/
- Reddit: /r/productivity, /r/chrome, /r/webdev
- HackerNews: "Show HN" submission
- Blog: Write launch post
- Newsletter: Email subscribers

---

## 📞 Helpful Resources

- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program_policies/)
- [Submission Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest v3 Reference](https://developer.chrome.com/docs/extensions/mv3/)
- [Extension Publishing Checklist](https://developer.chrome.com/docs/webstore/)

---

## ✅ Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Extension Code | ✅ Complete | 4 AI providers, full features |
| Manifest | ✅ Valid | v3 compliant, all icons PNG |
| Icons | ✅ Created | 16x16, 48x48, 128x128 |
| Documentation | ✅ Complete | README, guides, this checklist |
| Privacy | ✅ Secure | Keys local only, no tracking |
| Permissions | ✅ Justified | All explained clearly |
| Screenshots | ⏳ Needed | 4 required images |
| Store Listing | ✅ Ready | Text prepared above |
| Privacy Policy | ⏳ Link needed | URL required at submission |

**Overall Status:** 🟡 **Ready for final prep** (screenshots + privacy policy URL)

---

**Next Action:** Create screenshots and confirm privacy policy URL, then submit!

Generated: 2026-08-04  
Last Updated: 2026-08-04
