# VPS Update Instructions - Fix Duplicate Emails & Add Logout Button

## Issues Fixed in This Update
1. ✅ Duplicate email errors (`Key (message_id)=(...) already exists`)
2. ✅ User email display and logout button now working

## Update Steps

### 1. Stop the Application
```bash
cd /var/www/InboxAI
pm2 stop InboxAI
```

### 2. Backup Current Code (Optional but Recommended)
```bash
cd /var/www
cp -r InboxAI InboxAI-backup-$(date +%Y%m%d)
```

### 3. Pull Latest Code
```bash
cd /var/www/InboxAI
git pull origin main
```

**OR** if you don't have git set up, you can manually replace these files:
- `server/storage.ts` - Fixed duplicate email/event handling
- `server/gmail-client.ts` - Fixed getUserEmail() function
- `server/routes.ts` - Dashboard route now includes user email
- `client/src/components/AppHeader.tsx` - Added logout button
- `client/src/pages/dashboard.tsx` - Displays user email

### 4. Rebuild the Application
```bash
npm run build
```

### 5. Restart the Application
```bash
pm2 restart InboxAI
pm2 logs InboxAI
```

### 6. Verify the Fix
1. **Check logs** - No more duplicate email errors
2. **Open dashboard** - You should see your email address displayed
3. **Logout button** - Should appear in the header

## What Changed?

### Fixed Duplicate Email Errors
The `createEmail()` and `createCalendarEvent()` functions now use `onConflictDoUpdate()` which:
- Detects when an email/event with the same message_id/event_id already exists
- Updates the existing record instead of crashing
- Allows Gmail sync to continue even with duplicates

### Fixed User Email & Logout
The `getUserEmail()` function now:
- Tries OAuth2 userinfo API first (faster)
- Falls back to Gmail API if needed (works for existing users)
- Displays email in the dashboard header
- Shows a functional logout button

## Troubleshooting

### If you still see duplicate errors:
```bash
# Check your logs
pm2 logs InboxAI --lines 50

# Make sure the build completed successfully
ls -la /var/www/InboxAI/dist/index.js
```

### If logout button still doesn't appear:
```bash
# Make sure frontend was rebuilt
ls -la /var/www/InboxAI/dist/public/

# Clear browser cache and hard refresh (Ctrl+Shift+R)
```

### If nothing works:
```bash
# Restore from backup
pm2 stop InboxAI
cd /var/www
rm -rf InboxAI
mv InboxAI-backup-YYYYMMDD InboxAI
cd InboxAI
pm2 restart InboxAI
```

## Need Help?
If issues persist, check:
1. Build logs: `npm run build` output
2. Application logs: `pm2 logs InboxAI`
3. Browser console: F12 → Console tab
