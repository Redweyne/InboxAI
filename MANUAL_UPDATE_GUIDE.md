# Manual Update Guide - Fix Duplicate Emails & Add Logout Button

## Important: Client Files Cannot Be Edited on VPS

The files `client/src/App.tsx` and `client/src/pages/dashboard.tsx` **do not exist on your VPS** because they're compiled into `dist/public/` during the build process.

## You Have 2 Options:

---

### Option 1: Update on Development Machine (RECOMMENDED)

If you have the source code on your local computer:

1. **Update these files on your local machine:**
   - `server/storage.ts` (lines 860-890 and 929-952)
   - `server/gmail-client.ts` (lines 119-162)
   - `client/src/App.tsx` (entire file)
   - `client/src/pages/dashboard.tsx` (lines 135-139)

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Upload to VPS:**
   ```bash
   # Replace the entire dist/ folder on your VPS
   scp -r dist/* root@vm12897317:/var/www/InboxAI/dist/
   ```

4. **Restart on VPS:**
   ```bash
   pm2 restart InboxAI
   ```

---

### Option 2: Edit Server Files Only on VPS (QUICK FIX)

If you can't rebuild right now, at least fix the duplicate email errors:

#### File 1: `/var/www/InboxAI/server/storage.ts`

**Find this section** (around line 868):
```typescript
const result = await this.db.insert(emails)
  .values(email)
  .returning();
```

**Replace with:**
```typescript
const result = await this.db.insert(emails)
  .values(email)
  .onConflictDoUpdate({
    target: emails.messageId,
    set: {
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      snippet: email.snippet,
      body: email.body,
      date: email.date,
      isRead: email.isRead,
      isStarred: email.isStarred,
      category: email.category,
      isUrgent: email.isUrgent,
      labels: email.labels,
      attachmentCount: email.attachmentCount,
    }
  })
  .returning();
```

**Find this section** (around line 933):
```typescript
const result = await this.db.insert(calendarEvents)
  .values(event)
  .returning();
```

**Replace with:**
```typescript
const result = await this.db.insert(calendarEvents)
  .values(event)
  .onConflictDoUpdate({
    target: calendarEvents.eventId,
    set: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      attendees: event.attendees,
      organizer: event.organizer,
      status: event.status,
      isAllDay: event.isAllDay,
      colorId: event.colorId,
    }
  })
  .returning();
```

#### File 2: `/var/www/InboxAI/server/gmail-client.ts`

**Find this section** (around line 119):
```typescript
export async function getUserEmail(): Promise<string | null> {
  try {
    const tokens = await getCachedTokens();
    if (!tokens || !tokens.access_token) {
      return null;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    return profile.data.emailAddress || null;
  } catch (error) {
    console.error('Failed to get user email:', error);
    return null;
  }
}
```

**Replace entire function with:**
```typescript
export async function getUserEmail(): Promise<string | null> {
  try {
    const tokens = await getCachedTokens();
    if (!tokens || !tokens.access_token) {
      console.log('[getUserEmail] No tokens found');
      return null;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    // Try OAuth2 userinfo first (works for new users with userinfo.email scope)
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      if (userInfo.data.email) {
        console.log('[getUserEmail] Successfully fetched email from OAuth2 userinfo');
        return userInfo.data.email;
      }
    } catch (oauthError: any) {
      console.log('[getUserEmail] OAuth2 userinfo failed, trying Gmail API fallback:', oauthError.message);
    }
    
    // Fallback to Gmail API (works for existing users without userinfo scope)
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      if (profile.data.emailAddress) {
        console.log('[getUserEmail] Successfully fetched email from Gmail API');
        return profile.data.emailAddress;
      }
    } catch (gmailError: any) {
      console.error('[getUserEmail] Gmail API also failed:', gmailError.message);
    }
    
    console.log('[getUserEmail] All methods failed to fetch email');
    return null;
  } catch (error: any) {
    console.error('[getUserEmail] Unexpected error:', error.message);
    return null;
  }
}
```

#### Rebuild & Restart:
```bash
cd /var/www/InboxAI
npm run build
pm2 restart InboxAI
```

---

## To Get Logout Button Working:

**You MUST have the source files** (`client/src/App.tsx` and `client/src/pages/dashboard.tsx`) **on a development machine** to rebuild the frontend.

### Download the complete files from this Replit:

1. Download `client/src/App.tsx` from this Replit
2. Download `client/src/pages/dashboard.tsx` from this Replit
3. Update those files on your development machine
4. Run `npm run build`
5. Upload `dist/` folder to VPS
6. Restart PM2

---

## Quick Commands:

```bash
# On VPS - after editing server files:
cd /var/www/InboxAI
nano server/storage.ts     # Update createEmail() and createCalendarEvent()
nano server/gmail-client.ts  # Update getUserEmail()
npm run build
pm2 restart InboxAI
pm2 logs InboxAI

# Verify:
# 1. No more duplicate email errors in logs
# 2. Dashboard loads without crashes
```

## What Gets Fixed:

### After editing server files only:
- ✅ Duplicate email errors FIXED
- ❌ Logout button still won't appear (need frontend rebuild)

### After full rebuild with client files:
- ✅ Duplicate email errors FIXED
- ✅ Logout button appears
- ✅ User email displays in header
