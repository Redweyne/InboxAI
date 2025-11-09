# Fix Database Connection on VPS

## Current Problem
The app cannot connect to PostgreSQL. Every request fails with "password authentication failed".

---

## Option 1: Find Your Original Password (Recommended)

Check if you saved the password anywhere when you first set up the database. If you have it, skip to **Update .env File** below.

---

## Option 2: Reset Everything Cleanly

### Step 1: Reconnect to PostgreSQL as superuser
```bash
sudo -u postgres psql
```

### Step 2: Check if the database and user exist
```sql
\l
```
Look for `InboxAI` database.

```sql
\du
```
Look for `inbox_user`.

### Step 3: Drop and recreate (clean slate)
```sql
DROP DATABASE IF EXISTS InboxAI;
DROP USER IF EXISTS inbox_user;
```

### Step 4: Create fresh database and user
```sql
CREATE USER inbox_user WITH PASSWORD 'SecurePassword123!';
CREATE DATABASE InboxAI OWNER inbox_user;
GRANT ALL PRIVILEGES ON DATABASE InboxAI TO inbox_user;
\q
```

**IMPORTANT:** Replace `SecurePassword123!` with your own strong password. Remember it!

---

## Update .env File

```bash
cd /var/www/inbox-ai
nano .env
```

Update the DATABASE_URL line with the EXACT password you just set:

```bash
DATABASE_URL=postgresql://inbox_user:SecurePassword123!@localhost:5432/InboxAI
```

**Replace `SecurePassword123!` with your actual password.**

Save: Ctrl+X, Y, Enter

---

## Test Database Connection

```bash
# Test if you can connect with the new credentials
psql "postgresql://inbox_user:SecurePassword123!@localhost:5432/InboxAI"
```

If it connects, type `\q` to exit.

If it DOESN'T connect, the password is still wrong.

---

## Push Database Schema

Once the connection works:

```bash
npm run db:push
```

You should see tables being created (emails, calendar_events, oauth_tokens, etc.)

---

## Restart App

```bash
pm2 restart inbox-ai
pm2 logs inbox-ai --lines 20
```

You should NO LONGER see "password authentication failed" errors.

---

## Verify It Works

Go to https://redweyne.com - the dashboard should load without errors.

---

## What Went Wrong

The DATABASE_URL password didn't match the PostgreSQL user's password. We're resetting both to match.
