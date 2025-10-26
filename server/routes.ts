import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUncachableGmailClient } from "./gmail-client";
import { getUncachableGoogleCalendarClient } from "./calendar-client";
import {
  categorizeEmail,
  isEmailUrgent,
  summarizeEmail,
  generateDraftResponse,
  processChatQuery,
  findFreeSlots,
} from "./intelligence";
import type { InsertEmail, InsertCalendarEvent, InsertChatMessage } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============ EMAIL ROUTES ============
  
  // Sync emails from Gmail
  app.post("/api/emails/sync", async (req, res) => {
    try {
      const gmail = await getUncachableGmailClient();
      
      // Fetch recent emails (last 50)
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 50,
      });

      const messages = response.data.messages || [];
      const syncedEmails = [];

      // Process each message
      for (const message of messages.slice(0, 20)) { // Limit to 20 for performance
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
  app.get("/api/emails", async (req, res) => {
    try {
      const emails = await storage.getEmails();
      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get email by ID
  app.get("/api/emails/:id", async (req, res) => {
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
  app.get("/api/emails/:id/draft", async (req, res) => {
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
  app.post("/api/calendar/sync", async (req, res) => {
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
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming events
  app.get("/api/calendar/upcoming", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Find free time slots
  app.get("/api/calendar/free-slots", async (req, res) => {
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
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send chat message and get AI response
  app.post("/api/chat/send", async (req, res) => {
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

      // Get context for intelligent response
      const emails = await storage.getEmails();
      const events = await storage.getCalendarEvents();
      const analytics = await storage.getEmailAnalytics();

      // Generate AI response using rule-based intelligence
      const responseContent = processChatQuery(content, {
        emails,
        events,
        analytics,
      });

      // Save AI response
      const aiMessage: InsertChatMessage = {
        role: "assistant",
        content: responseContent,
      };
      await storage.createChatMessage(aiMessage);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clear chat history
  app.delete("/api/chat/messages", async (req, res) => {
    try {
      await storage.clearChatHistory();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ANALYTICS ROUTES ============

  // Get email analytics
  app.get("/api/analytics/email", async (req, res) => {
    try {
      const analytics = await storage.getEmailAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get calendar analytics
  app.get("/api/analytics/calendar", async (req, res) => {
    try {
      const analytics = await storage.getCalendarAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ INITIAL DATA SYNC ============
  
  // Endpoint to trigger initial sync with sample data
  app.post("/api/sync-all", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
