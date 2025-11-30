import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage.js";
import { executeAIAction, type AIAction } from "./ai-actions.js";
import { isAuthenticated } from "./gmail-client.js";

// Blueprint integration reference: blueprint:javascript_gemini
// Using Gemini 2.5 Flash for fast, free AI responses

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_CONTEXT = `You are an intelligent AI assistant for "Inbox AI", a personal email and calendar management application.

**Your Capabilities:**
- Reading and understanding email content
- Summarizing emails and finding important messages
- Identifying urgent emails that need immediate attention
- Analyzing email patterns and calendar schedules
- Answering questions about emails and upcoming meetings

**Actions Available:**
- Send emails on the user's behalf
- Mark emails as read/unread
- Star or archive emails
- Delete emails (move to trash)
- Create, update, or delete calendar events

**CRITICAL RULES - READ CAREFULLY:**
1. You do NOT directly execute actions. A separate system handles action execution.
2. Look for "Action just executed:" in your context - this tells you what ACTUALLY happened.
3. If you see "Action just executed:" with "success: true" - confirm the action was completed successfully.
4. If you see "Action just executed:" with "success: false" - tell the user the action FAILED and explain the error.
5. If there is NO "Action just executed:" in your context when user requested an action:
   - Do NOT say "Email sent!" or claim any action was completed
   - Instead, ask the user to provide complete details (recipient email, subject, and body for emails)
   - Example: "I need the recipient's email address, subject, and message body to send the email."
6. NEVER pretend actions were taken. Only report based on actual "Action just executed:" results.

**Guidelines:**
- If you need more information to perform an action, ask first
- Be helpful, concise, and honest about what actually happened
- If users haven't synced their Gmail and Calendar yet, guide them to do so first`;

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
    // Fetch conversation history FIRST so we can pass it to action detection
    const conversationHistory = await storage.getChatMessages();
    const recentMessages = conversationHistory.slice(-6);
    
    // Pass conversation history to action detection so it understands context
    const actionResult = await detectAndExecuteAction(userMessage, recentMessages);
    
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

      // Format emails with full content for AI to read and summarize
      const formatEmailForAI = (email: typeof emails[0]) => {
        const body = email.body || email.snippet || '';
        const truncatedBody = body.length > 1000 ? body.substring(0, 1000) + '...' : body;
        return `  - ID: ${email.messageId}
    From: ${email.from}
    To: ${email.to}
    Subject: ${email.subject}
    Date: ${new Date(email.date).toLocaleString()}
    Category: ${email.category}
    Urgent: ${email.isUrgent ? 'Yes' : 'No'}
    Read: ${email.isRead ? 'Yes' : 'No'}
    Content: ${truncatedBody}`;
      };

      contextPrompt = `\n\nCurrent user context:
- Total emails: ${analytics.totalEmails}
- Unread emails: ${analytics.unreadCount}
- Urgent emails: ${analytics.urgentCount}
- Upcoming events today: ${upcomingEvents.length}

${urgentEmails.length > 0 ? `URGENT EMAILS (need attention):\n${urgentEmails.slice(0, 5).map(formatEmailForAI).join('\n\n')}` : ''}

${unreadEmails.length > 0 ? `\nUNREAD EMAILS:\n${unreadEmails.slice(0, 10).map(formatEmailForAI).join('\n\n')}` : ''}

${emails.length > 0 ? `\nALL EMAILS (most recent ${Math.min(emails.length, 20)}):\n${emails.slice(0, 20).map(formatEmailForAI).join('\n\n')}` : ''}

${upcomingEvents.length > 0 ? `\nUPCOMING EVENTS:\n${upcomingEvents.map(e => `  - ${e.summary} at ${new Date(e.startTime).toLocaleString()}${e.description ? `\n    Description: ${e.description}` : ''}`).join('\n')}` : ''}`;

      if (actionResult) {
        contextPrompt += `\n\nAction just executed: ${JSON.stringify(actionResult)}`;
      } else {
        // Check if user message looks like an action request but no action was detected
        const actionKeywords = ['send', 'email', 'delete', 'archive', 'star', 'mark', 'create event', 'schedule', 'again', 'try'];
        const lowerMessage = userMessage.toLowerCase();
        const looksLikeActionRequest = actionKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (looksLikeActionRequest) {
          contextPrompt += `\n\nNOTE: The user's message appears to request an action, but no action was executed. The action system could not extract the required details. Please ask the user to provide complete information (for emails: recipient address, subject, and body).`;
        }
      }
    }

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

async function detectAndExecuteAction(
  userMessage: string, 
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{ type: string; success: boolean; details?: string } | null> {
  console.log('[ACTION-DETECT] Analyzing user message for actions:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));
  console.log('[ACTION-DETECT] Conversation history length:', conversationHistory.length);
  
  try {
    const isAuth = await isAuthenticated();
    console.log('[ACTION-DETECT] User authenticated:', isAuth);
    
    if (!isAuth) {
      console.log('[ACTION-DETECT] Not authenticated, returning error');
      return {
        type: 'error',
        success: false,
        details: 'Please sync your Gmail and Calendar first to enable actions.',
      };
    }

    // Build conversation context from history
    const historyContext = conversationHistory.length > 0 
      ? `\n\nRecent conversation history (use this to understand context like "send it again", "that email", etc.):\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n`
      : '';

    const actionDetectionPrompt = `Analyze this user message and determine if they want to perform an action. If yes, extract the action details in JSON format.
${historyContext}
Current user message: "${userMessage}"

IMPORTANT: If the user refers to a previous email they wanted to send (like "send it", "try again", "send that email"), look at the conversation history above to find the email details (to, subject, body) they mentioned earlier.

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
    console.log('[ACTION-DETECT] Gemini detected action:', JSON.stringify(actionData));
    
    if (actionData.type === 'none' || !actionData.type) {
      console.log('[ACTION-DETECT] No action detected, returning null');
      return null;
    }

    console.log('[ACTION-DETECT] Action type detected:', actionData.type);

    if (actionData.type === 'send_email') {
      console.log('[ACTION-DETECT] Processing send_email action...');
      if (!actionData.to || !actionData.subject || !actionData.body) {
        console.log('[ACTION-DETECT] Missing required fields for send_email:', { to: !!actionData.to, subject: !!actionData.subject, body: !!actionData.body });
        return {
          type: 'send_email',
          success: false,
          details: 'Missing required information. Please provide recipient, subject, and body.',
        };
      }

      console.log('[ACTION-DETECT] Executing send_email to:', actionData.to);
      const result = await executeAIAction({
        type: 'send_email',
        to: actionData.to,
        subject: actionData.subject,
        body: actionData.body,
        cc: actionData.cc,
        bcc: actionData.bcc,
      });

      console.log('[ACTION-DETECT] send_email result:', result.success ? 'SUCCESS' : 'FAILED', result.error || '');
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
