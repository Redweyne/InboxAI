# Fix for Blank Page at redweyne.com/InboxAI

## Problem
The page at redweyne.com/InboxAI was showing BLANK because the build process wasn't setting `APP_BASE_PATH=/InboxAI` during the Vite build. This caused all JavaScript and CSS files to be referenced at "/" instead of "/InboxAI/", resulting in 404 errors for all assets.

## Root Cause
The `package.json` build script was:
```json
"build": "NODE_ENV=production vite build && npm run build:server"
```

But it needed to include `APP_BASE_PATH=/InboxAI` so Vite knows where to place asset references.

## Fix Applied
The build script is now:
```json
"build": "NODE_ENV=production APP_BASE_PATH=/InboxAI vite build && npm run build:server"
```

## Steps to Deploy Fix to VPS

### 1. SSH into your VPS
```bash
ssh root@your-vps-ip
```

### 2. Navigate to InboxAI directory
```bash
cd /var/www/InboxAI
```

### 3. Pull the latest code
```bash
git pull origin main
```

### 4. Rebuild the application
```bash
npm run build
```

### 5. Verify the build output
Check that the generated HTML has correct paths:
```bash
cat dist/public/index.html | grep -E "src=|href="
```

You should see paths like:
- `/InboxAI/assets/index-*.js`
- `/InboxAI/assets/index-*.css`
- `/InboxAI/favicon.png`

### 6. Restart PM2
```bash
pm2 restart InboxAI
```

### 7. Verify in browser
Visit https://redweyne.com/InboxAI - the page should now load properly with:
- Dashboard visible
- Sync button working
- Navigation working

## Troubleshooting

If you still see issues after deploying:

1. **Check browser console**: Open DevTools (F12) and look for 404 errors
2. **Hard refresh**: Press Ctrl+Shift+R to bypass cache
3. **Check PM2 logs**: `pm2 logs InboxAI`
4. **Verify .env**: Make sure your `.env` file has:
   ```
   APP_BASE_PATH=/InboxAI
   APP_URL=https://redweyne.com
   ```
