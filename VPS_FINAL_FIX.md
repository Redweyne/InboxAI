# FINAL VPS FIX - InboxAI Deployment Guide

## Root Cause Analysis

Your VPS deployment was broken due to **THREE critical issues**:

### 1. **Static Assets Not Serving** (404 on all CSS/JS)
- **Problem**: Server mounted static files at `/` instead of `/inboxai`
- **Result**: All asset requests (`/inboxai/assets/...`) returned 404
- **Fix**: Updated `server/vite.ts` to mount on `APP_BASE_PATH=/inboxai`

### 2. **Build Still Using esbuild** (Directory Import Errors)
- **Problem**: Despite claiming to use tsc, `package.json` still used esbuild
- **Result**: ERR_UNSUPPORTED_DIR_IMPORT errors on VPS
- **Fix**: Switched to `tsc -p tsconfig.server.json` for clean ESM output

### 3. **ESM Import Compliance**  
- **Problem**: Server code used extensionless imports incompatible with Node ESM
- **Result**: Build failed with "need explicit file extensions" errors
- **Fix**: Added .js extensions to all relative imports, replaced @shared/* with relative paths

---

## Deployment Steps

### Step 1: Pull Latest Code on VPS

```bash
cd /var/www/InboxAI
git pull origin main
```

### Step 2: Set Environment Variables

Add this to your `.env` file on the VPS:

```bash
# Base path for subpath deployment
APP_BASE_PATH=/inboxai

# OAuth redirect must include /inboxai
GOOGLE_REDIRECT_URI=https://redweyne.com/inboxai/auth/google/callback

# Other existing vars...
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
APP_URL=https://redweyne.com/inboxai
NODE_ENV=production
DATABASE_URL=your_database_url_here
SESSION_SECRET=your_session_secret_here
```

### Step 3: Install Dependencies & Build

```bash
npm install
npm run build
```

**Verify the build output:**
- Should see: `dist/server/index.js` (NOT index.cjs)
- Should see: `dist/public/` with HTML/CSS/JS files

### Step 4: Update Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Update **Authorized redirect URIs** to:
   ```
   https://redweyne.com/inboxai/auth/google/callback
   ```

### Step 5: Restart PM2

```bash
pm2 restart InboxAI
pm2 logs InboxAI --lines 50
```

### Step 6: Test the Application

1. Visit: `https://redweyne.com/inboxai`
2. Should redirect to `/inboxai` automatically
3. Click "Sync Now" - should open Google OAuth
4. After auth, emails should sync successfully

---

## Verification Checklist

✅ **Assets Loading**: Open browser DevTools, verify all `/inboxai/assets/*` files load (200 status)
✅ **OAuth Working**: Click "Sync Now", should redirect to Google consent screen
✅ **Emails Syncing**: After OAuth, dashboard should show real emails
✅ **Logout Visible**: Logout button should appear in header after authentication
✅ **No Errors**: PM2 logs should show no ERR_UNSUPPORTED_DIR_IMPORT errors

---

## What Changed (Technical Details)

### server/vite.ts
```javascript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const basePath = process.env.APP_BASE_PATH || '/inboxai';

  app.use(basePath, express.static(distPath));
  app.use(`${basePath}/*`, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  
  // Redirect root to the app base path
  app.get('/', (_req, res) => {
    res.redirect(basePath);
  });
}
```

### package.json
```json
"scripts": {
  "build:server": "tsc -p tsconfig.server.json",
  "start": "NODE_ENV=production node dist/server/index.js"
}
```

### tsconfig.server.json
```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

---

## Troubleshooting

### Assets Still 404?
Check `APP_BASE_PATH` in `.env` is set to `/inboxai`

### OAuth 400 Error?
Verify `GOOGLE_REDIRECT_URI` includes `/inboxai` and matches Google Console

### Directory Import Error?
Make sure you rebuilt with `npm run build` (not old cached build)

### PM2 Won't Start?
Check logs: `pm2 logs InboxAI --err --lines 100`

---

## Support

If issues persist after following these steps, provide:
1. PM2 error logs: `pm2 logs InboxAI --err --lines 100`
2. Nginx configuration for `/inboxai` location
3. Environment variables (redact secrets): `cat .env | grep -v SECRET`
