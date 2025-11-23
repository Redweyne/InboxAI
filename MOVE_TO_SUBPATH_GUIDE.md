# 🚀 Move InboxAI from redweyne.com to redweyne.com/inboxai

## 📋 Overview

This guide will move your InboxAI application from running at `redweyne.com` (root) to `redweyne.com/inboxai` (subpath), allowing you to use the root domain for your portfolio.

**What This Involves:**
1. ✅ Update application code to work with `/inboxai` subpath
2. ✅ Update Nginx configuration to serve portfolio at root + InboxAI at `/inboxai`
3. ✅ Update Google OAuth redirect URIs
4. ✅ Rebuild and deploy
5. ✅ Test everything works

**Estimated Time:** 30-45 minutes

---

## 🎯 PART 1: Update Code on Replit

### Step 1.1: Update Vite Configuration

**File:** `vite.config.ts`

Add the `base` property to tell Vite to build for a subpath:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  base: '/inboxai/',  // ← ADD THIS LINE
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

✅ **This ensures all asset paths (CSS, JS, images) are prefixed with `/inboxai/`**

---

### Step 1.2: Update Wouter Router for Subpath

**File:** `client/src/App.tsx`

Update the Router component to use the base path:

```typescript
import { Switch, Route, Router as WouterRouter } from "wouter";

// Add this base path hook at the top of the file, before Router function
import { useEffect } from "react";

function Router() {
  return (
    <WouterRouter base="/inboxai">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}
```

**Important:** Make sure to import `Router as WouterRouter` from wouter and wrap your routes!

✅ **This ensures navigation works correctly with the subpath**

---

### Step 1.3: Update API Request Base Path (If Needed)

Check `client/src/lib/queryClient.ts` - the API calls should already work because they use absolute paths like `/api/...`.

**No changes needed here** unless you have hardcoded domain URLs.

---

### Step 1.4: Test Build Locally

On Replit, run:

```bash
npm run build
```

**Expected output:**
- Build should complete successfully
- You should see `dist/public` directory created
- Check `dist/public/index.html` - all script/link tags should have `/inboxai/` prefix

✅ **If build fails, fix errors before proceeding**

---

## 🖥️ PART 2: Update VPS Configuration

### Step 2.1: SSH into Your VPS

```bash
ssh root@redweyne.com
```

---

### Step 2.2: Update Environment Variables

```bash
cd /var/www/InboxAI
nano .env
```

**Update the APP_URL:**

```env
NODE_ENV=production
PORT=5000
APP_URL=https://redweyne.com/inboxai
DATABASE_URL=postgresql://inbox_user:your_password@localhost:5432/InboxAI
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

**Important:** Change `APP_URL` from `https://redweyne.com` to `https://redweyne.com/inboxai`

Save: `Ctrl + X`, then `Y`, then `Enter`

✅ **This updates the OAuth redirect URI generation**

---

### Step 2.3: Backup Current Nginx Configuration

```bash
# Backup current configuration
cp /etc/nginx/sites-available/inbox-ai /etc/nginx/sites-available/inbox-ai.backup
```

---

### Step 2.4: Create New Nginx Configuration

```bash
nano /etc/nginx/sites-available/inbox-ai
```

**Replace ENTIRE contents with this new configuration:**

```nginx
server {
    listen 80;
    server_name redweyne.com www.redweyne.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name redweyne.com www.redweyne.com;

    # SSL certificate (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/redweyne.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redweyne.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Root directory for your portfolio
    # IMPORTANT: Create this directory and put your portfolio files here
    location / {
        root /var/www/portfolio;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # InboxAI application at /inboxai
    location /inboxai {
        alias /var/www/InboxAI/dist/public;
        index index.html;
        try_files $uri $uri/ /inboxai/index.html;
        
        # Cache control for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Express backend
    location /inboxai/api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /inboxai;
    }
}
```

Save: `Ctrl + X`, then `Y`, then `Enter`

**Key Points:**
- `/` → Serves your portfolio from `/var/www/portfolio`
- `/inboxai` → Serves InboxAI frontend (static files)
- `/inboxai/api/` → Proxies to Express backend on port 5000

---

### Step 2.5: Create Portfolio Directory

```bash
# Create portfolio directory
mkdir -p /var/www/portfolio

# Create a simple placeholder index.html
cat > /var/www/portfolio/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio - Coming Soon</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
        }
        a {
            display: inline-block;
            padding: 1rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        a:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Portfolio Coming Soon</h1>
        <p>This space is reserved for my portfolio</p>
        <a href="/inboxai">Go to InboxAI →</a>
    </div>
</body>
</html>
EOF

# Set permissions
chown -R www-data:www-data /var/www/portfolio
```

✅ **This creates a placeholder - you can replace it with your real portfolio later**

---

### Step 2.6: Test Nginx Configuration

```bash
nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

❌ **If you see errors, DO NOT proceed. Fix the syntax errors in the nginx config**

---

### Step 2.7: Reload Nginx

```bash
systemctl reload nginx
```

✅ **Nginx is now updated**

---

## 📱 PART 3: Update Google OAuth Credentials

### Step 3.1: Get New Redirect URI

On your VPS, run:

```bash
curl http://localhost:5000/api/auth/debug
```

**Copy the `redirectUri` value.** It should be:
```
https://redweyne.com/inboxai/api/auth/google/callback
```

---

### Step 3.2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your InboxAI project
3. Click **Credentials** (left sidebar)
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, you'll see your old URI:
   ```
   https://redweyne.com/api/auth/google/callback
   ```
6. **KEEP the old one** (for safety during transition)
7. **ADD the new one:**
   ```
   https://redweyne.com/inboxai/api/auth/google/callback
   ```
8. Click **Save**

⏱️ **Wait 2-3 minutes** for Google's changes to propagate

---

## 🚢 PART 4: Deploy Updated Code

### Step 4.1: Pull Latest Code from Replit

On Replit, commit and push your changes:

```bash
git add .
git commit -m "Configure app for /inboxai subpath"
git push origin main
```

---

### Step 4.2: Pull and Build on VPS

On your VPS:

```bash
cd /var/www/InboxAI

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Build the application
npm run build
```

**Expected output:**
- Build should complete successfully
- Check `dist/public/index.html` - all paths should have `/inboxai/` prefix

---

### Step 4.3: Restart PM2

```bash
pm2 restart InboxAI
pm2 logs InboxAI --lines 50
```

**Check for errors in logs.** You should see:
```
serving on port 5000
```

✅ **Backend is running**

---

## 🧪 PART 5: Testing

### Step 5.1: Test Portfolio Root

Open browser and visit:
```
https://redweyne.com
```

**Expected:** You should see the "Portfolio Coming Soon" page with a link to InboxAI

---

### Step 5.2: Test InboxAI App

Visit:
```
https://redweyne.com/inboxai
```

**Expected:**
- ✅ InboxAI dashboard loads
- ✅ No 404 errors in browser console
- ✅ All CSS and JavaScript loads correctly
- ✅ Navigation works (try clicking Chat, Inbox, etc.)

---

### Step 5.3: Test Google OAuth

1. Click **"Sync Now"** button
2. **Expected:** Google OAuth window opens
3. Authenticate with Google
4. **Expected:** Window closes, emails sync successfully

**If you get a 400 error:**
- Wait 2-3 more minutes for Google propagation
- Double-check the redirect URI in Google Cloud Console
- Run `curl http://localhost:5000/api/auth/debug` to verify the URI

---

### Step 5.4: Test All Features

- ✅ Email sync works
- ✅ Calendar sync works
- ✅ Chat/AI works
- ✅ Logout button works
- ✅ Page navigation works
- ✅ Page refresh keeps you on the right page

---

## 🎯 PART 6: Clean Up (Optional)

### Step 6.1: Remove Old OAuth Redirect URI

After verifying everything works for 24-48 hours:

1. Go to Google Cloud Console → Credentials
2. Remove the old redirect URI: `https://redweyne.com/api/auth/google/callback`
3. Keep only: `https://redweyne.com/inboxai/api/auth/google/callback`

---

### Step 6.2: Update Portfolio

Replace the placeholder with your real portfolio:

```bash
# On VPS
cd /var/www/portfolio

# Upload your portfolio files here
# You can use SCP, SFTP, or Git
```

Example using SCP from your local machine:
```bash
scp -r /path/to/your/portfolio/* root@redweyne.com:/var/www/portfolio/
```

---

## 🔧 Troubleshooting

### Issue: 404 on /inboxai

**Check:**
```bash
# Verify build directory exists
ls -la /var/www/InboxAI/dist/public

# Verify Nginx config
nginx -t

# Check Nginx error log
tail -f /var/log/nginx/error.log
```

**Fix:** Make sure you ran `npm run build` on VPS

---

### Issue: CSS/JS not loading (404 errors)

**Check browser console.** If you see 404s for assets like:
```
https://redweyne.com/assets/index-abc123.js  (404)
```

**Problem:** Assets are missing the `/inboxai/` prefix

**Fix:**
1. Verify `base: '/inboxai/'` is in `vite.config.ts` on Replit
2. Rebuild: `npm run build` on VPS
3. Check `dist/public/index.html` - script tags should be `/inboxai/assets/...`

---

### Issue: Navigation doesn't work (404 on refresh)

**Check:** Nginx `try_files` directive

**Fix:** Make sure your Nginx config has:
```nginx
location /inboxai {
    alias /var/www/InboxAI/dist/public;
    try_files $uri $uri/ /inboxai/index.html;  # ← Must fallback to /inboxai/index.html
}
```

---

### Issue: API calls return 404

**Check:**
```bash
# Test API endpoint directly
curl http://localhost:5000/api/auth/status

# Check PM2 logs
pm2 logs InboxAI
```

**Fix:** Verify Express is running on port 5000 and Nginx proxy is correct

---

### Issue: Google OAuth 400 Error

**Check:**
```bash
curl http://localhost:5000/api/auth/debug
```

**Fix:**
1. Copy the exact `redirectUri` from the output
2. Add it to Google Cloud Console → Credentials
3. Wait 2-3 minutes
4. Try again

---

## 📝 Summary of Changes

### Code Changes (Replit):
1. ✅ `vite.config.ts` - Added `base: '/inboxai/'`
2. ✅ `client/src/App.tsx` - Wrapped routes in `<Router base="/inboxai">`

### VPS Changes:
1. ✅ `.env` - Updated `APP_URL=https://redweyne.com/inboxai`
2. ✅ Nginx config - New config with portfolio at root + InboxAI at `/inboxai`
3. ✅ Created `/var/www/portfolio` for your portfolio
4. ✅ Rebuilt application with new base path

### Google Cloud Console:
1. ✅ Added new redirect URI: `https://redweyne.com/inboxai/api/auth/google/callback`

---

## ✅ Success Checklist

Before considering this complete:

- [ ] Portfolio loads at `https://redweyne.com`
- [ ] InboxAI loads at `https://redweyne.com/inboxai`
- [ ] No console errors on InboxAI dashboard
- [ ] Navigation works (all pages accessible)
- [ ] Google OAuth works (Sync Now button)
- [ ] Email sync works
- [ ] Calendar sync works
- [ ] Logout button works
- [ ] Page refresh doesn't break navigation

---

## 🎉 You're Done!

Your InboxAI application is now running at `https://redweyne.com/inboxai` and you can use `https://redweyne.com` for your portfolio!

**Need help?** 
- Check PM2 logs: `pm2 logs InboxAI`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
- Test API: `curl http://localhost:5000/api/auth/debug`
