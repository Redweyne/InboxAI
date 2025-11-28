# VPS PM2 Configuration Fix

## Problem
The ecosystem.config.js in the codebase was pointing to `dist/server/index.cjs` (OLD) but the build now produces `dist/server/index.js` (ESM format). This file has now been fixed.

## Quick Fix (SSH into your VPS)

**Run these 4 commands:**

```bash
cd /var/www/InboxAI
git pull origin main
rm -rf dist && npm run build
pm2 restart ecosystem.config.js && pm2 save
```

That's it! The fix is already in the code - you just need to pull and restart.

## Verify it's running

```bash
pm2 logs InboxAI --lines 20
```

You should see:
```
Registering routes with base path: "/inboxai"
API routes mounted at: /inboxai/api
serving on port 5000
```

## What Was Fixed
The `ecosystem.config.js` file was updated from:
- `script: 'dist/server/index.cjs'` (OLD - doesn't exist)
- `script: 'dist/server/index.js'` (NEW - correct path)

The build system was changed from esbuild (which produced .cjs files) to TypeScript's native compiler tsc (which produces .js files).
