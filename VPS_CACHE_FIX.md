# FIX: TypeScript Build Cache Issue

## The Problem

When you run `npm run build:server`, TypeScript uses an incremental build cache (`tsbuildinfo`). 
If this cache gets corrupted or stale, **tsc exits successfully but creates NO output files**.

This is exactly what happened - the build ran without errors but `dist/server/` was never created.

## THE FIX

SSH into your VPS and run:

```bash
cd /var/www/InboxAI

# 1. Stop PM2
pm2 stop InboxAI

# 2. Delete everything - dist folder AND TypeScript cache
rm -rf dist
rm -rf node_modules/typescript/tsbuildinfo

# 3. Pull latest code
git pull origin main

# 4. Rebuild from scratch
npm run build

# 5. Verify the structure is correct
ls dist/
# Should show: public/  server/  shared/

ls dist/server/
# Should show: index.js, vite.js, routes.js, etc.

# 6. Check the path in vite.js is correct
grep "distPath" dist/server/vite.js | head -1
# Should show: path.resolve(__dirname, "..", "public")

# 7. Restart PM2
pm2 restart InboxAI

# 8. Check logs
pm2 logs InboxAI --lines 20
```

## Expected Output

After building, you should see:
```
dist/
├── public/
│   ├── index.html
│   └── assets/
├── server/
│   ├── index.js
│   ├── vite.js
│   ├── routes.js
│   └── ... other .js files
└── shared/
    └── schema.js
```

PM2 logs should show:
```
[SERVER DEBUG] APP_BASE_PATH: "/inboxai" | distPath: "/var/www/InboxAI/dist/public"
[express] serving on port 5000
```

## Why This Happened

TypeScript's incremental build system (`incremental: true` in tsconfig) caches build info to speed up subsequent builds. But if something changes that the cache doesn't account for, it can silently skip compilation.

The fix is simple: delete the cache and rebuild from scratch.
