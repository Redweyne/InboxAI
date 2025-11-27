# Inbox AI - Intelligent Email & Calendar Assistant

## Overview
Inbox AI is a personal productivity assistant that helps you manage your Gmail inbox and Google Calendar with intelligent AI-powered insights. The application uses Google's Gemini AI to provide helpful responses about your emails, calendar, and schedule.

## Project Status
**Last Updated:** November 27, 2025
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

## VPS Subpath Deployment

The application has been fixed to support deployment at a subpath (e.g., `redweyne.com/inboxai`).

### Problem That Was Fixed (November 27, 2025)
The application was showing skeleton UI with non-functional buttons when deployed to `/inboxai` subpath because:
1. Client was calling `/inboxai/api/...` but server routes were at `/api/...` (404 errors)
2. OAuth redirect URIs didn't include the base path
3. All API endpoints failed, breaking authentication, sync, and data loading

### Solution Implemented
- **Express Router mounting** - API routes now mount at `${APP_BASE_PATH}/api` using Express Router
- **OAuth redirect URI updates** - Both Gmail and Calendar clients now include base path in OAuth URIs
- **Debug endpoint enhancement** - `/api/auth/debug` now shows base-path-aware redirect URI
- **Files modified**: `server/routes.ts` (lines 21-28, 44-73, 978-982)

### Required VPS Environment Variables
**CRITICAL:** Make sure `APP_URL` does NOT include `/inboxai` - only the base domain:

```env
NODE_ENV=production
PORT=5000
APP_BASE_PATH=/inboxai
APP_URL=https://redweyne.com
DATABASE_URL=postgresql://inboxai_user:AaS53372789@localhost:5432/InboxAI
GOOGLE_CLIENT_ID=T7673218221-0hvjn2gfVd1u063q26lrS6q5l1rkterqg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSEPX-qdvxS0Vj7-W9QzPFDCh9ai-ppJ5w
GOOGLE_REDIRECT_URI=https://redweyne.com/inboxai/api/auth/google/callback
GEMINI_API_KEY=AIzaSyADHzaqQgbLxKXU4fLjaAWyFTzY9riQyU
```

### How It Works
1. **API routes**: Mounted at `${APP_BASE_PATH}/api` → `/inboxai/api/...`
2. **OAuth callbacks**: Include full path → `https://redweyne.com/inboxai/api/auth/google/callback`
3. **Client-side routing**: Uses same base path from environment

### Deployment Steps
1. Pull code: `git pull origin main`
2. Build: `npm run build`
3. Update `.env` file with the configuration above
4. Update Google Cloud Console to add the redirect URI
5. Restart: `pm2 restart InboxAI`

See `VPS_SUBPATH_API_FIX.md` for detailed deployment instructions.

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
