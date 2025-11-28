# VPS PM2 Configuration Fix

## Problem
1. The config file was named `.js` but package.json has `"type": "module"` - PM2 expects CommonJS
2. The script path pointed to the old `.cjs` output instead of the new `.js` output

## Solution Applied
- Renamed `ecosystem.config.js` to `ecosystem.config.cjs` (CommonJS extension)
- Fixed script path to `dist/server/index.js`

## Fix Your VPS (5 commands)

```bash
cd /var/www/InboxAI
git pull origin main
rm -rf dist && npm run build
pm2 delete InboxAI
pm2 start ecosystem.config.cjs && pm2 save
```

## Verify

```bash
pm2 logs InboxAI --lines 20
```

Expected output:
```
Registering routes with base path: "/InboxAI"
API routes mounted at: /InboxAI/api
serving on port 5000
```
