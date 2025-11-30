# Debug Email Sending Issue - Investigation Guide

## Issue
AI chat reports emails sent successfully, but no emails are actually received.

## Root Cause Investigation

I've added comprehensive logging to trace the exact flow when the AI tries to send an email. The logs will help us identify whether:

1. **Action Detection**: Is Gemini AI detecting the "send email" intent from your message?
2. **Action Execution**: Is the `executeSendEmail` function being called?
3. **Gmail API Call**: Is the Gmail API actually being called?
4. **Gmail API Response**: What does Gmail API return (success or error)?

## What the New Logs Will Show

When you ask the AI to send an email, you should see logs like:

```
[ACTION-DETECT] Analyzing user message for actions: send an email to john@example.com...
[ACTION-DETECT] User authenticated: true
[ACTION-DETECT] Gemini detected action: {"type":"send_email","to":"john@example.com",...}
[ACTION-DETECT] Action type detected: send_email
[ACTION-DETECT] Processing send_email action...
[ACTION-DETECT] Executing send_email to: john@example.com
[AI-ACTION] executeSendEmail called with: { to: 'john@example.com', ... }
[AI-ACTION] Getting Gmail client...
[AI-ACTION] Gmail client obtained successfully
[AI-ACTION] Sending email via Gmail API...
[AI-ACTION] Email sent successfully! Message ID: 1234567890
[ACTION-DETECT] send_email result: SUCCESS
```

If there's a failure, you'll see:
```
[AI-ACTION] ERROR sending email: <error message here>
[AI-ACTION] Full error details: { ... }
[ACTION-DETECT] send_email result: FAILED <error>
```

## Deploy to VPS

### Step 1: Pull Latest Code
```bash
cd /var/www/InboxAI
git pull origin main
```

### Step 2: Rebuild
```bash
npm run build
```

### Step 3: Restart PM2
```bash
pm2 restart InboxAI
```

### Step 4: Watch Logs
```bash
pm2 logs InboxAI --lines 100
```

### Step 5: Test Email Sending
Ask the AI chat to send an email, e.g.:
"Send an email to test@example.com with subject 'Test' and body 'This is a test'"

### Step 6: Check Logs for Results
Look for the `[ACTION-DETECT]` and `[AI-ACTION]` log entries to see exactly what happened.

## Possible Issues Found

Based on the logging, we might discover:

### Issue 1: Action Not Detected
If you see `[ACTION-DETECT] No action detected, returning null`, it means:
- Gemini AI didn't recognize your message as a "send email" request
- Solution: Be more explicit in your request, e.g., "Send an email to X with subject Y and body Z"

### Issue 2: Missing Fields
If you see `[ACTION-DETECT] Missing required fields for send_email`, it means:
- The AI detected send_email but didn't extract all required info (to, subject, body)
- Solution: Provide complete email details in your request

### Issue 3: Gmail API Error
If you see `[AI-ACTION] ERROR sending email`, check the error message:
- `insufficient authentication scopes` → User needs to re-authenticate with proper scopes
- `invalid_grant` → Token expired, user needs to re-sync
- `User rate limit exceeded` → Gmail API quota exceeded
- `Invalid recipient` → Email address format issue

### Issue 4: Not Authenticated
If you see `[ACTION-DETECT] User authenticated: false`, it means:
- No OAuth tokens in database
- User needs to click "Sync Now" to authenticate

## Common Gmail API Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `403 insufficient authentication scopes` | Missing `gmail.send` scope | User must re-sync account |
| `401 invalid_credentials` | Expired/revoked tokens | User must re-sync account |
| `400 invalid To header` | Bad email address format | Check email format |
| `429 User rate limit exceeded` | Too many emails sent | Wait or use different account |

## After Investigation

Once you see the logs, share them with me and I can identify the exact issue and provide a fix.
