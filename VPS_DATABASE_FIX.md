# ACTUAL FIX: OAuth Tokens Table Missing on VPS

## The Real Problem

The application code IS correct and uses DbStorage to persist OAuth tokens.

BUT the `oauth_tokens` table doesn't exist in your VPS PostgreSQL database.

When you authenticate with Google, the tokens are saved to a table that doesn't exist, so they're lost immediately.

---

## The Fix (2 minutes)

### Step 1: SSH to your VPS
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/inbox-ai
```

### Step 2: Push the database schema
```bash
npm run db:push
```

This will create the missing `oauth_tokens` table in your PostgreSQL database.

### Step 3: Restart the application
```bash
pm2 restart inbox-ai
```

### Step 4: Re-authenticate
1. Go to https://redweyne.com
2. Click "Connect Google Account"
3. Grant permissions

This time the tokens will be saved to the database and persist across restarts and PM2 processes.

---

## Why This Happened

When you deployed to VPS, you ran `npm install` and `npm run build`, but you forgot to run `npm run db:push` to create the database tables.

The application was trying to save OAuth tokens to a table that didn't exist.

---

## Verify It Worked

After running these commands, check the logs:
```bash
pm2 logs inbox-ai --lines 30
```

You should NO LONGER see "Method doesn't allow unregistered callers" errors after you authenticate.

Then test:
- AI Chat should work
- Gmail sync should work
- Calendar sync should work
