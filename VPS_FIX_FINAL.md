# FINAL FIX for Blank Page at redweyne.com/InboxAI

## What Was Wrong

**TWO PROBLEMS were causing the blank page:**

### Problem 1: Wrong Path Resolution (SERVER ERROR)
The error in your logs:
```
TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined
at serveStatic (/var/www/InboxAI/dist/server/index.cjs:833603:48)
```

**Root Cause:** In `server/vite.ts`, the code was:
```typescript
const distPath = path.resolve(__dirname, "public");
```

In production, `__dirname` is `dist/server/`, so it was looking for `dist/server/public` which **doesn't exist**!
The static files are actually in `dist/public/`.

**Fix Applied:**
```typescript
const distPath = path.resolve(__dirname, "..", "public");
```
This correctly resolves to `dist/public/`.

### Problem 2: Case Sensitivity Mismatch (YOUR .env FILE)
Your .env shows:
```
APP_BASE_PATH=/inboxai    <- LOWERCASE!
```

But your URL is:
```
redweyne.com/InboxAI      <- UPPERCASE!
```

**Linux is case-sensitive!** `/inboxai` and `/InboxAI` are completely different paths.

---

## STEPS TO FIX YOUR VPS

### Step 1: SSH into your VPS
```bash
ssh root@your-vps-ip
cd /var/www/InboxAI
```

### Step 2: Pull the latest code
```bash
git pull origin main
```

### Step 3: FIX YOUR .env FILE (CRITICAL!)
```bash
nano .env
```

Change this line:
```
APP_BASE_PATH=/inboxai
```

To this (UPPERCASE!):
```
APP_BASE_PATH=/InboxAI
```

Also update the redirect URI:
```
GOOGLE_REDIRECT_URI=https://redweyne.com/InboxAI/api/auth/google/callback
```

Save and exit (Ctrl+X, Y, Enter).

### Step 4: Rebuild the application
```bash
npm run build
```

### Step 5: Verify the build
Check that the path resolution is correct:
```bash
grep "distPath" dist/server/vite.js | head -1
```

You should see:
```
const distPath = path.resolve(__dirname, "..", "public");
```

### Step 6: Restart PM2
```bash
pm2 restart InboxAI
```

### Step 7: Check PM2 logs
```bash
pm2 logs InboxAI --lines 20
```

You should see:
```
[SERVER DEBUG] APP_BASE_PATH: "/InboxAI" | distPath: "/var/www/InboxAI/dist/public"
```

### Step 8: Test in browser
Visit https://redweyne.com/InboxAI - it should now work!

---

## Troubleshooting

### If you still see errors:

1. **Check PM2 logs for any errors:**
   ```bash
   pm2 logs InboxAI --err --lines 50
   ```

2. **Make sure dist/public exists:**
   ```bash
   ls -la dist/
   ```
   You should see both `public/` and `server/` directories.

3. **Force cache clear in browser:**
   Press Ctrl+Shift+R or open in incognito mode.

4. **Verify .env has correct case:**
   ```bash
   cat .env | grep BASE_PATH
   ```
   Must show `/InboxAI` (uppercase I and A).

---

## Summary of Changes

| What | Before | After |
|------|--------|-------|
| server/vite.ts distPath | `__dirname, "public"` | `__dirname, "..", "public"` |
| .env APP_BASE_PATH | /inboxai (lowercase) | /InboxAI (uppercase) |
| .env GOOGLE_REDIRECT_URI | .../inboxai/... | .../InboxAI/... |
