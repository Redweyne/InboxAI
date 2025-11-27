# VPS Subpath API Fix - Critical Update (CASE SENSITIVE!)

## Problem
After migrating from `redweyne.com` to `redweyne.com/InboxAI`, the application showed only a skeleton page with non-functional buttons because:

1. **CASE SENSITIVITY MISMATCH**: Vite config used `/inboxai/` (lowercase) but VPS URL uses `/InboxAI` (with capitals). Linux is case-sensitive!
2. **Client-side routing broken**: Wouter router had base `/inboxai/` but actual URL was `/InboxAI`
3. **All API requests returned 404**: Client called `/inboxai/api/...` but Nginx serves `/InboxAI/...`
4. **OAuth callback was broken**: Redirect URI didn't match actual path

## Solution Applied
- **Fixed Vite config** to use `/InboxAI/` (matching VPS URL exactly)
- All API routes mount under `APP_BASE_PATH` using Express Router
- OAuth redirect URIs now use the correct case `/InboxAI/`

## How to Deploy This Fix

### Step 1: Update Your VPS Code

SSH into your VPS and pull the latest code:

```bash
cd /var/www/InboxAI
git pull origin main
```

### Step 2: Rebuild the Application

```bash
npm run build
```

### Step 3: Update Your .env File

**CRITICAL: Use `/InboxAI` with capital letters to match the URL!**

```env
# CRITICAL: Set the base path for subpath deployment (CASE SENSITIVE!)
APP_BASE_PATH=/InboxAI

# App URL (without trailing slash, without the subpath)
APP_URL=https://redweyne.com

# OAuth Redirect URI (MUST include the full path with /InboxAI - capital letters!)
GOOGLE_REDIRECT_URI=https://redweyne.com/InboxAI/api/auth/google/callback
```

### Step 4: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://redweyne.com/InboxAI/api/auth/google/callback
   ```
5. **Remove the old lowercase URI** if present:
   ```
   https://redweyne.com/inboxai/api/auth/google/callback  <-- DELETE THIS
   ```
6. Click **Save** and wait 2-3 minutes for changes to propagate

### Step 5: Restart PM2

```bash
pm2 restart InboxAI
```

### Step 6: Verify the Fix

1. Visit `https://redweyne.com/InboxAI`
2. Open browser DevTools (F12) > Network tab
3. Refresh the page
4. You should see API calls going to `/InboxAI/api/...` returning 200 status codes

Check specifically:
- `/InboxAI/api/auth/status` - Should return `{"authenticated": true/false}`
- `/InboxAI/api/dashboard` - Should return dashboard data
- `/InboxAI/api/emails` - Should return emails array

### Step 7: Test Navigation

1. Click on "Dashboard" in the sidebar
2. URL should stay at `redweyne.com/InboxAI` (NOT change to `redweyne.com`)
3. Click on "Chat", "Inbox", "Calendar" - all should stay under `/InboxAI/`

### Step 8: Test OAuth

1. Click "Sync Now" button
2. Google OAuth popup should appear
3. After authentication, you should be redirected back correctly
4. Data should start syncing

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_BASE_PATH` | The subpath where the app is hosted (CASE SENSITIVE!) | `/InboxAI` |
| `APP_URL` | The base domain (no trailing slash) | `https://redweyne.com` |
| `GOOGLE_REDIRECT_URI` | Full OAuth callback URL (CASE SENSITIVE!) | `https://redweyne.com/InboxAI/api/auth/google/callback` |

## Troubleshooting

### Navigation goes to root URL (redweyne.com instead of redweyne.com/InboxAI)
- This was the case sensitivity bug - pull latest code and rebuild
- Verify Vite config has `base: '/InboxAI/'` with correct case

### API calls still return 404
- Verify `APP_BASE_PATH=/InboxAI` is in your `.env` (capital letters!)
- Restart PM2: `pm2 restart InboxAI`
- Check logs: `pm2 logs InboxAI`

### OAuth returns error
- Verify `GOOGLE_REDIRECT_URI` uses `/InboxAI` (capital letters!)
- Check Google Cloud Console has the exact same redirect URI with same case
- Wait 2-3 minutes after adding redirect URI

### Check server logs
```bash
pm2 logs InboxAI --lines 50
```

You should see:
```
Registering routes with base path: "/InboxAI" (API at /InboxAI/api/...)
API routes mounted at: /InboxAI/api
```
