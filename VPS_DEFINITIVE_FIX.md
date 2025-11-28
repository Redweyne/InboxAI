# DEFINITIVE FIX - VPS Running Old Bundled Code

## The Problem

Your VPS error shows:
```
at serveStatic (/var/www/InboxAI/dist/server/index.cjs:833603:48)
```

This is **OLD BUNDLED CODE** from when we used esbuild. The current build uses `tsc` and creates:
- `dist/server/index.js` (NOT index.cjs!)
- Individual .js files (vite.js, routes.js, etc.)

Your VPS is still running the old bundled `index.cjs` with the wrong path resolution.

## THE FIX

SSH into your VPS and run these commands:

```bash
# 1. Go to project directory
cd /var/www/InboxAI

# 2. Stop PM2 first
pm2 stop InboxAI

# 3. DELETE THE OLD DIST DIRECTORY COMPLETELY
rm -rf dist

# 4. Pull latest code
git pull origin main

# 5. Rebuild everything from scratch
npm run build

# 6. Verify the build created the RIGHT files
ls -la dist/server/
# You should see: index.js, vite.js, routes.js, etc.
# You should NOT see: index.cjs

# 7. Make sure PM2 runs the correct file
pm2 delete InboxAI
pm2 start dist/server/index.js --name InboxAI

# 8. Save PM2 config
pm2 save

# 9. Check logs
pm2 logs InboxAI --lines 20
```

## Expected Output After Fix

The logs should show:
```
[SERVER DEBUG] APP_BASE_PATH: "/inboxai" | distPath: "/var/www/InboxAI/dist/public"
[express] serving on port 5000
```

And NOT the old error about `paths[0]` being undefined.

## Why This Happened

1. We switched from `esbuild` (which creates one bundled `index.cjs`) to `tsc` (which creates individual `.js` files)
2. Your VPS still had the old bundled file
3. The old bundled file had `path.resolve(__dirname, "public")` which was wrong
4. The new code has `path.resolve(__dirname, "..", "public")` which is correct

## Quick Verification Commands

After deploying, verify:

```bash
# Check dist structure
ls dist/
# Should show: public/ and server/

ls dist/server/
# Should show: index.js, vite.js, routes.js, etc.
# Should NOT show: index.cjs

ls dist/public/
# Should show: index.html, assets/

# Check the path in vite.js is correct
grep "distPath" dist/server/vite.js | head -1
# Should show: path.resolve(__dirname, "..", "public")
```
