# Inbox AI - Intelligent Email & Calendar Assistant

## Overview
Inbox AI is a personal productivity assistant that helps you manage your Gmail inbox and Google Calendar with intelligent AI-powered insights. The application uses Google's Gemini AI to provide helpful responses about your emails, calendar, and schedule.

## Project Status
**Last Updated:** November 28, 2025
**Status:** Production-Ready ✅

### Recent Changes
- ✅ **VPS Subpath Deployment Fix** - API routes now support APP_BASE_PATH for subpath hosting
- ✅ Fixed Express Router mounting to use dynamic base path (e.g., /inboxai/api)
- ✅ OAuth redirect URIs now include base path for proper callback handling
- ✅ Added Gemini AI integration for intelligent chat responses
- ✅ Implemented AI-powered chat service with context awareness
- ✅ Updated chat interface to display dynamic AI-generated suggestions
- ✅ Integrated free Gemini 2.5 Flash model for fast responses
- ✅ **Enabled AI action capabilities** - AI can now perform all 10 action types:
  - Email actions: send, mark read/unread, delete, archive, star, unstar
  - Calendar actions: create event, update event, delete event
- ✅ Unified Gmail + Calendar OAuth scopes for seamless authentication
- ✅ Implemented scope validation with automatic re-authentication prompts
- ✅ Created AI action executor service with safe calendar update logic
- ✅ Added comprehensive error handling and user-friendly error messages
- ✅ Production-ready implementation approved by architect

## Key Features
- 📧 **Email Management**: Sync and categorize Gmail messages with AI
- 📅 **Calendar Integration**: View and manage Google Calendar events
- 💬 **AI Assistant**: Chat with Gemini AI for intelligent insights about your inbox and schedule
- 📊 **Analytics**: Track email patterns and calendar usage
- 🔔 **Smart Categorization**: Automatically categorize and prioritize emails

## Technology Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **AI**: Google Gemini AI (2.5 Flash - Free tier)
- **Storage**: In-memory storage (MemStorage)
- **APIs**: Gmail API, Google Calendar API

## Project Architecture
- **Frontend** (`client/src/`): React-based SPA with wouter routing
- **Backend** (`server/`): Express API server with OAuth2 integration
- **Shared** (`shared/`): TypeScript schemas and types
- **AI Service** (`server/ai-service.ts`): Gemini AI integration for chat

## Environment Setup

### Required Secrets (CRITICAL - App won't work without these!)

This app requires three environment variables to function. When importing/exporting this project, these secrets are NOT included in the files for security reasons. You must add them manually in any new environment.

**On Replit:**
Add these as Secrets in the Replit environment (use the Secrets tab in the Tools panel):

1. **`GEMINI_API_KEY`** - Google Gemini AI API key
   - Powers the AI chat assistant
   - Get it FREE at: https://aistudio.google.com/app/apikey
   - Click "Get API Key" → "Create API Key"

2. **`GOOGLE_CLIENT_ID`** - Google OAuth Client ID
   - Enables Gmail and Calendar integration
   - Get it from: https://console.cloud.google.com/
   - Instructions in `.env.example` file

3. **`GOOGLE_CLIENT_SECRET`** - Google OAuth Client Secret
   - Works with Client ID for authentication
   - Same source as Client ID

**On Other Platforms:**
Copy the `.env.example` file to `.env` and fill in your actual values.

### Optional Integrations (Already Configured)
- Google Mail integration
- Google Calendar integration

## User Preferences
- Using free AI options (Gemini AI) due to no capital budget
- AI should understand the Inbox AI software and be helpful to users
- Focus on providing intelligent, context-aware assistance

## Development
The application runs on port 5000 with:
- Frontend: Vite dev server
- Backend: Express server with hot reload via tsx

Run: `npm run dev`

## VPS Subpath Deployment (Flexible)

The application supports **flexible deployment** at any path based on the `APP_BASE_PATH` environment variable:

- **Root deployment** (no subpath): Leave `APP_BASE_PATH` empty or don't set it
- **Subpath deployment**: Set `APP_BASE_PATH=/your-path` (e.g., `/inboxai`, `/InboxAI`, `/app`)

### How It Works
All base path handling is dynamic via `APP_BASE_PATH`:
1. **Build time**: Vite reads `APP_BASE_PATH` and builds assets with correct paths
2. **Runtime**: Express mounts API routes at `${APP_BASE_PATH}/api`
3. **OAuth**: Redirect URIs include the base path automatically

### VPS Deployment Configuration

```env
NODE_ENV=production
PORT=5000
APP_BASE_PATH=/inboxai    # Use your desired path (case-sensitive on Linux!)
APP_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/inboxai/api/auth/google/callback
GEMINI_API_KEY=your_gemini_api_key
```

### Deployment Steps
1. Set environment variables (especially `APP_BASE_PATH`)
2. Build: `npm run build`
3. Update Google Cloud Console with the correct redirect URI
4. Start: `node dist/index.js` (or use PM2)

## AI Capabilities
The Gemini AI assistant can:

### Read & Analyze:
- Summarize emails and identify urgent messages
- Find free time slots in your calendar
- Answer questions about emails and meetings
- Provide insights about email patterns
- Suggest next actions based on context

### Take Actions:
- ✉️ **Send emails** on your behalf
- 📧 **Modify emails**: Mark as read/unread, star, archive, or delete
- 📅 **Manage calendar**: Create, update, or delete events
- 🤖 **Automated assistance**: Just ask in natural language and the AI will execute

### How to Use Actions:
Simply ask the AI in natural language:
- "Send an email to john@example.com with subject 'Meeting Follow-up' and body 'Thanks for the meeting!'"
- "Mark all unread emails as read"
- "Create a calendar event for tomorrow at 2pm called 'Team Meeting'"
- "Delete that spam email from earlier"

The AI will detect your intent and execute the action automatically!

## VPS Deployment - Critical PM2 Configuration (MUST READ!)

### Problem Summary (Fixed Nov 28, 2025)
After build system switch from esbuild to tsc, PM2 deployments were failing with:
- `Error: Cannot find module 'dist/server/index.cjs'`
- Blank pages despite server running
- Case sensitivity mismatches between build and Nginx

### Root Causes Identified
1. **File Extension Issue**: `ecosystem.config.js` fails when `package.json` has `"type": "module"` (ESM). PM2 expects CommonJS for config files.
2. **Old Output Path**: ecosystem.config.js pointed to old `dist/server/index.cjs` but build now produces `dist/server/index.js`
3. **Build Cache Corruption**: TypeScript incremental build cache could silently skip compilation
4. **Case Sensitivity**: Build was using `/InboxAI` but Nginx was configured for `/inboxai` - Linux is case-sensitive!

### Solution Applied
1. **Renamed config file** from `ecosystem.config.js` to `ecosystem.config.cjs` (CommonJS format)
2. **Updated script path** from `dist/server/index.cjs` to `dist/server/index.js`
3. **Added APP_BASE_PATH to PM2 env** - ensures it matches Nginx configuration
4. **Changed build script** to use lowercase `/inboxai` to match Nginx

### VPS Deployment Command (Nov 28, 2025)
```bash
cd /var/www/InboxAI
git reset --hard origin/main
rm -rf dist node_modules/typescript/tsbuildinfo
npm run build
pm2 delete InboxAI
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs InboxAI --lines 20
```

### Key Files Modified
- `ecosystem.config.cjs` - Renamed from .js, now uses correct path and sets APP_BASE_PATH
- `package.json` - Changed build script to use `/inboxai` (lowercase) instead of `/InboxAI`

### Expected Output After Fix
```
Registering routes with base path: "/inboxai"
API routes mounted at: /inboxai/api
serving on port 5000
```

### CRITICAL NOTES FOR NEXT VPS DEPLOYMENT
- **ALWAYS** use `ecosystem.config.cjs` (NOT .js) when package.json has `"type": "module"`
- **ALWAYS** verify Nginx config path matches build APP_BASE_PATH (case-sensitive!)
- **ALWAYS** delete TypeScript cache before build: `rm -rf node_modules/typescript/tsbuildinfo`
- **ALWAYS** use `git reset --hard` on VPS if local changes block pull
- **DO NOT** use uppercase letters in APP_BASE_PATH - Linux URLs are case-sensitive
