# OAuth 400 Error Fix Guide

## The Problem
You're getting a **400 error from Google** when clicking "Sync Now". This happens because the redirect URI in your OAuth request doesn't EXACTLY match what's registered in Google Cloud Console.

## Quick Fix - Follow These Steps

### Step 1: Check Your Exact Redirect URI

Run this command on your VPS:
```bash
curl http://localhost:5000/api/auth/debug
```

This will show you the EXACT redirect URI being used. It should output something like:
```json
{
  "redirectUri": "https://redweyne.com/api/auth/google/callback",
  "hasClientId": true,
  "hasClientSecret": true,
  "instructions": [...]
}
```

**Copy the exact `redirectUri` value** - you'll need it in Step 2.

### Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID (the one you're using for InboxAI)
3. Click "Edit" (pencil icon)
4. Scroll to **"Authorized redirect URIs"**
5. Make sure this EXACT URI is listed:
   ```
   https://redweyne.com/api/auth/google/callback
   ```
   ⚠️ **Important:** It must match EXACTLY - no trailing slash, correct protocol (https://)
   
6. If it's not there or doesn't match exactly, add/update it
7. Click "SAVE"
8. **Wait 2-3 minutes** for Google's changes to propagate

### Step 3: Verify Your OAuth Scopes

While in Google Cloud Console, make sure these scopes are enabled in your OAuth consent screen:

1. Go to "OAuth consent screen" in the left menu
2. Click "EDIT APP"
3. Go to "Scopes" section
4. Make sure these scopes are added:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Save changes

### Step 4: Deploy the Fixed Code to VPS

The code now has better logging. Deploy it to your VPS:

```bash
# On your VPS
cd /var/www/InboxAI
git pull origin main  # Or however you update code
npm run build
pm2 restart InboxAI
```

### Step 5: Check the Logs

After deploying, when you click "Sync Now", check the PM2 logs:

```bash
pm2 logs InboxAI --lines 50
```

You should see:
```
🔐 OAuth2 Client Configuration:
   - Redirect URI: https://redweyne.com/api/auth/google/callback
   - Client ID: 123456789...
🔗 Generated OAuth URL
   - URL length: 456
   - Scopes: https://www.googleapis.com/auth/gmail.modify, ...
📤 Sending OAuth URL to client
```

This confirms the correct redirect URI is being used.

### Step 6: Test Authentication

1. Go to your website: https://redweyne.com
2. Click "Sync Now"
3. You should see the Google OAuth screen (not a 400 error)
4. Complete the authentication
5. Return to your app and click "Sync Now" again

## Common Issues & Solutions

### Issue: Still getting 400 error after updating Google Console
**Solution:** 
- Wait 2-3 more minutes for propagation
- Clear your browser cache/cookies
- Try in an incognito window
- Double-check the redirect URI matches EXACTLY (no typos, trailing slashes, etc.)

### Issue: Redirect URI shows `http://localhost:5000`
**Solution:** 
Your `GOOGLE_REDIRECT_URI` environment variable isn't set correctly on VPS.

Check your `.env` file on VPS:
```bash
cat /var/www/InboxAI/.env | grep GOOGLE_REDIRECT_URI
```

Should show:
```
GOOGLE_REDIRECT_URI=https://redweyne.com/api/auth/google/callback
```

If not, add it and restart:
```bash
echo "GOOGLE_REDIRECT_URI=https://redweyne.com/api/auth/google/callback" >> .env
pm2 restart InboxAI
```

### Issue: OAuth works but says "Not authenticated"
**Solution:**
Your database doesn't have the `oauth_tokens` table.

Run on VPS:
```bash
cd /var/www/InboxAI
npm run db:push
pm2 restart InboxAI
```

## Debug Endpoint

You can always check your OAuth configuration by visiting:
```
https://redweyne.com/api/auth/debug
```

Or via curl on VPS:
```bash
curl http://localhost:5000/api/auth/debug
```

This shows:
- Exact redirect URI being used
- Which environment variables are set
- Step-by-step fix instructions

## Need More Help?

If you still have issues, share:
1. Output of `/api/auth/debug` endpoint
2. Screenshot of your Google Cloud Console redirect URIs
3. PM2 logs when clicking "Sync Now"
