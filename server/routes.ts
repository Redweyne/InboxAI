import type { Express, Router } from "express";
import { createServer, type Server } from "http";
import { Router as createRouter } from "express";
import { storage } from "./storage.js";
import { getUncachableGmailClient, getAuthUrl, handleAuthCallback, isAuthenticated, getUserEmail } from "./gmail-client.js";
import { getUncachableGoogleCalendarClient, setTokens as setCalendarTokens } from "./calendar-client.js";
import {
  categorizeEmail,
  isEmailUrgent,
  summarizeEmail,
  generateDraftResponse,
  processChatQuery,
  findFreeSlots,
} from "./intelligence.js";
import { generateChatResponse } from "./ai-service.js";
import { executeSendEmail, executeEmailModify, executeCalendarAction } from "./ai-actions.js";
import type { InsertEmail, InsertCalendarEvent, InsertChatMessage } from "../shared/schema.js";

// Get base path from environment variable (e.g., "/inboxai" for VPS deployment)
// This should match the Vite base config in production
function getBasePath(): string {
  const basePath = process.env.APP_BASE_PATH || '';
  // Ensure it starts with / if not empty, and doesn't end with /
  if (basePath && !basePath.startsWith('/')) {
    return '/' + basePath;
  }
  return basePath.replace(/\/$/, '');
}

export async function registerRoutes(app: Express): Promise<Server> {
  const basePath = getBasePath();
  const apiRouter = createRouter();
  
  console.log(`📍 Registering routes with base path: "${basePath}" (API at ${basePath}/api/...)`);
  
  // ============ OAUTH ROUTES ============
  
  // Check if user is authenticated
  apiRouter.get("/auth/status", async (req, res) => {
    res.json({ authenticated: await isAuthenticated() });
  });
  
  // Debug endpoint to check OAuth configuration
  apiRouter.get("/auth/debug", (req, res) => {
    // Use base path for correct redirect URI construction
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      (process.env.APP_URL 
        ? `${process.env.APP_URL}${basePath}/api/auth/google/callback`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}${basePath}/api/auth/google/callback`
          : `http://localhost:5000${basePath}/api/auth/google/callback`);
    
    res.json({
      redirectUri,
      basePath: basePath || '(none)',
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUriEnv: !!process.env.GOOGLE_REDIRECT_URI,
      hasAppUrl: !!process.env.APP_URL,
      hasBasePath: !!process.env.APP_BASE_PATH,
      environment: process.env.NODE_ENV,
      instructions: [
        '1. Copy the redirect URI above',
        '2. Go to Google Cloud Console > Credentials > Your OAuth Client',
        '3. Add it EXACTLY to "Authorized redirect URIs"',
        '4. Wait 2-3 minutes for propagation',
        '5. Try authentication again'
      ]
    });
  });
  
  // Get OAuth URL
  apiRouter.get("/auth/google/url", (req, res) => {
    try {
      const authUrl = getAuthUrl();
      console.log('📤 Sending OAuth URL to client');
      res.json({ url: authUrl });
    } catch (error: any) {
      console.error('❌ Failed to generate OAuth URL:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // OAuth callback
  apiRouter.get("/auth/google/callback", async (req, res) => {
    try {
      console.log('🔄 OAuth callback received');
      console.log('   Query params:', JSON.stringify(req.query));
      
      // Check for error from Google
      if (req.query.error) {
        console.error('❌ Google OAuth error:', req.query.error);
        console.error('   Error description:', req.query.error_description);
        return res.status(400).send(`Google OAuth error: ${req.query.error} - ${req.query.error_description || 'No description'}`);
      }
      
      const code = req.query.code as string;
      if (!code) {
        console.error('❌ No authorization code in callback');
        return res.status(400).send('Missing authorization code');
      }
      
      console.log('✅ Authorization code received, exchanging for tokens...');
      
      const tokens = await handleAuthCallback(code);
      // Also set tokens for calendar client
      setCalendarTokens(tokens);
      
      // Redirect back to the app
      res.send(`
        <html>
          <body>
            <h1>Authentication Successful!</h1>
            <p>You can now close this window and return to the app.</p>
            <script>
              window.opener?.postMessage({ type: 'gmail-auth-success' }, '*');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // Logout - delete OAuth tokens and clear all synced data
  apiRouter.post("/auth/logout", async (req, res) => {
    try {
      // Delete OAuth token from database
      await storage.deleteOAuthToken('google');
      
      // Clear all synced data (emails, calendar events, tasks, chat messages)
      await storage.clearAllData();
      
      res.json({ 
        success: true,
        message: "Successfully logged out. All data has been cleared."
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============ EMAIL ROUTES ============
  
  // Sync emails from Gmail
  apiRouter.post("/emails/sync", async (req, res) => {
    try {
      const gmail = await getUncachableGmailClient();
      
      // Fetch recent emails (last 100)
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 100,
      });

      const messages = response.data.messages || [];
      const syncedEmails = [];

      // Process each message (up to 100 emails)
      for (const message of messages.slice(0, 100)) {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          });

          const headers = fullMessage.data.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

          const from = getHeader("from");
          const to = getHeader("to");
          const subject = getHeader("subject") || "(No Subject)";
          const date = getHeader("date");

          // Get email body
          let body = "";
          const parts = fullMessage.data.payload?.parts || [];
          
          if (fullMessage.data.payload?.body?.data) {
            body = Buffer.from(fullMessage.data.payload.body.data, "base64").toString("utf-8");
          } else if (parts.length > 0) {
            const textPart = parts.find(p => p.mimeType === "text/plain");
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
            }
          }

          // Clean body (limit length)
          body = body.substring(0, 5000);
          const snippet = summarizeEmail(subject, body);

          // Apply intelligence
          const category = categorizeEmail(from, subject, body);
          const urgent = isEmailUrgent(from, subject, body);

          // Get labels
          const labels = fullMessage.data.labelIds || [];
          const isRead = !labels.includes("UNREAD");
          const isStarred = labels.includes("STARRED");

          // Count attachments
          const attachmentCount = parts.filter(p => p.filename && p.filename.length > 0).length;

          const emailData: InsertEmail = {
            messageId: fullMessage.data.id!,
            threadId: fullMessage.data.threadId || fullMessage.data.id!,
            subject,
            from,
            to,
            snippet,
            body,
            date: date ? new Date(date) : new Date(),
            isRead,
            isStarred,
            category,
            isUrgent: urgent,
            labels,
            attachmentCount,
          };

          const createdEmail = await storage.createEmail(emailData);
          syncedEmails.push(createdEmail);
        } catch (err) {
          console.error("Error processing message:", err);
          continue;
        }
      }

      res.json({ 
        success: true, 
        count: syncedEmails.length,
        emails: syncedEmails 
      });
    } catch (error: any) {
      console.error("Gmail sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all emails
  apiRouter.get("/emails", async (req, res) => {
    try {
      const emails = await storage.getEmails();
      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get email by ID
  apiRouter.get("/emails/:id", async (req, res) => {
    try {
      const email = await storage.getEmail(req.params.id);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get draft response for an email
  apiRouter.get("/emails/:id/draft", async (req, res) => {
    try {
      const email = await storage.getEmail(req.params.id);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      
      const draft = generateDraftResponse(email);
      res.json(draft);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ CALENDAR ROUTES ============

  // Sync calendar events from Google Calendar
  apiRouter.post("/calendar/sync", async (req, res) => {
    try {
      const calendar = await getUncachableGoogleCalendarClient();

      // Fetch events for the next 30 days
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      const syncedEvents = [];

      for (const event of events) {
        const eventData: InsertCalendarEvent = {
          eventId: event.id!,
          summary: event.summary || "(No Title)",
          description: event.description || "",
          location: event.location || "",
          startTime: event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date!),
          endTime: event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date!),
          attendees: event.attendees?.map(a => a.email || "") || [],
          organizer: event.organizer?.email || "",
          status: event.status || "confirmed",
          isAllDay: !!event.start?.date,
          colorId: event.colorId || "",
        };

        const createdEvent = await storage.createCalendarEvent(eventData);
        syncedEvents.push(createdEvent);
      }

      res.json({ 
        success: true, 
        count: syncedEvents.length,
        events: syncedEvents 
      });
    } catch (error: any) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all calendar events
  apiRouter.get("/calendar/events", async (req, res) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming events
  apiRouter.get("/calendar/upcoming", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Find free time slots
  apiRouter.get("/calendar/free-slots", async (req, res) => {
    try {
      const durationMinutes = parseInt(req.query.duration as string) || 60;
      const daysAhead = parseInt(req.query.days as string) || 7;
      
      const events = await storage.getCalendarEvents();
      const freeSlots = findFreeSlots(
        events.map(e => ({ 
          startTime: new Date(e.startTime), 
          endTime: new Date(e.endTime) 
        })),
        durationMinutes,
        daysAhead
      );
      
      res.json(freeSlots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ CHAT ROUTES ============

  // Get chat messages
  apiRouter.get("/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send chat message and get AI response
  apiRouter.post("/chat/send", async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      // Save user message
      const userMessage: InsertChatMessage = {
        role: "user",
        content: content.trim(),
      };
      await storage.createChatMessage(userMessage);

      // Generate AI response using Gemini AI
      const { response: responseContent, suggestions } = await generateChatResponse(content, true);

      // Save AI response
      const aiMessage: InsertChatMessage = {
        role: "assistant",
        content: responseContent,
        metadata: suggestions ? JSON.stringify({ suggestions }) : undefined,
      };
      await storage.createChatMessage(aiMessage);

      res.json({ success: true, suggestions });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clear chat history
  apiRouter.delete("/chat/messages", async (req, res) => {
    try {
      await storage.clearChatHistory();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ANALYTICS ROUTES ============

  // Get email analytics
  apiRouter.get("/analytics/email", async (req, res) => {
    try {
      const analytics = await storage.getEmailAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get calendar analytics
  apiRouter.get("/analytics/calendar", async (req, res) => {
    try {
      const analytics = await storage.getCalendarAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ AI ACTION ROUTES ============

  // Send email via AI
  apiRouter.post("/actions/send-email", async (req, res) => {
    try {
      const { to, subject, body, cc, bcc } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }

      const result = await executeSendEmail({ type: 'send_email', to, subject, body, cc, bcc });

      res.json(result);
    } catch (error: any) {
      console.error("Send email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Modify email (mark read/unread, delete, archive, star)
  apiRouter.post("/actions/modify-email", async (req, res) => {
    try {
      const { emailId, action } = req.body;

      if (!emailId || !action) {
        return res.status(400).json({ error: "Missing required fields: emailId, action" });
      }

      const validActions = ['mark_read', 'mark_unread', 'delete', 'archive', 'star', 'unstar'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
      }

      const result = await executeEmailModify({ type: action as any, emailId });

      res.json(result);
    } catch (error: any) {
      console.error("Modify email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Calendar actions (create, update, delete events)
  apiRouter.post("/actions/calendar", async (req, res) => {
    try {
      const { action, eventData, eventId } = req.body;

      if (!action) {
        return res.status(400).json({ error: "Missing required field: action" });
      }

      const validActions = ['create_event', 'update_event', 'delete_event'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
      }

      const result = await executeCalendarAction({ type: action as any, eventData, eventId });

      res.json(result);
    } catch (error: any) {
      console.error("Calendar action error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ INITIAL DATA SYNC ============
  
  // Endpoint to trigger initial sync
  apiRouter.post("/sync-all", async (req, res) => {
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
      const emailResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 100,
      });

      const messages = emailResponse.data.messages || [];
      let emailCount = 0;

      for (const message of messages.slice(0, 100)) {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          });

          const headers = fullMessage.data.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

          const from = getHeader("from");
          const to = getHeader("to");
          const subject = getHeader("subject") || "(No Subject)";
          const date = getHeader("date");

          let body = "";
          const parts = fullMessage.data.payload?.parts || [];
          
          if (fullMessage.data.payload?.body?.data) {
            body = Buffer.from(fullMessage.data.payload.body.data, "base64").toString("utf-8");
          } else if (parts.length > 0) {
            const textPart = parts.find(p => p.mimeType === "text/plain");
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
            }
          }

          body = body.substring(0, 5000);
          const snippet = summarizeEmail(subject, body);
          const category = categorizeEmail(from, subject, body);
          const urgent = isEmailUrgent(from, subject, body);

          const labels = fullMessage.data.labelIds || [];
          const isRead = !labels.includes("UNREAD");
          const isStarred = labels.includes("STARRED");

          const attachmentCount = parts.filter(p => p.filename && p.filename.length > 0).length;

          const emailData: InsertEmail = {
            messageId: fullMessage.data.id!,
            threadId: fullMessage.data.threadId || fullMessage.data.id!,
            subject,
            from,
            to,
            snippet,
            body,
            date: date ? new Date(date) : new Date(),
            isRead,
            isStarred,
            category,
            isUrgent: urgent,
            labels,
            attachmentCount,
          };

          await storage.createEmail(emailData);
          emailCount++;
        } catch (err) {
          console.error("Error syncing email:", err);
          continue;
        }
      }

      // Sync calendar events
      const calendar = await getUncachableGoogleCalendarClient();
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);

      const calendarResponse = await calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = calendarResponse.data.items || [];
      let eventCount = 0;

      for (const event of events) {
        const eventData: InsertCalendarEvent = {
          eventId: event.id!,
          summary: event.summary || "(No Title)",
          description: event.description || "",
          location: event.location || "",
          startTime: event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date!),
          endTime: event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date!),
          attendees: event.attendees?.map(a => a.email || "") || [],
          organizer: event.organizer?.email || "",
          status: event.status || "confirmed",
          isAllDay: !!event.start?.date,
          colorId: event.colorId || "",
        };

        await storage.createCalendarEvent(eventData);
        eventCount++;
      }

      res.json({ 
        success: true, 
        emailCount,
        eventCount,
      });
    } catch (error: any) {
      console.error("Sync all error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Old sample data implementation below (keeping for reference, but commented out)
  /*
  app.post("/api/sync-all-sample", async (req, res) => {
    try {
      // Generate sample emails
      const sampleEmails = [
        {
          from: "sarah.johnson@techcorp.com",
          to: "me@example.com",
          subject: "Q4 Budget Review Meeting",
          body: "Hi team,\n\nI wanted to schedule a meeting to review our Q4 budget allocations. We need to discuss the resource allocation for the upcoming projects and ensure we're aligned with our financial goals.\n\nBest regards,\nSarah",
          category: "important",
          isUrgent: true,
          isRead: false,
          isStarred: true,
          daysAgo: 0,
        },
        {
          from: "newsletter@techinsider.com",
          to: "me@example.com",
          subject: "Weekly Tech Digest: AI Breakthroughs & Industry News",
          body: "This week in tech: Major AI developments, cloud infrastructure updates, and the latest in cybersecurity trends. Read our comprehensive analysis...",
          category: "newsletter",
          isUrgent: false,
          isRead: false,
          isStarred: false,
          daysAgo: 1,
        },
        {
          from: "alex.martinez@company.io",
          to: "me@example.com",
          subject: "Project Timeline Update",
          body: "Hey,\n\nJust wanted to update you on the project timeline. We're slightly ahead of schedule and should be able to deliver by next Friday instead of the following Monday.\n\nAlex",
          category: "important",
          isUrgent: false,
          isRead: true,
          isStarred: false,
          daysAgo: 1,
        },
        {
          from: "notifications@github.com",
          to: "me@example.com",
          subject: "[replit/agent] New PR: Fix authentication bug",
          body: "A new pull request has been opened...",
          category: "updates",
          isUrgent: false,
          isRead: true,
          isStarred: false,
          daysAgo: 2,
        },
        {
          from: "team@slack.com",
          to: "me@example.com",
          subject: "You have 15 unread messages in #engineering",
          body: "Catch up on the latest conversations in your workspace...",
          category: "social",
          isUrgent: false,
          isRead: false,
          isStarred: false,
          daysAgo: 2,
        },
        {
          from: "offers@retailstore.com",
          to: "me@example.com",
          subject: "🎉 Flash Sale: 50% Off Everything!",
          body: "Limited time offer! Get 50% off all items in our store...",
          category: "promotional",
          isUrgent: false,
          isRead: true,
          isStarred: false,
          daysAgo: 3,
        },
        {
          from: "hr@company.com",
          to: "me@example.com",
          subject: "Important: Benefits Enrollment Deadline",
          body: "This is a reminder that the benefits enrollment deadline is approaching. Please review your options and make your selections by Friday.",
          category: "urgent",
          isUrgent: true,
          isRead: false,
          isStarred: true,
          daysAgo: 0,
        },
        {
          from: "ceo@company.com",
          to: "me@example.com",
          subject: "Company All-Hands Meeting - Friday 2PM",
          body: "Dear team,\n\nI'm excited to announce our quarterly all-hands meeting this Friday at 2 PM. We'll be discussing our achievements, upcoming initiatives, and Q&A session.\n\nLooking forward to seeing everyone there!\n\nBest,\nCEO",
          category: "important",
          isUrgent: true,
          isRead: false,
          isStarred: true,
          daysAgo: 0,
        },
      ];

      let emailCount = 0;
      for (const sample of sampleEmails) {
        const date = new Date();
        date.setDate(date.getDate() - sample.daysAgo);
        date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

        const emailData: InsertEmail = {
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          threadId: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subject: sample.subject,
          from: sample.from,
          to: sample.to,
          snippet: sample.body.substring(0, 100) + "...",
          body: sample.body,
          date,
          isRead: sample.isRead,
          isStarred: sample.isStarred,
          category: sample.category,
          isUrgent: sample.isUrgent,
          labels: sample.isRead ? ["READ"] : ["UNREAD"],
          attachmentCount: 0,
        };

        await storage.createEmail(emailData);
        emailCount++;
      }

      // Generate sample calendar events
      const sampleEvents = [
        {
          summary: "Team Standup",
          description: "Daily team standup meeting",
          location: "Conference Room A",
          daysFromNow: 0,
          startHour: 9,
          duration: 0.5,
          attendees: ["sarah.johnson@techcorp.com", "alex.martinez@company.io"],
        },
        {
          summary: "Product Review",
          description: "Review new product features and roadmap",
          location: "Zoom Meeting",
          daysFromNow: 1,
          startHour: 14,
          duration: 2,
          attendees: ["sarah.johnson@techcorp.com", "product@company.com"],
        },
        {
          summary: "1:1 with Manager",
          description: "Weekly one-on-one meeting",
          location: "Manager's Office",
          daysFromNow: 2,
          startHour: 15,
          duration: 1,
          attendees: ["manager@company.com"],
        },
        {
          summary: "Company All-Hands",
          description: "Quarterly company meeting",
          location: "Main Auditorium",
          daysFromNow: 4,
          startHour: 14,
          duration: 2,
          attendees: ["ceo@company.com", "all@company.com"],
        },
        {
          summary: "Client Demo",
          description: "Demo new features to client",
          location: "Google Meet",
          daysFromNow: 5,
          startHour: 10,
          duration: 1.5,
          attendees: ["client@customer.com", "sales@company.com"],
        },
      ];

      let eventCount = 0;
      for (const sample of sampleEvents) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + sample.daysFromNow);
        startTime.setHours(sample.startHour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + Math.floor(sample.duration));
        endTime.setMinutes(endTime.getMinutes() + ((sample.duration % 1) * 60));

        const eventData: InsertCalendarEvent = {
          eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          summary: sample.summary,
          description: sample.description,
          location: sample.location,
          startTime,
          endTime,
          attendees: sample.attendees,
          organizer: "me@example.com",
          status: "confirmed",
          isAllDay: false,
          colorId: "",
        };

        await storage.createCalendarEvent(eventData);
        eventCount++;
      }

      res.json({ 
        success: true, 
        emailCount,
        eventCount,
      });
    } catch (error: any) {
      console.error("Sync all error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  */

  // ============ DASHBOARD ROUTES ============

  // Get dashboard data
  apiRouter.get("/dashboard", async (req, res) => {
    try {
      const dashboard = await storage.getDashboardData();
      
      // Fetch user email if authenticated
      let userEmail: string | undefined;
      if (await isAuthenticated()) {
        const email = await getUserEmail();
        if (email) {
          userEmail = email;
        }
      }
      
      res.json({ ...dashboard, userEmail });
    } catch (error: any) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ TASK ROUTES ============

  // Get all tasks
  apiRouter.get("/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error: any) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single task
  apiRouter.get("/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      console.error("Get task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create task
  apiRouter.post("/tasks", async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.json(task);
    } catch (error: any) {
      console.error("Create task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update task
  apiRouter.patch("/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      console.error("Update task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete task
  apiRouter.delete("/tasks/:id", async (req, res) => {
    try {
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending tasks
  apiRouter.get("/tasks/filter/pending", async (req, res) => {
    try {
      const tasks = await storage.getPendingTasks();
      res.json(tasks);
    } catch (error: any) {
      console.error("Get pending tasks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ DATA MANAGEMENT ROUTES ============

  // Clear all data
  apiRouter.post("/data/clear", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true, message: "All data cleared successfully" });
    } catch (error: any) {
      console.error("Clear data error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount the API router at the correct path
  // In production with APP_BASE_PATH=/inboxai, this becomes /inboxai/api/...
  // In development without APP_BASE_PATH, this remains /api/...
  const apiMountPath = `${basePath}/api`;
  app.use(apiMountPath, apiRouter);
  console.log(`✅ API routes mounted at: ${apiMountPath}`);

  const httpServer = createServer(app);
  return httpServer;
}
