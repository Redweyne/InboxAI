# VPS Fix: Case Sensitivity Issue

## The Problem
The VPS at `redweyne.com/InboxAI` was broken because of a **case-sensitivity mismatch**:
- Vite config correctly used `/InboxAI/` (uppercase)
- But `server/vite.ts` had a fallback of `/inboxai` (lowercase)
- Linux is case-sensitive, so `/InboxAI` !== `/inboxai`
- Result: All static assets (JS, CSS) failed to load, breaking the entire app

## The Fix Applied
Changed `server/vite.ts` line 78 from:
```javascript
const basePath = process.env.APP_BASE_PATH || '/inboxai';
```
To:
```javascript
const basePath = process.env.APP_BASE_PATH || '/InboxAI';
```

## How to Deploy This Fix to VPS

### Option 1: Pull and Rebuild (Recommended)
```bash
# SSH into your VPS
ssh your-user@redweyne.com

# Navigate to InboxAI directory
cd /var/www/InboxAI

# Pull latest changes
git pull origin main

# Install dependencies (in case any changed)
npm install

# Build the project
npm run build

# Restart PM2
pm2 restart InboxAI
```

### Option 2: Quick Manual Fix (If git pull is not an option)
If you can't pull from git, you can manually edit the file:

```bash
# SSH into your VPS
ssh your-user@redweyne.com

# Navigate to InboxAI directory
cd /var/www/InboxAI

# Edit the server file
nano server/vite.ts

# Find line 78 (or search for "inboxai"):
# const basePath = process.env.APP_BASE_PATH || '/inboxai';

# Change it to:
# const basePath = process.env.APP_BASE_PATH || '/InboxAI';

# Save and exit (Ctrl+X, Y, Enter)

# Rebuild
npm run build

# Restart PM2
pm2 restart InboxAI
```

## Verify the Fix
After deploying, check:

1. **Visit the site**: `https://redweyne.com/InboxAI`
2. **Open browser DevTools** (F12) > Network tab
3. **Refresh the page**
4. **Verify all assets load** with status 200:
   - `/InboxAI/assets/index-*.js` 
   - `/InboxAI/assets/index-*.css`
5. **Test the features**:
   - Dashboard should load with data
   - "Sync Now" button should work
   - Navigation (Chat, Inbox, Calendar) should work

## Environment Check
Ensure your `.env` file on VPS has:
```
APP_BASE_PATH=/InboxAI
GOOGLE_REDIRECT_URI=https://redweyne.com/InboxAI/api/auth/google/callback
```

Both values must use `/InboxAI` (with capital letters) to match the URL.
