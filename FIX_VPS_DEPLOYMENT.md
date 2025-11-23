# 🔧 Fix VPS Deployment - Final Solution

## 🎯 The Real Problem

The issue was **NOT** just the vite config import. The real problem was that esbuild wasn't properly handling the `@shared` TypeScript path aliases. When the code ran on VPS, it tried to resolve `@shared/schema` at runtime, which failed because path aliases only work during development with TypeScript.

## ✅ The Solution

1. ✅ Created `esbuild.config.js` with proper alias configuration
2. ✅ Updated build script to use the new config
3. ✅ Fixed vite.ts to use dynamic import (from previous attempt)
4. ✅ Shared code is now properly bundled into `dist/index.js`

## 🚀 Deploy to VPS - Step by Step

### Step 1: SSH into Your VPS

```bash
ssh root@redweyne.com
```

---

### Step 2: Navigate to Directory

```bash
cd /var/www/InboxAI
```

---

### Step 3: Backup Current Working Code (Safety First!)

```bash
# Create a backup
cp -r dist dist.backup
cp package.json package.json.backup
```

---

### Step 4: Pull Latest Code

```bash
git pull origin main
```

**Expected output:**
```
Updating abc1234..def5678
Fast-forward
 esbuild.config.js | 25 +++++++++++++++++++++++++
 package.json      |  2 +-
 server/vite.ts    |  6 ++++--
 3 files changed, 30 insertions(+), 3 deletions(-)
 create mode 100644 esbuild.config.js
```

---

### Step 5: Verify Files Were Updated

Check that the new esbuild config exists:
```bash
ls -la esbuild.config.js
```

**Expected:** You should see the file listed

Check the build script was updated:
```bash
cat package.json | grep "build"
```

**Expected output:**
```
    "build": "vite build && node esbuild.config.js",
```

---

### Step 6: Rebuild the Application

```bash
npm run build
```

**Expected output:**
```
> rest-express@1.0.0 build
> vite build && node esbuild.config.js

vite v5.4.20 building for production...
✓ 2840 modules transformed.
✓ built in XXs
✓ Server built successfully
```

**✅ IMPORTANT:** You should see `✓ Server built successfully` at the end!

---

### Step 7: Verify the Built File is Correct

```bash
ls -lh dist/index.js
```

**Expected:** File should be around 93K in size

Check the file has the shared schema bundled:
```bash
head -50 dist/index.js | grep "shared/schema"
```

**Expected output:**
```
// shared/schema.ts
```

✅ **If you see this, the build is correct!**

---

### Step 8: Restart PM2

```bash
pm2 restart InboxAI
```

Wait 3-5 seconds, then check logs:
```bash
pm2 logs InboxAI --lines 50
```

**Expected output:**
```
serving on port 5000
GET /api/auth/status 200 in 3ms
GET /api/dashboard 200 in 15ms
```

**✅ CRITICAL:** You should see `serving on port 5000` and NO ERROR messages about directory imports!

---

### Step 9: Test the Application

#### Test 1: Dashboard Loads

Open browser and visit:
```
https://redweyne.com/inboxai
```

**Expected:**
- ✅ Dashboard loads (no "Failed to load dashboard data")
- ✅ Sidebar navigation appears
- ✅ Welcome message appears
- ✅ Sync Now button appears

---

#### Test 2: API Endpoints Work

From your VPS terminal:
```bash
curl http://localhost:5000/api/auth/status
```

**Expected output:**
```json
{"authenticated":false}
```
or
```json
{"authenticated":true}
```

✅ **If you get a JSON response, the API is working!**

---

#### Test 3: Google OAuth Sync

**IMPORTANT:** This is the final test.

1. In browser, click **"Sync Now"** button
2. OAuth window should open
3. Authenticate with Google
4. Window closes
5. Sync begins

**Expected:**
- ✅ OAuth window opens (NO 405 error)
- ✅ After auth, you see "Syncing emails and calendar events..."
- ✅ Dashboard updates with your email data

---

## 🔍 Troubleshooting

### Issue: Git pull says "Already up to date"

This means the code wasn't pushed from Replit.

**Solution on Replit:**
```bash
git add -A
git commit -m "Fix VPS deployment with proper esbuild config"
git push origin main
```

Then try pulling on VPS again.

---

### Issue: Build fails

**Error: "Cannot find module 'esbuild'"**

This shouldn't happen, but if it does:
```bash
npm install
npm run build
```

---

### Issue: PM2 logs show "Directory import error"

This means the build didn't work correctly.

**Check:**
```bash
cat dist/index.js | head -50
```

**Look for:**
```javascript
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
```

If you DON'T see these lines at the top, the build failed.

**Fix:**
```bash
rm -rf dist
npm run build
pm2 restart InboxAI
```

---

### Issue: OAuth returns 405 "Not Allowed"

This is a **different issue** (not related to the build).

The 405 error means the OAuth callback URL is wrong or not allowed.

**Check:**
```bash
curl http://localhost:5000/api/auth/debug
```

Copy the `redirectUri` value and add it to Google Cloud Console:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Credentials → OAuth 2.0 Client ID
4. Add the redirect URI EXACTLY as shown in the debug output
5. Save and wait 2-3 minutes

---

### Issue: Application loads but shows "Failed to load dashboard data"

**Check PM2 logs:**
```bash
pm2 logs InboxAI --lines 100
```

Look for the actual error. It might be:
- Database connection issue
- Missing environment variables
- Port already in use

**Most common fix:**
```bash
# Verify .env file has correct values
cat .env

# Should show:
# NODE_ENV=production
# PORT=5000
# APP_URL=https://redweyne.com/inboxai
# DATABASE_URL=postgresql://...
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GEMINI_API_KEY=...
```

---

## 📝 What Changed

### Files Modified:

1. **`esbuild.config.js`** (NEW FILE)
   - Properly configures esbuild with alias for @shared imports
   - Adds banner with require/filename/dirname helpers for ESM

2. **`package.json`**
   - Build script now uses `node esbuild.config.js`
   - Instead of inline esbuild command

3. **`server/vite.ts`** (from previous fix)
   - Dynamic import of vite config to avoid bundling issues

---

## ✅ Success Checklist

After deploying:

- [ ] Code pulled successfully from Git
- [ ] Build completed with "✓ Server built successfully"
- [ ] `dist/index.js` is ~93K in size
- [ ] PM2 logs show "serving on port 5000"
- [ ] NO "Directory import" errors in PM2 logs
- [ ] Dashboard loads at `https://redweyne.com/inboxai`
- [ ] No "Failed to load dashboard data" error
- [ ] Sync Now button opens OAuth window (not 405 error)
- [ ] After OAuth, emails sync successfully

---

## 🎉 Done!

Once all checklist items are complete, your InboxAI application will be fully working at `https://redweyne.com/inboxai` with:
- ✅ Proper subpath routing
- ✅ All shared code bundled correctly
- ✅ Google OAuth working
- ✅ Email and Calendar sync functional

**The key difference:** The production bundle now includes all the shared TypeScript code, so there are no runtime import errors!
