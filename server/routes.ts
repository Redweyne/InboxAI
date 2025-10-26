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
  
  // Endpoint to trigger initial sync
  app.post("/api/sync-all", async (req, res) => {
    try {
      // Sync emails
      const gmail = await getUncachableGmailClient();
      const emailResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 20,
      });

      const messages = emailResponse.data.messages || [];
      let emailCount = 0;

      for (const message of messages) {
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

  const httpServer = createServer(app);
  return httpServer;
}
