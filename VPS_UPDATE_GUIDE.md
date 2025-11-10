# VPS Update Guide - Fix Logout Button & User Email Display

## Issue
The logout button and user email are not displaying in the dashboard header on your VPS deployment at redweyne.com.

## Root Cause
Your VPS has an older version of the code that doesn't include:
1. User email display in AppHeader component
2. Logout button in AppHeader component
3. User email fetching in `/api/dashboard` endpoint

## Solution - Update Your VPS

### Step 1: Connect to Your VPS
```bash
ssh root@mi2897317.de.contaboserver.net
```

### Step 2: Navigate to Application Directory
```bash
cd /var/www/InboxAI
```

### Step 3: Pull Latest Changes
```bash
# Stash any local changes
git stash

# Pull latest code from repository
git pull origin main

# If you had any local changes you want to keep:
# git stash pop
```

### Step 4: Install Dependencies (if package.json changed)
```bash
npm install
```

### Step 5: Rebuild the Application
```bash
# This is CRITICAL - you must rebuild to include the new code
npm run build
```

### Step 6: Restart PM2
```bash
pm2 restart InboxAI
```

### Step 7: Verify the Update
```bash
# Check if the build includes the new AppHeader code
grep -n "Logout" dist/index.js | head -5

# Check PM2 logs for any errors
pm2 logs InboxAI --lines 20
```

## What to Expect After Update

Once updated and rebuilt, you should see:
1. **In the header** (top right):
   - Your Gmail email address displayed
   - A "Logout" button next to it
   - Both only appear AFTER you've authenticated with Gmail

2. **Logout button behavior**:
   - Clicking "Logout" will:
     - Disconnect your Gmail account
     - Clear all synced data (emails, calendar, tasks)
     - Show a success toast notification

## Verification Checklist

After updating, verify these items work:

- [ ] Application loads without errors
- [ ] Can authenticate with Gmail (if not already)
- [ ] User email displays in top-right header
- [ ] "Logout" button appears next to email
- [ ] Clicking Logout disconnects Gmail and clears data
- [ ] Dashboard still loads correctly after logout

## Troubleshooting

### If logout button still doesn't appear:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Do a hard refresh (Ctrl+Shift+R)
3. Check PM2 logs: `pm2 logs InboxAI --lines 50`

### If build fails:
```bash
# Remove node_modules and rebuild
rm -rf node_modules
npm install
npm run build
pm2 restart InboxAI
```

### If you see errors about missing packages:
```bash
# Ensure all dependencies are installed
npm install
npm run build
pm2 restart InboxAI
```

## Quick Update Commands (Copy-Paste)

```bash
cd /var/www/InboxAI && \
git stash && \
git pull origin main && \
npm install && \
npm run build && \
pm2 restart InboxAI && \
pm2 logs InboxAI --lines 20
```

## Files That Were Updated

The following files contain the logout button and email display functionality:

1. **client/src/App.tsx** - Contains `AppHeader` component with:
   - User email display
   - Logout button
   - Logout mutation logic

2. **server/routes.ts** - Contains:
   - `/api/dashboard` endpoint that fetches user email
   - `/api/auth/logout` endpoint that handles logout

3. **server/gmail-client.ts** - Contains:
   - `getUserEmail()` function to fetch email from Google API

4. **shared/schema.ts** - Contains:
   - `DashboardData` interface with `userEmail?: string` field

All these files are already in the latest codebase and just need to be built and deployed to your VPS.
