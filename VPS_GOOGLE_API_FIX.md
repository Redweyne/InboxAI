# Fix for "Method doesn't allow unregistered callers" Error

## The Real Problem

Your keys ARE set on the VPS, but Google is rejecting them. This specific error means:

### 1. **Gmail API and Google Calendar API are NOT enabled** in your Google Cloud project

Even though you have GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, those APIs must be explicitly enabled.

### 2. **The OAuth redirect URI doesn't match**

Your Google Cloud Console OAuth client must have EXACTLY:
```
https://redweyne.com/api/auth/google/callback
```

### 3. **Gemini API is restricted or API key is invalid**

The GEMINI_API_KEY might be from a different project or has restrictions set.

---

## Fix Steps (5 minutes)

### Step 1: Enable Required APIs

1. Go to: https://console.cloud.google.com/
2. Select the SAME project where you created GOOGLE_CLIENT_ID
3. Click **"+ ENABLE APIS AND SERVICES"** at the top
4. Search: **Gmail API** → Click it → Click **ENABLE**
5. Search: **Google Calendar API** → Click it → Click **ENABLE**
6. Search: **Generative Language API** → Click it → Click **ENABLE** (this is for Gemini)

### Step 2: Verify OAuth Redirect URI

1. Still in Google Cloud Console
2. Go to: **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the one you used for GOOGLE_CLIENT_ID)
4. Click the pencil icon to edit
5. Under **Authorized redirect URIs**, verify it has:
   ```
   https://redweyne.com/api/auth/google/callback
   ```
6. If not, add it and click **SAVE**

### Step 3: Check Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Check your GEMINI_API_KEY
3. Click the **3 dots** next to the key → **View API key details**
4. Make sure:
   - Status is **Active**
   - No restrictions are set (or if restricted, allow your server IP)

### Step 4: Verify APP_URL is Set

SSH to your VPS and check:
```bash
cd /var/www/inbox-ai
cat .env | grep APP_URL
```

Should show: `APP_URL=https://redweyne.com`

### Step 5: Restart and Test

```bash
pm2 restart inbox-ai
pm2 logs inbox-ai --lines 50
```

Look for the error to disappear. Then test at: https://redweyne.com

---

## Quick Diagnostic

Run this on your VPS to see what's actually set:
```bash
cd /var/www/inbox-ai
echo "=== Environment Check ==="
echo "APP_URL: $(grep APP_URL .env)"
echo "GOOGLE_CLIENT_ID: $(grep GOOGLE_CLIENT_ID .env | cut -c1-50)..."
echo "GOOGLE_CLIENT_SECRET: $(grep GOOGLE_CLIENT_SECRET .env | cut -c1-30)..."
echo "GEMINI_API_KEY: $(grep GEMINI_API_KEY .env | cut -c1-30)..."
```

---

## Why This Happens

- **"Unregistered callers"** = Google doesn't recognize your API requests
- This happens when APIs aren't enabled in the project
- OR when the OAuth consent/redirect doesn't match
- The keys exist but Google rejects them because project setup is incomplete
