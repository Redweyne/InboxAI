import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { executeAIAction, type AIAction } from "./ai-actions";
import { isAuthenticated } from "./gmail-client";

// Blueprint integration reference: blueprint:javascript_gemini
// Using Gemini 2.5 Flash for fast, free AI responses

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_CONTEXT = `You are an intelligent AI assistant for "Inbox AI", a personal email and calendar management application with ACTION CAPABILITIES. You can actually perform actions, not just provide advice.

Your capabilities include:
**Reading & Analysis:**
- Summarizing emails and finding important messages
- Identifying urgent emails that need immediate attention
- Analyzing email patterns and calendar schedules
- Answering questions about emails and upcoming meetings

**Actions You Can Perform:**
- Send emails on the user's behalf
- Mark emails as read/unread
- Star or archive emails
- Delete emails (move to trash)
- Create, update, or delete calendar events

**Important Guidelines:**
1. When a user asks you to perform an action (send email, delete email, etc.), you should DO IT and confirm it was done
2. Be proactive - if the user says "send an email to..." or "delete that spam email", execute the action
3. Always confirm what action you took after executing it
4. If you need more information to perform an action (like who to send email to), ask first
5. Be helpful, concise, and action-oriented

If users haven't synced their Gmail and Calendar yet, guide them to do so first.`;

export interface ChatRequest {
  message: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
  actionExecuted?: {
    type: string;
    success: boolean;
    details?: string;
  };
}

export async function generateChatResponse(
  userMessage: string,
  includeContext: boolean = true
): Promise<ChatResponse> {
  try {
    const actionResult = await detectAndExecuteAction(userMessage);
    
    let contextPrompt = "";
    
    if (includeContext) {
      const [emails, events, analytics] = await Promise.all([
        storage.getEmails(),
        storage.getCalendarEvents(),
        storage.getEmailAnalytics(),
      ]);

      const urgentEmails = emails.filter(e => e.isUrgent);
      const unreadEmails = emails.filter(e => !e.isRead);
      const upcomingEvents = await storage.getUpcomingEvents(5);

      contextPrompt = `\n\nCurrent user context:
- Total emails: ${analytics.totalEmails}
- Unread emails: ${analytics.unreadCount}
- Urgent emails: ${analytics.urgentCount}
- Upcoming events today: ${upcomingEvents.length}
${urgentEmails.length > 0 ? `\nMost urgent emails:\n${urgentEmails.slice(0, 3).map(e => `  - ID: ${e.messageId}, From: ${e.from}, Subject: ${e.subject}`).join('\n')}` : ''}
${upcomingEvents.length > 0 ? `\nUpcoming events:\n${upcomingEvents.map(e => `  - ${e.summary} at ${new Date(e.startTime).toLocaleString()}`).join('\n')}` : ''}`;

      if (actionResult) {
        contextPrompt += `\n\nAction just executed: ${JSON.stringify(actionResult)}`;
      }
    }

    const conversationHistory = await storage.getChatMessages();
    const recentMessages = conversationHistory.slice(-6);

    const conversationContext = recentMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    conversationContext.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_CONTEXT + contextPrompt,
      },
      contents: conversationContext,
    });

    const aiResponse = response.text || "I'm sorry, I couldn't generate a response. Please try again.";

    const suggestions = generateSuggestions(userMessage, aiResponse);

    return {
      response: aiResponse,
      suggestions,
      actionExecuted: actionResult ?? undefined,
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error(`Failed to generate response: ${error}`);
  }
}

async function detectAndExecuteAction(userMessage: string): Promise<{ type: string; success: boolean; details?: string } | null> {
  try {
    if (!(await isAuthenticated())) {
      return {
        type: 'error',
        success: false,
        details: 'Please sync your Gmail and Calendar first to enable actions.',
      };
    }

    const actionDetectionPrompt = `Analyze this user message and determine if they want to perform an action. If yes, extract the action details in JSON format.

User message: "${userMessage}"

Possible actions:
1. send_email: {type: "send_email", to: "email", subject: "...", body: "...", cc: "...", bcc: "..."}
2. mark_read: {type: "mark_read", emailId: "message_id"}
3. mark_unread: {type: "mark_unread", emailId: "message_id"}
4. delete: {type: "delete", emailId: "message_id"}
5. archive: {type: "archive", emailId: "message_id"}
6. star: {type: "star", emailId: "message_id"}
7. unstar: {type: "unstar", emailId: "message_id"}
8. create_event: {type: "create_event", summary: "...", startTime: "ISO date", endTime: "ISO date", description: "...", location: "...", attendees: ["email1"]}
9. update_event: {type: "update_event", eventId: "event_id", summary: "...", startTime: "ISO date", endTime: "ISO date", description: "...", location: "...", attendees: ["email1"]}
10. delete_event: {type: "delete_event", eventId: "event_id"}

If no action is requested, return: {type: "none"}

Return ONLY valid JSON, no explanation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: actionDetectionPrompt }],
        },
      ],
    });

    const actionData = JSON.parse(response.text || '{"type":"none"}');
    
    if (actionData.type === 'none' || !actionData.type) {
      return null;
    }

    if (actionData.type === 'send_email') {
      if (!actionData.to || !actionData.subject || !actionData.body) {
        return {
          type: 'send_email',
          success: false,
          details: 'Missing required information. Please provide recipient, subject, and body.',
        };
      }

      const result = await executeAIAction({
        type: 'send_email',
        to: actionData.to,
        subject: actionData.subject,
        body: actionData.body,
        cc: actionData.cc,
        bcc: actionData.bcc,
      });

      return {
        type: 'send_email',
        success: result.success,
        details: result.success ? `Email sent to ${actionData.to}` : result.error,
      };
    }

    if (['mark_read', 'mark_unread', 'delete', 'archive', 'star', 'unstar'].includes(actionData.type)) {
      if (!actionData.emailId) {
        return {
          type: actionData.type,
          success: false,
          details: 'Email ID required. Please specify which email to modify.',
        };
      }

      const result = await executeAIAction({
        type: actionData.type as any,
        emailId: actionData.emailId,
      });

      return {
        type: actionData.type,
        success: result.success,
        details: result.success ? `Email ${actionData.type.replace('_', ' ')}` : result.error,
      };
    }

    if (actionData.type === 'create_event') {
      if (!actionData.summary || !actionData.startTime || !actionData.endTime) {
        return {
          type: 'create_event',
          success: false,
          details: 'Missing event details. Need: summary, start time, and end time.',
        };
      }

      const result = await executeAIAction({
        type: 'create_event',
        eventData: {
          summary: actionData.summary,
          description: actionData.description || '',
          location: actionData.location || '',
          startTime: actionData.startTime,
          endTime: actionData.endTime,
          attendees: actionData.attendees || [],
        },
      });

      return {
        type: 'create_event',
        success: result.success,
        details: result.success ? `Event "${actionData.summary}" created` : result.error,
      };
    }

    if (actionData.type === 'update_event') {
      if (!actionData.eventId) {
        return {
          type: 'update_event',
          success: false,
          details: 'Event ID required to update an event.',
        };
      }

      if (!actionData.summary && !actionData.startTime && !actionData.endTime && 
          !actionData.description && !actionData.location && !actionData.attendees) {
        return {
          type: 'update_event',
          success: false,
          details: 'Please specify what to update (summary, time, description, location, or attendees).',
        };
      }

      const eventData: any = {};
      if (actionData.summary) eventData.summary = actionData.summary;
      if (actionData.description) eventData.description = actionData.description;
      if (actionData.location) eventData.location = actionData.location;
      if (actionData.startTime) eventData.startTime = actionData.startTime;
      if (actionData.endTime) eventData.endTime = actionData.endTime;
      if (actionData.attendees) eventData.attendees = actionData.attendees;

      const result = await executeAIAction({
        type: 'update_event',
        eventId: actionData.eventId,
        eventData,
      });

      return {
        type: 'update_event',
        success: result.success,
        details: result.success ? `Event updated successfully` : result.error,
      };
    }

    if (actionData.type === 'delete_event') {
      if (!actionData.eventId) {
        return {
          type: 'delete_event',
          success: false,
          details: 'Event ID required to delete an event.',
        };
      }

      const result = await executeAIAction({
        type: 'delete_event',
        eventId: actionData.eventId,
      });

      return {
        type: 'delete_event',
        success: result.success,
        details: result.success ? `Event deleted successfully` : result.error,
      };
    }

    return null;
  } catch (error: any) {
    console.error('Action detection error:', error);
    return {
      type: 'error',
      success: false,
      details: `Action detection failed: ${error.message}`,
    };
  }
}

function generateSuggestions(userMessage: string, aiResponse: string): string[] {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('email') || lowerMessage.includes('inbox')) {
    return [
      "Show urgent emails",
      "Summarize today's emails",
      "Find unread messages",
    ];
  }
  
  if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('schedule')) {
    return [
      "Find free time this week",
      "What meetings do I have today?",
      "Show my calendar for tomorrow",
    ];
  }
  
  if (lowerMessage.includes('draft') || lowerMessage.includes('reply') || lowerMessage.includes('write')) {
    return [
      "Draft a professional reply",
      "Help me write a follow-up",
      "Compose a thank you email",
    ];
  }
  
  return [
    "Summarize today's emails",
    "Show urgent emails",
    "Find free time this week",
  ];
}

export async function summarizeEmails(category?: string): Promise<string> {
  try {
    const emails = category 
      ? await storage.getEmailsByCategory(category)
      : await storage.getEmails();

    if (emails.length === 0) {
      return "No emails found to summarize.";
    }

    const emailSummaries = emails.slice(0, 20).map(email => ({
      from: email.from,
      subject: email.subject,
      snippet: email.snippet || '',
      urgent: email.isUrgent,
    }));

    const prompt = `Summarize these emails concisely, highlighting any urgent or important items:\n\n${JSON.stringify(emailSummaries, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Email summarization error:", error);
    throw new Error(`Failed to summarize emails: ${error}`);
  }
}

export async function draftReply(emailId: string, tone: 'professional' | 'casual' | 'formal' = 'professional'): Promise<string> {
  try {
    const email = await storage.getEmail(emailId);
    
    if (!email) {
      throw new Error("Email not found");
    }

    const prompt = `Draft a ${tone} reply to this email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body || email.snippet}

Please write a concise, appropriate response.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Unable to generate draft.";
  } catch (error) {
    console.error("Draft reply error:", error);
    throw new Error(`Failed to draft reply: ${error}`);
  }
}
