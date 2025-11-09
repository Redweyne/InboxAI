# Fix Guide for redweyne.com Deployment

## 🔴 Issues Identified from Your Logs

Your application is running but **3 critical environment variables are missing**:

1. **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET** - Causing Gmail/Calendar auth to fail
2. **GEMINI_API_KEY** - Causing AI chat to fail  
3. **APP_URL** - Should be set to `https://redweyne.com`

---

## 🚀 QUICK FIX (15 minutes)

### Step 1: Get Google OAuth Credentials (5 min)

1. Go to: https://console.cloud.google.com/
2. Click **"Select a project"** → **"New Project"**
3. Name it: `Inbox AI` → Click **Create**
4. Wait for the project to be created, then select it

**Enable APIs:**
5. Click **"+ ENABLE APIS AND SERVICES"**
6. Search for **"Gmail API"** → Click it → Click **ENABLE**
7. Search for **"Google Calendar API"** → Click it → Click **ENABLE**

**Create Credentials:**
8. Go to **APIs & Services** → **Credentials**
9. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
10. If prompted, configure OAuth consent screen:
    - User Type: **External**
    - App name: `Inbox AI`
    - User support email: your email
    - Developer contact: your email
    - Click **Save and Continue** through all steps
11. Back to Create OAuth client ID:
    - Application type: **Web application**
    - Name: `Inbox AI Production`
    - Authorized redirect URIs: Click **+ ADD URI**
      - Enter: `https://redweyne.com/api/auth/google/callback`
    - Click **CREATE**

**Save Your Credentials:**
12. You'll see a popup with:
    - **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
    - **Client Secret** (looks like: `GOCSPX-xyz123abc456`)
    
📋 **Copy both** - you'll need them in Step 3!

---

### Step 2: Get Gemini API Key (2 min)

1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Select **"Create API key in new project"** or use existing project
4. Click **Copy** to save your API key (looks like: `AIzaSy...`)

📋 **Copy this** - you'll need it in Step 3!

---

### Step 3: Add Environment Variables to Your VPS (5 min)

**Connect to your VPS:**
```bash
ssh root@YOUR_SERVER_IP
```

**Navigate to your app directory:**
```bash
cd /var/www/inbox-ai
```

**Create/Edit the .env file:**
```bash
nano .env
```

**Add these lines** (replace with YOUR actual values):
```bash
# Application
NODE_ENV=production
PORT=5000
APP_URL=https://redweyne.com

# Database (keep your existing DATABASE_URL)
DATABASE_URL=postgresql://username:password@localhost:5432/inbox_ai

# Google OAuth - PASTE YOUR VALUES HERE
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123abc456

# Gemini AI - PASTE YOUR VALUE HERE
GEMINI_API_KEY=AIzaSy...
```

**Save the file:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

---

### Step 4: Restart Your Application (2 min)

```bash
# Restart the PM2 process
pm2 restart inbox-ai

# Check the logs to verify it's working
pm2 logs inbox-ai --lines 50
```

**Look for:**
- ✅ No more "Method doesn't allow unregistered callers" errors
- ✅ No more "auth_failed" database errors
- ✅ Application starting successfully

---

## 🧪 Test Your Fixes

1. Go to: https://redweyne.com
2. Try the **AI Chat** - should work now
3. Click **Connect Google Account** - should redirect to Google OAuth
4. Grant permissions - should sync Gmail/Calendar

---

## 🔍 Troubleshooting

**If Google OAuth still fails:**
- Double-check the redirect URI in Google Cloud Console is **exactly**: `https://redweyne.com/api/auth/google/callback`
- Make sure APP_URL in .env is **exactly**: `https://redweyne.com` (no trailing slash)

**If AI chat still fails:**
- Verify GEMINI_API_KEY is correctly copied (no extra spaces)
- Check PM2 logs: `pm2 logs inbox-ai`

**If database errors persist:**
- Verify DATABASE_URL is correctly set in .env
- Test connection: `psql $DATABASE_URL`

---

## 📞 Need Help?

If issues persist after following these steps, run:
```bash
pm2 logs inbox-ai --lines 100
```

And share the output - I'll help you debug further!
