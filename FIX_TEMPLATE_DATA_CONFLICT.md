# Fix Template Data Conflict

## The Problem
Template data (fake emails/events created by "Load Template Data" button) can conflict with real Gmail sync, causing dashboard, sync, and logout to fail.

## The Fix
The sync now **automatically clears template data** before syncing real data from Gmail/Calendar.

## Deploy to Your VPS

### Step 1: Update the Code

On your VPS:
```bash
cd /var/www/InboxAI
nano server/routes.ts
```

Find the `/api/sync-all` endpoint (around line 499) and update it to match this:

```typescript
  // Endpoint to trigger initial sync
  app.post("/api/sync-all", async (req, res) => {
    try {
      // Check if authenticated
      if (!(await isAuthenticated())) {
        return res.status(401).json({ 
          error: "Not authenticated",
          needsAuth: true 
        });
      }

      console.log('🔄 Starting sync-all - clearing any existing template data first');
      
      // Clear all existing data (including template data) before syncing
      await storage.clearAllData();
      console.log('✅ Cleared existing data');

      // Sync emails from Gmail
      const gmail = await getUncachableGmailClient();
```

The key addition is these 4 lines BEFORE syncing emails:
```typescript
console.log('🔄 Starting sync-all - clearing any existing template data first');

// Clear all existing data (including template data) before syncing
await storage.clearAllData();
console.log('✅ Cleared existing data');
```

### Step 2: Rebuild and Restart

```bash
cd /var/www/InboxAI
npm run build
pm2 restart InboxAI
```

### Step 3: Test It

1. Go to https://redweyne.com
2. Click **"Sync Now"**
3. It should:
   - Clear any template data automatically
   - Sync your real Gmail emails (up to 100)
   - Sync your real Calendar events
   - Show your actual email in the header
4. Click **"Logout"** - should work perfectly now

## Quick Fix (Without Code Changes)

If you don't want to update the code, just do this on your website:

1. Click **"Clear All Data"** button (next to "Load Template Data")
2. Wait 2 seconds
3. Click **"Sync Now"**

This manually clears template data before syncing.

## What Changed

**Before:** Sync would try to mix template data with real Gmail data, causing conflicts

**After:** Sync automatically clears all data first, then loads only real Gmail/Calendar data

## Testing

After deploying, check PM2 logs while syncing:
```bash
pm2 logs InboxAI --lines 50
```

You should see:
```
🔄 Starting sync-all - clearing any existing template data first
✅ Cleared existing data
[Then Gmail/Calendar sync messages]
```

## Notes

- Template data is just for demonstration purposes
- Once you sync real data, you don't need template data anymore
- You can still use "Load Template Data" for testing, but it will be cleared on next sync
