# Week 3: Polish & Release Checklist

Phase 2 (Browser Extension) - Final week before launch.

## 📋 Week 3 Tasks

### Day 1-2: Icons & Polish

- [x] Create SVG icons (16, 48, 128px)
- [ ] Convert SVG → PNG for Chrome Store
- [ ] Test extension in Chrome (load unpacked)
- [ ] Verify all buttons work
- [ ] Test with real API keys (OpenAI, Claude, etc.)
- [ ] Check error handling (missing API key, network error)
- [ ] Test on different websites
- [ ] Verify popup doesn't crash
- [ ] Check history saves correctly

### Day 3: Edge Cases & Refinement

- [ ] Test with very long text (5000+ chars)
- [ ] Test with special characters (emojis, symbols)
- [ ] Test batch processing (multiple optimizations)
- [ ] Verify token counting accuracy
- [ ] Test all 4 optimization styles
- [ ] Check mobile responsiveness of popup
- [ ] Verify settings persist after reload
- [ ] Clear history functionality

### Day 4-5: Documentation & Submission

- [ ] Update README.md with testing guide
- [ ] Prepare 4 screenshots (1280x800 each)
- [ ] Write compelling description
- [ ] Draft privacy policy for lesstoken.app
- [ ] Create developer account on Chrome Store
- [ ] Prepare ZIP file (icons as PNG)
- [ ] Review manifest one final time
- [ ] Test permissions explanation

### Day 6-7: Launch

- [ ] Submit to Chrome Web Store
- [ ] Monitor review queue
- [ ] Prepare launch announcement
- [ ] Set up GitHub release
- [ ] Post on social media
- [ ] Wait for approval (1-3 days)

---

## 🧪 Testing Matrix

### Browsers
- [x] Chrome (primary)
- [ ] Edge (Chromium-based)
- [ ] Brave (Chromium-based)

### Scenarios
- [x] Popup open/close
- [ ] Text input → Optimize
- [ ] Settings save/load
- [ ] History save/view
- [ ] Copy to clipboard
- [ ] Long text (>5000 chars)
- [ ] Special characters
- [ ] Network error handling
- [ ] Missing API key handling
- [ ] Provider switching

### AI Providers
- [ ] OpenAI (GPT-4)
- [ ] Claude (Anthropic)
- [ ] Google Gemini
- [ ] Ollama (local)

### Optimization Styles
- [ ] General
- [ ] Technical
- [ ] Marketing
- [ ] Academic

---

## 📸 Screenshots Needed

**Screenshot 1: Main Functionality**
- Show popup with text
- Display "Optimize" button
- Highlight reduction %

**Screenshot 2: Settings Page**
- Show API key input
- Display provider selection
- Show save button

**Screenshot 3: History Dashboard**
- Show stats (total optimizations, avg reduction)
- Display history list
- Show reduction percentages

**Screenshot 4: Before & After**
- Show input text
- Show optimized output
- Highlight the changes

---

## 🚀 Launch Checklist

### Pre-Launch (Day 6)
- [ ] Icon conversion done (PNGs generated)
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Screenshots captured
- [ ] Chrome Store account ready
- [ ] $5 dev fee paid

### Launch (Day 7)
- [ ] Upload to Chrome Store
- [ ] Fill all metadata
- [ ] Submit for review
- [ ] Note review date/time
- [ ] Monitor inbox for feedback

### Post-Launch
- [ ] Check status daily
- [ ] Respond to review comments
- [ ] Prepare fixes if needed
- [ ] Announce when approved

---

## 🐛 Known Issues & Fixes

### Issue: Popup closes when API called
**Fix:** Use `return true` in message listener to keep port open

### Issue: History not saving
**Fix:** Use `chrome.storage.local.set()` with callback

### Issue: SVG icons blurry
**Fix:** Convert to PNG at correct DPI (300dpi)

### Issue: CORS errors with AI APIs
**Fix:** Use background worker (not content script)

---

## 📝 Release Notes Template

```markdown
# Version 1.0.0 - Initial Release 🎉

## Features
✨ Multi-AI support (OpenAI, Claude, Gemini, Ollama)
📊 Real-time token optimization tracking
💾 Full optimization history with analytics
🎨 4 optimization styles (General, Technical, Marketing, Academic)
🔒 Privacy-first design (keys stored locally)

## How to Use
1. Install extension
2. Click ⚙️ to configure API key
3. Paste text to optimize
4. Click Optimize button
5. View reduction stats

## Supported Providers
- OpenAI GPT-4 Turbo
- Anthropic Claude Opus
- Google Gemini Pro
- Ollama (Local)

## What's Next
- Week 4: Bug fixes based on user feedback
- Week 5: Firefox port
- Week 6: Advanced features (templates, batch)

Enjoy! ⚡
```

---

## ✅ Final Verification

Before submission, verify:

```bash
# 1. Check file structure
ls -la extension/

# 2. Verify manifest.json
cat extension/manifest.json | grep -E "manifest_version|name|version"

# 3. Count icons
ls extension/icons/

# 4. Check for secrets
grep -r "sk-" extension/ 2>/dev/null  # Should be empty

# 5. Test loading
# → Open chrome://extensions/
# → Enable Developer mode
# → Click "Load unpacked"
# → Select extension folder
```

---

## 🎯 Success Criteria

✅ Extension loads without errors
✅ Popup displays correctly
✅ All buttons are clickable
✅ Settings save and persist
✅ History tracks optimizations
✅ All 4 AI providers work
✅ All 4 styles generate different outputs
✅ Token reduction calculated correctly
✅ No crashes on edge cases
✅ Privacy maintained (keys local only)
✅ Chrome Store submission accepted

---

## 📅 Timeline

```
Day 1-2:  Icons + Testing       (16 hours)
Day 3:    Edge Cases            (8 hours)
Day 4-5:  Docs + Submission     (16 hours)
Day 6-7:  Launch + Review       (ongoing)
────────────────────────────────
Total:    ~40 hours of work
```

**Target Launch Date:** End of Week 3 (in about 7 days)

---

Excited to ship Phase 2! 🚀
