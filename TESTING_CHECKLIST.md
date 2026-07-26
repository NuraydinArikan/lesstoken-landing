# Complete Testing Checklist

Test everything before announcing launch.

## 🔧 Backend Tests

### Health Check
```bash
# After Railway deployment, test:
curl https://api.lesstoken.app/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2026-07-24T..."}
```

### API Status
```bash
curl https://api.lesstoken.app/api/v1/status

# Expected: Shows which providers are configured
```

---

## 🌐 Frontend Tests

### Landing Page
- [ ] https://lesstoken.app loads
- [ ] Logo displays
- [ ] Navigation works (Kılavuz, İletişim links)
- [ ] Language toggle works (EN/TR)
- [ ] Responsive on mobile
- [ ] No console errors

### Guide Page
- [ ] https://lesstoken.app/guide loads
- [ ] 3 tabs work (Desktop/Extension/Web)
- [ ] AI provider comparison displays
- [ ] Tips section visible
- [ ] Links work

### Contact Page
- [ ] https://lesstoken.app/contact loads
- [ ] Email link works (mailto:)
- [ ] Contact form loads
- [ ] Form submission shows success message
- [ ] Form clears after submit

---

## 🚀 Web App Tests

### Authentication
- [ ] https://lesstoken.app/app redirects to auth
- [ ] Sign Up form works
  - [ ] Valid email/password creates account
  - [ ] Weak password shows error
  - [ ] Existing email shows error
  - [ ] Token saved to localStorage
- [ ] Login form works
  - [ ] Valid credentials log in
  - [ ] Invalid credentials show error
  - [ ] Token saved to localStorage
- [ ] Logout clears token

### Dashboard
- [ ] /app/dashboard loads after login
- [ ] Stats display (0 if first time)
- [ ] "Yeni Optimizasyon" button works
- [ ] "Geçmişi Görüntüle" button works
- [ ] "Ayarlar" button works
- [ ] Welcome message shows

### Optimize Page
- [ ] /app/optimize loads
- [ ] Provider dropdown works (4 options)
- [ ] Style dropdown works (4 options)
- [ ] Text input accepts text
- [ ] "Optimize" button disabled if no text
- [ ] Text submission calls API
- [ ] Results display in output
- [ ] Stats show correctly:
  - [ ] Reduction % shows
  - [ ] Token counts show
  - [ ] Savings display
- [ ] Copy button works
- [ ] "Panoya Dön" link works

### History Page
- [ ] /app/history loads
- [ ] Stats display
- [ ] First time: "Henüz geçmiş yok" message
- [ ] After optimize: History items appear
- [ ] Each item shows:
  - [ ] Provider badge
  - [ ] Style badge
  - [ ] Input preview
  - [ ] Output preview
  - [ ] Reduction %
  - [ ] Timestamp
- [ ] "Geçmişi Temizle" button works
- [ ] Clear confirmation dialog appears

---

## 🔌 API Integration Tests

### Register Endpoint
```bash
curl -X POST https://api.lesstoken.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'

# Expected: 201 with token and user data
```

### Login Endpoint
```bash
curl -X POST https://api.lesstoken.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'

# Expected: 200 with token
```

### Optimize Endpoint
```bash
curl -X POST https://api.lesstoken.app/api/v1/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "text": "This is a very long sentence that needs optimization...",
    "provider": "openai",
    "style": "general"
  }'

# Expected: 200 with optimized text and stats
```

### History Endpoint
```bash
curl https://api.lesstoken.app/api/v1/history \
  -H "Authorization: Bearer <token>"

# Expected: 200 with history array and stats
```

---

## 📱 Responsive Tests

### Mobile (375px)
- [ ] All pages render correctly
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Forms are usable
- [ ] No horizontal scroll

### Tablet (768px)
- [ ] Layout adapts
- [ ] Grid reorganizes
- [ ] Navigation works

### Desktop (1280px+)
- [ ] Full layout
- [ ] All features visible
- [ ] Optimal spacing

---

## 🌍 Browser Tests

### Chrome
- [ ] All pages load
- [ ] No errors in DevTools
- [ ] Console clean
- [ ] Network requests OK

### Firefox
- [ ] All pages load
- [ ] No errors in DevTools
- [ ] Performance acceptable

### Safari (if available)
- [ ] Pages render correctly
- [ ] Styles applied

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Edge Mobile

---

## ⚠️ Error Scenarios

### Authentication Errors
- [ ] Invalid email format rejected
- [ ] Weak password rejected
- [ ] Duplicate email rejected
- [ ] Wrong password shows error
- [ ] Missing token redirects to login

### Optimization Errors
- [ ] Empty text shows error
- [ ] API key missing shows error
- [ ] Network timeout handled
- [ ] Invalid provider handled

### Edge Cases
- [ ] Very long text (10000+ chars) handled
- [ ] Special characters in text
- [ ] Unicode text (Turkish characters)
- [ ] Empty history message displays
- [ ] Multiple rapid requests

---

## 🔐 Security Tests

- [ ] Tokens not exposed in URLs
- [ ] Passwords not logged
- [ ] HTTPS used everywhere
- [ ] CORS headers correct
- [ ] No sensitive data in localStorage (just token)
- [ ] API validates auth header
- [ ] SQL injection prevented (ORM used)
- [ ] XSS prevented (React escapes)

---

## ⚡ Performance Tests

### Page Load
- [ ] Landing page: < 2 seconds
- [ ] App pages: < 2 seconds
- [ ] Large images optimized

### API Response
- [ ] Optimize endpoint: < 5 seconds (varies by provider)
- [ ] History endpoint: < 1 second
- [ ] Login: < 500ms

### Bundle Size
- [ ] Frontend: < 500KB
- [ ] No unused packages

---

## 📊 Analytics Setup (Optional)

- [ ] Google Analytics configured
- [ ] Page views tracked
- [ ] User events tracked
- [ ] Errors logged
- [ ] Performance metrics captured

---

## ✅ Final Checks

Before announcing:
- [ ] All tests passed
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Mobile works
- [ ] Accessibility OK (if time)
- [ ] Documentation updated
- [ ] Env vars secured
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Error tracking setup

---

## 🎯 Test Execution Order

1. **Backend Health** (5 min)
   - API endpoints respond
   - Database connected

2. **Frontend Pages** (10 min)
   - All pages load
   - No errors

3. **Web App Flow** (20 min)
   - Sign up → Login → Dashboard → Optimize → History

4. **Error Scenarios** (10 min)
   - Invalid inputs
   - Network errors
   - Missing data

5. **Edge Cases** (10 min)
   - Very long text
   - Special characters
   - Rapid requests

6. **Performance** (5 min)
   - Page load times
   - API response times

7. **Security** (5 min)
   - No sensitive data exposed
   - Auth working
   - HTTPS everywhere

**Total Time: ~1 hour**

---

## 🚦 Go/No-Go Decision

**GO Criteria:**
- All critical tests pass
- No unhandled errors
- Performance acceptable
- Security verified
- Mobile works

**NO-GO Criteria:**
- Auth not working
- API not responding
- Critical errors on pages
- Security vulnerability
- Can't optimize text

---

Good luck! 🚀
