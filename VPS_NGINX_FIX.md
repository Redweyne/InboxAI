# VPS Nginx Fix - Dashboard Not Loading

## Problem Summary
The app shows at redweyne.com/inboxai but the dashboard doesn't load and functionalities are missing.

## Root Cause
Your Nginx configuration is **stripping the `/inboxai` prefix** before forwarding requests to Node.js. This causes a path mismatch:

- Client requests: `/inboxai/api/dashboard`
- Nginx forwards to Node: `/api/dashboard` (prefix stripped!)
- Node expects: `/inboxai/api/dashboard` (because APP_BASE_PATH=/inboxai)
- Result: **404 error** - routes don't match

## The Fix

### Step 1: Update Nginx Configuration

SSH into your VPS and edit the Nginx config:

```bash
sudo nano /etc/nginx/sites-available/inboxai
```

**WRONG Configuration (strips prefix):**
```nginx
location /inboxai {
    proxy_pass http://localhost:5000/;  # The trailing / causes stripping!
    ...
}
```

**CORRECT Configuration (preserves prefix):**
```nginx
location /inboxai {
    proxy_pass http://localhost:5000;  # NO trailing slash!
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Key change: Remove the trailing `/` from `proxy_pass http://localhost:5000/` to `proxy_pass http://localhost:5000`**

### Step 2: Test Nginx Config

```bash
sudo nginx -t
```

### Step 3: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 4: Deploy Latest Code

```bash
cd /var/www/InboxAI
git reset --hard origin/main
rm -rf dist node_modules/typescript/tsbuildinfo
npm run build
pm2 restart InboxAI
```

### Step 5: Verify Fix

Check PM2 logs to confirm the server is mounting routes correctly:
```bash
pm2 logs InboxAI --lines 10
```

You should see:
```
Registering routes with base path: "/inboxai" (API at /inboxai/api/...)
API routes mounted at: /inboxai/api
```

### Step 6: Test API Endpoint

```bash
curl -I https://redweyne.com/inboxai/api/dashboard
```

Should return `200 OK` (not 404).

## Why This Happens

Nginx `proxy_pass` behavior:
- `proxy_pass http://localhost:5000/;` (with trailing slash) = **strips the location prefix**
  - Request: `/inboxai/api/dashboard` -> Forwarded as: `/api/dashboard`
  
- `proxy_pass http://localhost:5000;` (without trailing slash) = **preserves the full path**
  - Request: `/inboxai/api/dashboard` -> Forwarded as: `/inboxai/api/dashboard`

Since your Express server expects `/inboxai/api/*` routes (because of APP_BASE_PATH=/inboxai), the proxy must NOT strip the prefix.

## Additional Fix Included

This update also fixes a bug where "Mark as Read", "Archive", and "Complete Task" buttons were not working. The `handleQuickAction` function was incorrectly calling the API.

## Quick Reference

```bash
# Full deployment commands
cd /var/www/InboxAI
git reset --hard origin/main
rm -rf dist node_modules/typescript/tsbuildinfo
npm run build
pm2 restart InboxAI

# Check Nginx config
sudo nano /etc/nginx/sites-available/inboxai
# Remove trailing slash from proxy_pass
sudo nginx -t && sudo systemctl reload nginx

# Verify
pm2 logs InboxAI --lines 10
curl -I https://redweyne.com/inboxai/api/dashboard
```
