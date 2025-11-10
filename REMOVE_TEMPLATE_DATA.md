# Template Data Removed & Logout Button Fixed

## Changes Made

### 1. Removed All Template Data Functionality

**Backend changes:**
- ❌ Removed `/api/template/load` endpoint
- ✅ Kept `/api/data/clear` endpoint (renamed from `/api/template/clear`)
- ✅ Updated `/api/sync-all` to automatically clear data before syncing

**Frontend changes:**
- ❌ Removed "Load Template Data" button from dashboard
- ✅ Kept "Clear All Data" button (for manual cleanup if needed)
- ❌ Removed `loadTemplateData()` function from storage interface

### 2. Fixed Logout Button Visibility

**The Problem:** Logout button only showed when `dashboard.userEmail` existed, which sometimes failed.

**The Fix:** Logout button now shows whenever user is **authenticated** (based on `/api/auth/status`), regardless of whether email fetching succeeds.

**Changes in `client/src/App.tsx`:**
```typescript
// OLD: Only show if userEmail exists
{dashboard?.userEmail && (
  <Button onClick={logout}>Logout</Button>
)}

// NEW: Show if authenticated
const { data: authStatus } = useQuery({ queryKey: ["/api/auth/status"] });

{authStatus?.authenticated && (
  <>
    {dashboard?.userEmail && <span>{dashboard.userEmail}</span>}
    <Button onClick={logout}>Logout</Button>
  </>
)}
```

Now the logout button **always shows** when you're logged in, even if email fetching temporarily fails.

## Deploy to VPS

### Files to Update

You need to update these 3 files on your VPS:

#### 1. `server/routes.ts`

Around line 950, replace the template data routes with:

```typescript
  // ============ DATA MANAGEMENT ROUTES ============

  // Clear all data
  app.post("/api/data/clear", async (req, res) => {
    try:
      await storage.clearAllData();
      res.json({ success: true, message: "All data cleared successfully" });
    } catch (error: any) {
      console.error("Clear data error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
```

Make sure you:
- Remove `/api/template/load` route entirely
- Rename `/api/template/clear` to `/api/data/clear`
- Keep the earlier change in `/api/sync-all` that clears data before syncing

#### 2. `server/storage.ts`

Around line 73, update the interface:

```typescript
  // OAuth token operations
  saveOAuthToken(token: InsertOAuthToken): Promise<OAuthToken>;
  getOAuthToken(provider: string, userId?: string): Promise<OAuthToken | undefined>;
  deleteOAuthToken(provider: string, userId?: string): Promise<boolean>;
  
  // Data management
  clearAllData(): Promise<void>;
}
```

Remove the `loadTemplateData(): Promise<void>;` line.

#### 3. `client/src/App.tsx`

Around line 36-97, update the AppHeader function:

```typescript
function AppHeader() {
  const { toast } = useToast();
  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: authStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/status"],
  });

  const logout = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged Out Successfully",
        description: "Your Gmail account has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center justify-between gap-2 p-4">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex items-center gap-3">
        {authStatus?.authenticated && (
          <>
            {dashboard?.userEmail && (
              <span className="text-sm text-muted-foreground" data-testid="header-user-email">
                {dashboard.userEmail}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-logout-header"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}
```

Key changes:
- Added `authStatus` query
- Changed condition from `dashboard?.userEmail` to `authStatus?.authenticated`
- Email display is now optional (shows if available)
- Logout button always shows when authenticated

#### 4. `client/src/pages/dashboard.tsx`

Remove the template data button. Find around line 31-56 and replace with:

```typescript
  const clearDataMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/data/clear"),
    onSuccess: async () => {
      toast({
        title: "Data cleared",
        description: "All emails, events, and tasks have been removed.",
      });
      await queryClient.refetchQueries({ queryKey: ["/api/dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["/api/emails"] });
      await queryClient.refetchQueries({ queryKey: ["/api/calendar/events"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
    },
  });
```

Then find around line 144-163 and replace the buttons section with:

```typescript
        <div className="flex gap-2">
          <Button
            onClick={() => clearDataMutation.mutate()}
            disabled={clearDataMutation.isPending}
            variant="outline"
            data-testid="button-clear-data"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        </div>
```

Also remove the `Database` import from lucide-react (around line 16).

### Quick Deployment

```bash
cd /var/www/InboxAI

# Edit files with nano or your preferred editor
nano server/routes.ts       # Update template routes
nano server/storage.ts      # Update interface
nano client/src/App.tsx     # Fix logout button
nano client/src/pages/dashboard.tsx  # Remove template button

# Rebuild and restart
npm run build
pm2 restart InboxAI
```

### Test It

1. Go to https://redweyne.com
2. **Logout button should always show** when you're authenticated
3. **"Load Template Data" button is gone** from dashboard
4. **"Clear All Data" button still works** for manual cleanup
5. **"Sync Now" automatically clears data** before syncing Gmail/Calendar

### Verification

Check PM2 logs after clicking "Sync Now":

```bash
pm2 logs InboxAI --lines 30
```

You should see:
```
🔄 Starting sync-all - clearing any existing template data first
✅ Cleared existing data
[Gmail sync messages...]
```

## Benefits

✅ **No more template data conflicts** - Template data can't interfere with real Gmail sync  
✅ **Logout button always works** - Shows whenever authenticated, not dependent on email fetch  
✅ **Cleaner codebase** - Removed unused template data functionality  
✅ **Better UX** - Sync automatically clears old data, no manual steps needed  

## Note

The "Clear All Data" button is kept for cases where you want to manually reset everything without re-syncing. It won't be needed in normal use since "Sync Now" clears data automatically.
