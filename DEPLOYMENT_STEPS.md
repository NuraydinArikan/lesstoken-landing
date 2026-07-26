# Phase 3 Deployment Steps

Complete deployment checklist for Less Token Web App.

## ✅ Done
- [x] GitHub commit & push
- [x] Backend API code ready
- [x] Frontend pages ready
- [x] Logo & branding ready

## 📋 TODO

### Step 1: Backend Deployment (Railway) - 30 min

**1.1 Create Railway Account**
- Go to https://railway.app
- Sign up with GitHub

**1.2 Create New Project**
- Click "New Project"
- Select "GitHub Repo"
- Choose: `lesstoken-landing`
- Select Dockerfile deployment

**1.3 Configure Environment Variables**
```
FLASK_ENV=production
SECRET_KEY=<generate strong random string>
OPENAI_API_KEY=<your OpenAI key>
CLAUDE_API_KEY=<your Claude key>
GEMINI_API_KEY=<your Gemini key>
DATABASE_URL=postgresql://...  (auto-generated)
PORT=5000
```

**1.4 Set Custom Domain**
- Railway Dashboard → Settings → Domains
- Add: `api.lesstoken.app`
- Follow DNS instructions

**Result:** Backend running at `https://api.lesstoken.app`

---

### Step 2: Frontend Deployment (Vercel) - 15 min

**2.1 Update Environment Variables**
In Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://api.lesstoken.app
```

**2.2 Trigger Redeploy**
- Vercel Dashboard → Deployments
- Click "Redeploy" on latest

**Result:** Frontend at `https://lesstoken.app`

---

### Step 3: DNS Configuration - 30 min

**3.1 Porkbun DNS Setup**
1. Login to Porkbun
2. Go to lesstoken.app domain
3. Click "Manage DNS"
4. Add record:
```
Type: CNAME
Name: api
Value: <railway-url.railway.app>
TTL: 3600
```

**3.2 Wait for Propagation**
- DNS propagation: 15-30 minutes (up to 48 hours)
- Check: `nslookup api.lesstoken.app`

**Result:** `api.lesstoken.app` resolves to Railway

---

### Step 4: Testing - 30 min

**4.1 Backend Health Check**
```bash
curl https://api.lesstoken.app/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

**4.2 Frontend Test**
```bash
curl https://lesstoken.app
# Expected: HTML response
```

**4.3 Full User Flow**
1. Go to https://lesstoken.app/app
2. Sign up with test email
3. Log in
4. Paste test text
5. Click "Optimize"
6. Verify results show
7. Check history page

---

### Step 5: Launch - 1 hour

**5.1 Test All Pages**
- [ ] Landing page (/)
- [ ] Guide page (/guide)
- [ ] Contact page (/contact)
- [ ] Web app (/app)
  - [ ] Auth (login/signup)
  - [ ] Dashboard
  - [ ] Optimize
  - [ ] History

**5.2 Browser Testing**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if possible)
- [ ] Mobile responsiveness

**5.3 Error Scenarios**
- [ ] Invalid login credentials
- [ ] Network error during optimize
- [ ] Missing API key
- [ ] Very long text input
- [ ] Clear history

**5.4 Performance Check**
- [ ] Page load time < 2 seconds
- [ ] Optimization response < 5 seconds
- [ ] No console errors

---

## 📊 Launch Checklist

### Pre-Launch
- [ ] Backend deployed and healthy
- [ ] Frontend deployed and working
- [ ] DNS records propagated
- [ ] All pages tested
- [ ] Logo displays correctly
- [ ] Contact form works
- [ ] Email notifications setup

### Launch Day
- [ ] Announce on Twitter
- [ ] Post on GitHub
- [ ] Send to email list (if exists)
- [ ] Monitor uptime
- [ ] Check error logs

### Post-Launch
- [ ] Monitor analytics (if enabled)
- [ ] Respond to user feedback
- [ ] Fix any reported bugs within 24h
- [ ] Plan Phase 4 features

---

## 🆘 Troubleshooting

### Backend not responding
```bash
# Check Railway logs
# Check environment variables are set
# Verify database connection
# Check API key validity
```

### Frontend can't reach backend
```bash
# Check NEXT_PUBLIC_API_URL in Vercel
# Verify CORS headers in app.py
# Check if api.lesstoken.app resolves
# Check Railway endpoint is correct
```

### DNS not resolving
```bash
# Wait 30+ minutes for propagation
# Flush DNS: ipconfig /flushdns
# Check: nslookup api.lesstoken.app
# Verify Porkbun records are correct
```

### Database errors
```bash
# Check DATABASE_URL is set
# Verify Postgres connection
# Check migrations ran
# Check disk space on Railway
```

---

## 📞 Support Contacts

- **GitHub Issues:** https://github.com/NuraydinArikan/lesstoken-landing/issues
- **Email:** nuraydinarikan@gmail.com
- **Contact Form:** https://lesstoken.app/contact

---

## 🎯 Success Criteria

✅ All deployment steps completed
✅ All pages load without errors
✅ Auth system works (signup/login)
✅ Optimization endpoint responds
✅ History saves correctly
✅ No console errors
✅ Mobile responsive
✅ API rate limiting working
✅ Logs accessible
✅ Monitoring configured

---

## 📈 Next Steps (Phase 4+)

1. Browser Extension release to Chrome Web Store
2. User feedback collection
3. Bug fixes and improvements
4. Advanced features (templates, batch processing)
5. Firefox extension port
6. Mobile app

---

**Timeline:** ~2-3 hours for complete deployment and testing
**Team:** 1 developer
**Risk:** Low (separate frontend/backend, easy rollback)

Good luck! 🚀
