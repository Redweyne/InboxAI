# VPS DEPLOYMENT - DEFINITIVE FIX

## ROOT CAUSE (Identified by Architect)
PM2 is misconfigured with wrong paths, creating `/var/www/InboxAI/InboxAI` instead of `/var/www/InboxAI`.

## EXACT STEPS TO FIX (Run on VPS)

### Step 1: Navigate to Project Directory
```bash
cd /var/www/InboxAI
```

### Step 2: Pull Latest Code
```bash
git pull origin main
```

### Step 3: Clean and Rebuild
```bash
# Remove old build output
rm -rf dist/

# Build with new tsc compiler
npm run build
```

### Step 4: Verify Build Output
```bash
# This file MUST exist
ls -lh dist/server/index.js

# Should show: dist/server/index.js (compiled by tsc)
```

### Step 5: Delete Old PM2 Process
```bash
# Remove the misconfigured PM2 process
pm2 delete InboxAI
```

### Step 6: Start with Correct Path
```bash
# Start from /var/www/InboxAI directory
# Use relative path dist/server/index.js
pm2 start dist/server/index.js --name InboxAI
```

### Step 7: Verify It's Running
```bash
# Check PM2 status
pm2 status

# Check logs (should NOT show ERR_UNSUPPORTED_DIR_IMPORT)
pm2 logs InboxAI --lines 50
```

### Step 8: Save PM2 Configuration
```bash
# Save the working configuration
pm2 save
```

### Step 9: Test the Application
```bash
# Test the endpoint
curl https://redweyne.com/inboxai/

# Should return HTML, NOT directory import errors!
```

## What This Fixed

1. **Old Problem**: PM2 tried to run `InboxAI/dist/server/index.js` from `/var/www/InboxAI`, creating `/var/www/InboxAI/InboxAI/dist/server/index.js` (doesn't exist)

2. **New Solution**: PM2 runs `dist/server/index.js` from `/var/www/InboxAI`, correctly resolving to `/var/www/InboxAI/dist/server/index.js` ✅

3. **Also Fixed**: Updated from old esbuild path (`dist/index.js`) to new tsc path (`dist/server/index.js`)

## If You Want a PM2 Ecosystem File

Create `ecosystem.config.js` in `/var/www/InboxAI`:

```javascript
module.exports = {
  apps: [{
    name: 'InboxAI',
    script: 'dist/server/index.js',
    cwd: '/var/www/InboxAI',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Then use:
```bash
pm2 delete InboxAI
pm2 start ecosystem.config.js
pm2 save
```

## Expected Result

After these steps:
- ✅ No ERR_UNSUPPORTED_DIR_IMPORT errors
- ✅ Application starts successfully
- ✅ Dashboard loads at https://redweyne.com/inboxai/
- ✅ All features working

---

**This is the REAL fix - the architect confirmed PM2 was the problem, not the code!**
