# Deploy OAuth Fix to Your VPS

## Quick Deployment Steps

### Step 1: Push Code from Replit to Git

Since you have the same files in Replit as your VPS, you need to push the changes from Replit to your Git repository first.

**Option A: If you're editing files manually with nano on VPS**

Just update these two files on your VPS:

1. **File: `/var/www/InboxAI/server/gmail-client.ts`**
   
   Find the `getOAuth2Client()` function (around line 25) and replace it with:

```typescript
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use GOOGLE_REDIRECT_URI if provided, otherwise construct from APP_URL
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    (process.env.APP_URL 
      ? `${process.env.APP_URL}/api/auth/google/callback`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
        : 'http://localhost:5000/api/auth/google/callback');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your secrets.');
  }

  console.log('🔐 OAuth2 Client Configuration:');
  console.log('   - Redirect URI:', redirectUri);
  console.log('   - Client ID:', clientId?.substring(0, 20) + '...');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ALL_SCOPES,
    prompt: 'consent', // Force consent screen to ensure refresh token
  });
  
  console.log('🔗 Generated OAuth URL');
  console.log('   - URL length:', authUrl.length);
  console.log('   - Scopes:', ALL_SCOPES.join(', '));
  
  return authUrl;
}
```

2. **File: `/var/www/InboxAI/server/routes.ts`**

   Find the `// ============ OAUTH ROUTES ============` section (around line 17) and add this debug endpoint:

```typescript
  // Debug endpoint to check OAuth configuration
  app.get("/api/auth/debug", (req, res) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      (process.env.APP_URL 
        ? `${process.env.APP_URL}/api/auth/google/callback`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
          : 'http://localhost:5000/api/auth/google/callback');
    
    res.json({
      redirectUri,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUriEnv: !!process.env.GOOGLE_REDIRECT_URI,
      hasAppUrl: !!process.env.APP_URL,
      environment: process.env.NODE_ENV,
      instructions: [
        '1. Copy the redirect URI above',
        '2. Go to Google Cloud Console > Credentials > Your OAuth Client',
        '3. Add it EXACTLY to "Authorized redirect URIs"',
        '4. Wait 2-3 minutes for propagation',
        '5. Try authentication again'
      ]
    });
  });
```

Add this RIGHT BEFORE the existing `app.get("/api/auth/google/url"` endpoint.

### Step 2: Rebuild and Restart

After editing the files, run:

```bash
cd /var/www/InboxAI
npm run build
pm2 restart InboxAI
```

### Step 3: Test the Debug Endpoint

```bash
curl http://localhost:5000/api/auth/debug
```

You should see JSON output like:
```json
{
  "redirectUri": "https://redweyne.com/api/auth/google/callback",
  "hasClientId": true,
  "hasClientSecret": true,
  ...
}
```

**Copy the `redirectUri` value!**

### Step 4: Update Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Click Edit
4. Under "Authorized redirect URIs", add the EXACT URI from Step 3:
   ```
   https://redweyne.com/api/auth/google/callback
   ```
5. Click SAVE
6. Wait 2-3 minutes for propagation

### Step 5: Test OAuth

1. Go to https://redweyne.com
2. Click "Sync Now"
3. You should see Google's OAuth consent screen (NOT a 400 error!)
4. Complete authentication
5. Return to your app

### Step 6: Check Logs

Watch the logs while testing:

```bash
pm2 logs InboxAI --lines 50
```

You should see:
```
🔐 OAuth2 Client Configuration:
   - Redirect URI: https://redweyne.com/api/auth/google/callback
   - Client ID: 1234567890...
🔗 Generated OAuth URL
   - URL length: 456
📤 Sending OAuth URL to client
```

## Troubleshooting

### Problem: Still getting HTML from /api/auth/debug

**Solution:** The changes weren't applied. Make sure you:
- Edited the correct files
- Ran `npm run build`
- Ran `pm2 restart InboxAI`
- Waited a few seconds for the app to restart

### Problem: Still getting 400 error from Google

**Solution:** 
- Double-check the redirect URI in Google Console matches EXACTLY
- Wait 2-3 more minutes for propagation
- Clear browser cache/cookies
- Try in incognito window

### Problem: OAuth works but emails don't sync

**Solution:** Check PM2 logs for errors:
```bash
pm2 logs InboxAI --lines 100
```

Common issues:
- Database needs migration: `npm run db:push`
- Token refresh issues: Try logging out and re-authenticating

## Quick Reference

**Check debug endpoint:**
```bash
curl http://localhost:5000/api/auth/debug
```

**View logs:**
```bash
pm2 logs InboxAI
```

**Restart app:**
```bash
pm2 restart InboxAI
```

**Rebuild app:**
```bash
cd /var/www/InboxAI
npm run build
pm2 restart InboxAI
```
