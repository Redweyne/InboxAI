# VPS Subpath API Fix - Critical Update

## Problem
After migrating from `redweyne.com` to `redweyne.com/InboxAI`, the application showed only a skeleton page with non-functional buttons because:

1. **API routes were not prefixed**: The server registered routes at `/api/...` but the client was calling `/inboxai/api/...`
2. **All API requests returned 404**: Dashboard data, sync, authentication - everything failed
3. **OAuth callback was broken**: Google redirected to `/inboxai/api/auth/google/callback` which didn't exist

## Solution Applied
- All API routes are now mounted under the base path using Express Router
- The base path is read from `APP_BASE_PATH` environment variable
- OAuth redirect URIs now include the base path

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

Make sure your `.env` file has the correct configuration:

```env
# CRITICAL: Set the base path for subpath deployment
APP_BASE_PATH=/inboxai

# App URL (without trailing slash, without the subpath)
APP_URL=https://redweyne.com

# OAuth Redirect URI (MUST include the full path with /inboxai)
GOOGLE_REDIRECT_URI=https://redweyne.com/inboxai/api/auth/google/callback
```

### Step 4: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://redweyne.com/inboxai/api/auth/google/callback
   ```
5. Click **Save** and wait 2-3 minutes for changes to propagate

### Step 5: Restart PM2

```bash
pm2 restart InboxAI
```

### Step 6: Verify the Fix

1. Visit `https://redweyne.com/inboxai`
2. Open browser DevTools (F12) > Network tab
3. Refresh the page
4. You should see API calls going to `/inboxai/api/...` returning 200 status codes

Check specifically:
- `/inboxai/api/auth/status` - Should return `{"authenticated": true/false}`
- `/inboxai/api/dashboard` - Should return dashboard data
- `/inboxai/api/emails` - Should return emails array

### Step 7: Test OAuth

1. Click "Sync Now" button
2. Google OAuth popup should appear
3. After authentication, you should be redirected back correctly
4. Data should start syncing

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_BASE_PATH` | The subpath where the app is hosted | `/inboxai` |
| `APP_URL` | The base domain (no trailing slash) | `https://redweyne.com` |
| `GOOGLE_REDIRECT_URI` | Full OAuth callback URL | `https://redweyne.com/inboxai/api/auth/google/callback` |

## Troubleshooting

### API calls still return 404
- Verify `APP_BASE_PATH=/inboxai` is in your `.env`
- Restart PM2: `pm2 restart InboxAI`
- Check logs: `pm2 logs InboxAI`

### OAuth returns error
- Verify `GOOGLE_REDIRECT_URI` includes `/inboxai`
- Check Google Cloud Console has the exact same redirect URI
- Wait 2-3 minutes after adding redirect URI

### Check server logs
```bash
pm2 logs InboxAI --lines 50
```

You should see:
```
Registering routes with base path: "/inboxai" (API at /inboxai/api/...)
API routes mounted at: /inboxai/api
```
