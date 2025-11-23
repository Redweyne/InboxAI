# 🔧 Fix VPS Subpath Module Import Error

## 🎯 Problem

After moving InboxAI to `/inboxai` subpath, the VPS shows this error:
```
Error: [ERR_UNSUPPORTED_DIR_IMPORT]: Directory import '/var/www/InboxAI/InboxAI' is not supported resolving ES modules
```

**Root Cause:** The server code was importing `vite.config.ts` at the top level, which caused path resolution issues when esbuild bundled the production code.

**Solution:** Changed to dynamic import so the vite config is only loaded when needed (development mode only).

---

## ✅ Fix Applied on Replit

The fix has been applied to `server/vite.ts`:
- ✅ Removed top-level import of `vite.config`
- ✅ Changed to dynamic import inside `setupVite()` function
- ✅ Build tested successfully - no errors

---

## 🚀 Deploy Fix to VPS

### Step 1: SSH into Your VPS

```bash
ssh root@redweyne.com
```

---

### Step 2: Navigate to InboxAI Directory

```bash
cd /var/www/InboxAI
```

---

### Step 3: Pull Latest Code

```bash
git pull origin main
```

**Expected output:**
```
Updating abc1234..def5678
Fast-forward
 server/vite.ts | 6 ++++--
 1 file changed, 4 insertions(+), 2 deletions(-)
```

---

### Step 4: Rebuild the Application

```bash
npm run build
```

**Expected output:**
- Build should complete successfully
- You should see: `✓ built in X seconds`
- You should see: `dist/index.js X kb`

---

### Step 5: Restart PM2

```bash
pm2 restart InboxAI
pm2 logs InboxAI --lines 50
```

**Expected output in logs:**
```
serving on port 5000
```

✅ **If you see "serving on port 5000", the fix worked!**

❌ **If you still see errors, continue reading below**

---

## 🧪 Testing

### Test 1: Check Application Loads

Open browser and visit:
```
https://redweyne.com/inboxai
```

**Expected:**
- ✅ Dashboard loads without errors
- ✅ No error messages in the UI
- ✅ Browser console shows no errors (press F12 to check)

---

### Test 2: Check API Endpoints

From your VPS, run:
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

✅ **If you get a JSON response, API is working**

---

### Test 3: Test Google OAuth Sync

1. Visit `https://redweyne.com/inboxai`
2. Click **"Sync Now"** button
3. Google OAuth window should open
4. Authenticate and allow permissions
5. Window closes and sync begins

**Expected:**
- ✅ OAuth window opens (no 400 error)
- ✅ After authentication, emails sync successfully
- ✅ Dashboard updates with email data

---

## 🔍 Troubleshooting

### Issue: Still seeing module import error after pulling code

**Check 1: Verify the fix was pulled**
```bash
cat server/vite.ts | grep "Dynamic import"
```

**Expected output:**
```
  // Dynamic import to avoid bundling issues in production
```

If you don't see this comment, the code wasn't pulled correctly.

**Fix:**
```bash
# Force pull
git fetch origin
git reset --hard origin/main
npm install
npm run build
pm2 restart InboxAI
```

---

### Issue: Build fails with errors

**Check error message carefully.** Common issues:

**Error: "Cannot find module"**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run build
```

**Error: "EACCES: permission denied"**
```bash
# Fix permissions
chown -R root:root /var/www/InboxAI
npm run build
```

---

### Issue: PM2 restart doesn't pick up changes

**Force restart:**
```bash
pm2 delete InboxAI
pm2 start dist/index.js --name InboxAI
pm2 save
```

---

### Issue: Application still shows errors in browser

**Check 1: Verify Nginx is serving the new build**
```bash
ls -la /var/www/InboxAI/dist/public/
```

You should see files with recent timestamps.

**Check 2: Clear browser cache**
- Press F12 to open Developer Tools
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

**Check 3: Check Nginx logs**
```bash
tail -f /var/log/nginx/error.log
```

Look for any 404 or 500 errors.

---

### Issue: OAuth still returns 400 error

This is a **different issue** (not related to the module import error).

**Check:**
```bash
curl http://localhost:5000/api/auth/debug
```

Copy the `redirectUri` and verify it matches Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Credentials → OAuth 2.0 Client ID
3. Check "Authorized redirect URIs" includes:
   ```
   https://redweyne.com/inboxai/api/auth/google/callback
   ```

---

## 📝 Summary of Fix

### What Changed:
**File:** `server/vite.ts`

**Before (problematic):**
```typescript
import viteConfig from "../vite.config";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    // ...
  });
}
```

**After (fixed):**
```typescript
// No top-level import

export async function setupVite(app: Express, server: Server) {
  // Dynamic import to avoid bundling issues in production
  const viteConfigModule = await import("../vite.config.js");
  const viteConfig = viteConfigModule.default;

  const vite = await createViteServer({
    ...viteConfig,
    // ...
  });
}
```

### Why This Fixes It:
1. **Top-level imports** are processed when esbuild bundles the code
2. Importing `vite.config.ts` caused path resolution issues
3. **Dynamic imports** are only executed at runtime
4. In production, `setupVite()` is never called (only in development)
5. So the problematic import never happens in production

---

## ✅ Success Checklist

After deploying the fix:

- [ ] Code pulled from Git successfully
- [ ] Build completed without errors
- [ ] PM2 restarted successfully
- [ ] `pm2 logs` shows "serving on port 5000"
- [ ] Application loads at `https://redweyne.com/inboxai`
- [ ] No console errors in browser (F12)
- [ ] Sync Now button opens OAuth window
- [ ] Email sync works successfully

---

## 🎉 Done!

Your InboxAI application should now be working correctly at `https://redweyne.com/inboxai` with all features functional!

**Need more help?**
- Check PM2 logs: `pm2 logs InboxAI`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
- Check application logs: The PM2 logs will show any server errors
