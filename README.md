# Inbox AI - Intelligent Email & Calendar Assistant

An AI-powered personal assistant for managing your Gmail inbox and Google Calendar with intelligent automation.

## Features

- 📧 **Smart Email Management** - AI categorizes emails automatically
- 📅 **Calendar Integration** - Manage Google Calendar events
- 💬 **AI Chat Assistant** - Powered by Google Gemini AI
- 🤖 **Action Capabilities** - AI can send emails, create events, and more
- 📊 **Analytics** - Track productivity patterns
- 🎯 **Smart Categorization** - Urgent, important, promotional, social, updates, newsletters

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

**CRITICAL:** This app requires three API keys to function. See `.env.example` for details.

#### Option A: On Replit (Recommended)
Add these as Secrets in the Replit environment:
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/app/apikey
- `GOOGLE_CLIENT_ID` - Get from https://console.cloud.google.com/
- `GOOGLE_CLIENT_SECRET` - Same source as Client ID

#### Option B: Locally
1. Copy `.env.example` to `.env`
2. Fill in your actual API keys

### 3. Run the App
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

### 4. First Time Setup
1. Click "Sync Now" to connect your Gmail and Google Calendar
2. Authorize with your Google account
3. Start chatting with your AI assistant!

## How It Works

The AI assistant can:
- **Analyze** your emails and calendar
- **Answer** questions about your schedule
- **Perform actions** like sending emails and creating events

Just ask in natural language:
- "Summarize today's emails"
- "Send an email to john@example.com"
- "Create a meeting tomorrow at 2pm"
- "Show me urgent emails"

## Tech Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend:** Express.js + Node.js
- **AI:** Google Gemini AI (2.5 Flash)
- **APIs:** Gmail API, Google Calendar API
- **Storage:** In-memory (MemStorage)

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── pages/   # Page components
│   │   ├── components/ # UI components
│   │   └── lib/     # Utilities
├── server/          # Express backend
│   ├── ai-service.ts      # Gemini AI integration
│   ├── ai-actions.ts      # AI action execution
│   ├── routes.ts          # API routes
│   ├── gmail-client.ts    # Gmail API client
│   └── calendar-client.ts # Calendar API client
├── shared/          # Shared types and schemas
└── .env.example     # Environment variables template
```

## Important Notes

### Security & Privacy
- API keys are stored as environment variables (never in code)
- When exporting this project, secrets are NOT included for security
- OAuth tokens are handled securely
- See `.env.example` for required secrets

### Importing This Project
If you import this project to a new environment:
1. All the code will be there
2. You must add the three environment variables manually
3. See `.env.example` for what's needed
4. Check `replit.md` for detailed setup instructions

## Development

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
```

## Need Help?

Check out:
- `.env.example` - For required environment variables
- `replit.md` - For detailed project documentation
- Google AI Studio - For Gemini API key: https://aistudio.google.com/
- Google Cloud Console - For OAuth credentials: https://console.cloud.google.com/

## License

MIT
