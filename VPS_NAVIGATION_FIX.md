# VPS Navigation Fix

## Problem
Clicking on navigation links (Dashboard, Inbox, etc.) redirected to redweyne.com instead of staying at /inboxai.

## Root Cause
Wouter Router ignores base paths that end with a trailing slash (`/inboxai/`). The router was receiving the raw Vite BASE_URL which includes the trailing slash, causing it to not prepend the base path to navigation links.

## Fix Applied
Changed App.tsx to use the trimmed base path (no trailing slash) from `base-path.ts`:
- Before: `base={import.meta.env.BASE_URL}` -> `/inboxai/` (ignored by Wouter)
- After: `base={basePath}` -> `/inboxai` (works correctly)

## Deploy to VPS

Run these commands on your VPS:

```bash
cd /var/www/InboxAI

# Pull latest code
git pull origin main

# Rebuild the application
npm run build

# Restart PM2
pm2 restart inboxai
```

## Verification

After deploying, open browser DevTools console and verify:
1. Navigate to redweyne.com/inboxai/
2. Check console for: `[ROUTER DEBUG] basePath: "/inboxai" | routerBase: "/inboxai"`
3. Click Dashboard - URL should stay at redweyne.com/inboxai/
4. Click Inbox - URL should go to redweyne.com/inboxai/inbox
5. All navigation should stay within the /inboxai subpath

## Important
Make sure your VPS `.env` file has:
```
APP_BASE_PATH=/inboxai
```
(lowercase, no trailing slash)
