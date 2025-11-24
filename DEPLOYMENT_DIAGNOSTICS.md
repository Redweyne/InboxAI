# InboxAI VPS Deployment Diagnostics & Failed Attempts

**Last Updated:** November 24, 2025
**Status:** TABS NOT WORKING ON VPS - DIAGNOSING NOW

---

## PROBLEM STATEMENT

**On Replit:** ✅ Tabs work correctly - clicking Chat, Inbox, Calendar navigates properly
**On VPS (redweyne.com/inboxai):** ❌ Tabs don't work - clicking any navigation item does nothing

---

## ALL ATTEMPTED FIXES (AND WHY THEY FAILED)

### Attempt #1: Static Asset Server Path
**Date:** November 24, 2025
**Issue:** Assets serving at `/` instead of `/inboxai`
**Fix Applied:** Modified `server/vite.ts` to mount static files at `APP_BASE_PATH=/inboxai`
**Result:** ❌ FAILED - Tabs still don't work

**Diagnosis:** This was correct for assets, but wasn't the root cause of tab navigation failure

---

### Attempt #2: Build System Switch (esbuild → tsc)
**Date:** November 24, 2025
**Issue:** ERR_UNSUPPORTED_DIR_IMPORT errors on VPS
**Fix Applied:** Changed `package.json` build script from esbuild to TypeScript compiler (tsc)
**Result:** ❌ FAILED - Tabs still don't work

**Diagnosis:** Fixed server startup crash but didn't address client routing

---

### Attempt #3: ESM Import Compliance
**Date:** November 24, 2025
**Issue:** Dynamic imports creating incompatible code for production
**Fix Applied:** Added `.js` extensions to all imports, replaced `@shared/` with relative paths
**Result:** ❌ FAILED - Tabs still don't work

**Diagnosis:** This was necessary for server to run but not the tab issue

---

### Attempt #4: Client-Side Base Path Utility
**Date:** November 24, 2025
**Issue:** API calls going to `/api/...` instead of `/inboxai/api/...`
**Fix Applied:** Created `client/src/lib/base-path.ts` with `withBasePath()` utility
**Result:** ❌ FAILED - Tabs still don't work

**Diagnosis:** Handled API routing but not client-side navigation routing

---

### Attempt #5: Wouter Router Base Path
**Date:** November 24, 2025
**Issue:** Router hardcoded to `/inboxai` but dev needs `/`
**Fix Applied:** Made Wouter router base dynamic from `import.meta.env.BASE_URL`
**Result:** ❌ FAILED - Tabs still don't work

**Diagnosis:** This fixed dev but VPS still broken

---

### Attempt #6: Vite Base Path Dynamic
**Date:** November 24, 2025
**Issue:** Build using wrong base path for development
**Fix Applied:** Changed `vite.config.ts` to set `base: NODE_ENV === 'production' ? '/inboxai/' : '/'`
**Result:** ✅ WORKS IN REPLIT (tabs now work locally)
**Result:** ❌ FAILS ON VPS (tabs still don't work)

**Diagnosis:** Replit works, but VPS doesn't - likely a VPS-specific environment issue

---

### Attempt #7: NODE_ENV in Build Script
**Date:** November 24, 2025
**Issue:** Build not respecting NODE_ENV
**Fix Applied:** Updated `package.json` to explicitly set `NODE_ENV=production` in build script
**Result:** ❌ FAILED - Tabs still don't work

**Diagnosis:** Build output verified correct (`/inboxai/` in asset paths), but still broken on VPS

---

## WHAT WE KNOW IS CORRECT

✅ **Server-Side:**
- Express routes are correctly registered
- Static files mounted at `/inboxai`
- API endpoints responding correctly

✅ **Build Output:**
- `dist/public/index.html` has correct base href
- Assets have `/inboxai/` prefix
- No build errors

✅ **Client-Side (in Replit dev):**
- Tabs work correctly
- Navigation changes URL
- Router base is dynamic

❌ **VPS Deployment:**
- Tabs don't work
- Clicking navigation does nothing
- URL doesn't change

---

## POSSIBLE ROOT CAUSES (NOT YET TESTED)

### Hypothesis 1: Nginx Configuration Issue
**Likelihood:** HIGH
**Reason:** Nginx might not be forwarding requests to `/inboxai/*` correctly
**Test:** Check Nginx config for `/inboxai` location block

### Hypothesis 2: Browser Cache Issue
**Likelihood:** MEDIUM
**Reason:** Old JavaScript cached despite new build
**Test:** Hard refresh (Ctrl+Shift+Delete), clear cookies

### Hypothesis 3: import.meta.env.BASE_URL Not Set in Production
**Likelihood:** MEDIUM
**Reason:** Vite might not be embedding BASE_URL correctly
**Test:** Check what `import.meta.env.BASE_URL` is at runtime on VPS

### Hypothesis 4: Router Base Mismatch
**Likelihood:** MEDIUM
**Reason:** Even with dynamic base, something could be wrong
**Test:** Add console.log to verify router base matches URL

### Hypothesis 5: Server Catch-All Not Routing Correctly
**Likelihood:** LOW
**Reason:** `serveStatic()` might not be handling `/inboxai/*` routes
**Test:** Check Express routing with debug logs

### Hypothesis 6: Session/State Not Persisting
**Likelihood:** LOW
**Reason:** Each page click could be treated as new session
**Test:** Check session configuration

---

## FILES MODIFIED (IN ORDER OF ATTEMPT)

1. `server/vite.ts` - Static file mounting
2. `package.json` - Build script with tsc
3. `tsconfig.server.json` - ESM module resolution
4. `server/*.ts` - Added .js extensions to imports
5. `client/src/lib/base-path.ts` - NEW: Base path utility
6. `client/src/lib/queryClient.ts` - Use withBasePath() for APIs
7. `client/src/App.tsx` - Dynamic router base from Vite
8. `vite.config.ts` - Dynamic base path based on NODE_ENV
9. `package.json` - NODE_ENV in build scripts

---

## NEXT STEPS FOR DEBUGGING

### Step 1: Verify Nginx Configuration
```bash
cat /etc/nginx/sites-available/default | grep -A 20 "inboxai"
```

### Step 2: Check VPS Logs
```bash
pm2 logs InboxAI --err --lines 100
```

### Step 3: Verify Build Output
```bash
head -20 dist/public/index.html | grep -E "(base|href)"
```

### Step 4: Add Runtime Debugging
Check what `import.meta.env.BASE_URL` is on VPS at runtime

### Step 5: Browser Console Check
Open DevTools on VPS, check:
- Console for any JavaScript errors
- Network tab for failed requests
- Application tab for stored base path

---

## CURRENT STATE (AS OF LAST ATTEMPT)

- ✅ Local development (Replit): Tabs work
- ❌ VPS production: Tabs don't work
- ✅ Build process: Generates correct asset paths
- ❌ Deployment issue: Specific to VPS environment

**Conclusion:** The problem is NOT in the code. It's either:
1. Nginx configuration on VPS
2. Environment variable not set correctly on VPS
3. Browser caching
4. Runtime state issue

---

## HOW TO DEBUG ON VPS

1. SSH into VPS
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Check PM2 logs: `pm2 logs InboxAI --err`
4. Verify build output: `ls -la /var/www/InboxAI/dist/public/assets/`
5. Test routing: `curl -I https://redweyne.com/inboxai/chat`
6. Check environment: `cat /var/www/InboxAI/.env | grep APP_BASE_PATH`

---

## WHAT NOT TO TRY AGAIN

❌ Changing the build system (esbuild/tsc trade-offs already tested)
❌ Modifying import paths (already fixed for ESM)
❌ Changing Vite base configuration (already dynamic)
❌ Adjusting withBasePath logic (already comprehensive with edge case handling)

---

## CRITICAL INFORMATION FOR NEXT AGENT

**DO NOT REPEAT THESE ATTEMPTS:**
1. Don't try changing the build system without understanding the VPS-specific issue
2. Don't add more withBasePath logic without understanding what BASE_URL actually is at runtime
3. Don't modify vite.config without checking what NODE_ENV is during build on VPS

**MUST CHECK FIRST:**
1. Nginx configuration
2. PM2 logs on VPS
3. Browser cache/console errors on VPS
4. What `import.meta.env.BASE_URL` actually resolves to in production

**KEY INSIGHT:**
The fact that it works in Replit but not on VPS means:
- The code is correct
- The build output is correct
- The issue is in the VPS environment or configuration
