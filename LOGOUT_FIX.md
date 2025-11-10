# LOGOUT BUTTON FIX - FINAL SOLUTION

## What I Fixed

Changed `getUserEmail()` to use OAuth2 userinfo API instead of Gmail API. This is more reliable and includes proper logging.

## Steps to Deploy on Your VPS

### 1. Pull Latest Code
```bash
cd /var/www/InboxAI
git pull origin main
```

### 2. Rebuild Application
```bash
npm run build
```

### 3. Restart PM2
```bash
pm2 restart InboxAI
```

### 4. **IMPORTANT: Re-authenticate with Gmail**

Because I added a new OAuth scope (`userinfo.email`), you need to logout and re-authenticate ONCE:

**On your website (redweyne.com):**
1. Click "Sync Now" button (or go to Settings)
2. Click "Connect Gmail" to authenticate
3. Google will ask for permission again (normal - we added a new scope)
4. After authentication, your email and logout button will appear

### 5. Verify It Works

Check PM2 logs to see the new logging:
```bash
pm2 logs InboxAI --lines 30
```

You should see:
```
[getUserEmail] Successfully fetched email
```

Then check your website - you should see:
- Your email address in the top-right header
- A "Logout" button next to it

## Why This Fix Works

**Old code**: Called Gmail API's `users.getProfile()` which was failing silently  
**New code**: Uses OAuth2's `userinfo.get()` which is more reliable + has logging

## If It Still Doesn't Work

Check PM2 logs for errors:
```bash
pm2 logs InboxAI --lines 50 | grep getUserEmail
```

If you see `[getUserEmail] Error:`, send me that error message.
