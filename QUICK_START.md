# 🚀 Quick Start - Deploy in 30 Minutes

## Before You Begin - Gather These:

### 1. From Contabo Email:
- [ ] Server IP Address: `_______________`
- [ ] Root Password: `_______________`

### 2. Create These Accounts (Free):
- [ ] Google Cloud Console account ([console.cloud.google.com](https://console.cloud.google.com/))
- [ ] Google AI Studio account ([aistudio.google.com](https://aistudio.google.com/))

### 3. Optional:
- [ ] Domain name (e.g., from Namecheap or Cloudflare)

---

## 🎯 The Deployment Process (30-45 minutes)

### Phase 1: Server Setup (10 min)
1. Connect to VPS via SSH
2. Update system
3. Install: Node.js, PostgreSQL, Nginx, Git, PM2

### Phase 2: Get Credentials (10 min)
1. Google OAuth credentials
2. Gemini API key

### Phase 3: Deploy App (15 min)
1. Upload code to VPS
2. Configure environment variables
3. Build and start application
4. Configure web server

### Phase 4: Go Live (5 min)
1. Configure firewall
2. Set up domain (optional)
3. Install SSL (optional)
4. Test everything

---

## 📝 Quick Command Reference

### Connect to VPS
```bash
ssh root@YOUR_SERVER_IP
```

### Check Application Status
```bash
pm2 status
pm2 logs inbox-ai
```

### Restart Application
```bash
pm2 restart inbox-ai
```

### View All Logs
```bash
pm2 logs inbox-ai --lines 100
```

---

## 🔗 Important Links

- **Full Guide:** `CONTABO_DEPLOYMENT_GUIDE.md`
- **Google Cloud Console:** https://console.cloud.google.com/
- **Google AI Studio:** https://aistudio.google.com/app/apikey
- **PuTTY (Windows SSH):** https://www.putty.org/
- **FileZilla (File Upload):** https://filezilla-project.org/

---

## 📞 Troubleshooting Quick Fixes

**App not accessible?**
```bash
pm2 restart inbox-ai
systemctl restart nginx
```

**Check what went wrong:**
```bash
pm2 logs inbox-ai --err --lines 50
```

**Database issues:**
```bash
cd /var/www/inbox-ai
npm run db:push
pm2 restart inbox-ai
```

---

## ✅ Success Indicators

You'll know it's working when:
- [ ] `pm2 status` shows `inbox-ai` as `online`
- [ ] You can access the site in your browser
- [ ] Dashboard loads with "Good afternoon!" message
- [ ] "Sync Now" button redirects to Google login
- [ ] Chat responds to your messages

---

**Ready? Open `CONTABO_DEPLOYMENT_GUIDE.md` and let's go! 🚀**
