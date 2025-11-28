# VPS PM2 Configuration Fix

## Problem
PM2 is configured to run `dist/server/index.cjs` but the build now produces `dist/server/index.js` (ESM format).

## Quick Fix (SSH into your VPS)

### Step 1: Rebuild the application
```bash
cd /var/www/InboxAI
git pull origin main
rm -rf dist node_modules/typescript/tsbuildinfo
npm run build
```

### Step 2: Update PM2 to use the correct file
```bash
pm2 stop InboxAI
pm2 delete InboxAI
pm2 start dist/server/index.js --name InboxAI
pm2 save
```

### Step 3: Verify it's running
```bash
pm2 logs InboxAI --lines 20
```

You should see:
```
Registering routes with base path: "/inboxai"
API routes mounted at: /inboxai/api
serving on port 5000
```

## If you have an ecosystem.config.js file

Edit it to change the script path:

```bash
nano ecosystem.config.js
```

Change:
```javascript
script: 'dist/server/index.cjs'  // OLD - WRONG
```

To:
```javascript
script: 'dist/server/index.js'   // NEW - CORRECT
```

Then restart:
```bash
pm2 restart ecosystem.config.js
pm2 save
```

## Why This Happened
The build system was changed from esbuild (which produced .cjs files) to TypeScript's native compiler tsc (which produces .js files). The code works correctly, but PM2 was still pointing to the old filename.
