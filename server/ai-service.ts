import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage.js";
import { executeAIAction, type AIAction } from "./ai-actions.js";
import { isAuthenticated } from "./gmail-client.js";

// Blueprint integration reference: blueprint:javascript_gemini
// Using Gemini 2.5 Flash for fast, free AI responses

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_CONTEXT = `You are a friendly AI assistant for "Inbox AI", a personal email and calendar app.

**ABSOLUTE RULES - NEVER BREAK THESE:**
1. NEVER include JSON, code, tool_code, execution_log, or any technical output in responses
2. NEVER show curly braces {}, square brackets [], or markdown code blocks
3. NEVER fabricate or claim an action succeeded unless you see "[ACTION SUCCESS]" in context
4. NEVER say "Sent!", "Done!", "Email sent" unless you see "[ACTION SUCCESS]" confirmation

**RESPONSE STYLE:**
- Be conversational and casual - like texting a friend
- Keep responses SHORT - one or two sentences max
- Use contractions (I'm, you're, it's, don't, can't, won't)

**HANDLING ACTIONS - THIS IS CRITICAL:**
When user wants to send an email, create events, etc:
1. First, help them draft/prepare by asking for details (recipient, subject, body, etc.)
2. ONLY when they give an EXPLICIT send command ("send it", "yes send", "go ahead and send"), an action executes
3. Look for "[ACTION SUCCESS]" or "[ACTION FAILED]" in your context - this tells you what ACTUALLY happened
4. If you see "[ACTION SUCCESS]" - respond briefly: "Sent!" or "Done!"
5. If you see "[ACTION FAILED]" - explain the error briefly
6. If you DON'T see any action result - the action did NOT happen! Ask for what's missing.

**WHEN DRAFTING EMAILS:**
- Help the user compose the email step by step
- Ask for recipient, subject, and body if not provided
- When they provide all details, ask "Ready to send?" or similar
- DO NOT actually send until they explicitly say "send it", "yes send", etc.

**WHAT COUNTS AS A SEND CONFIRMATION (only these):**
- "send it", "send", "yes send", "send now", "go ahead and send", "please send"
- NOT: "ok", "sure", "sounds good", "you decide", "that's fine"

**GOOD responses:**
- "What's the email address?"
- "Got it! What should the subject be?"
- "Ready to send this to john@example.com?"
- "Sent!" (ONLY when you see [ACTION SUCCESS])

**BAD responses (NEVER DO THESE):**
- Showing ANY JSON, code, or technical data
- "Action just executed: {...}"
- Claiming "Sent!" without seeing [ACTION SUCCESS]
- Long paragraphs explaining what you're doing

**General:**
- If users haven't synced Gmail/Calendar, say "Sync your Gmail first and I can help with that!"
- Be helpful but keep it short`;

// Sanitize AI response to remove any leaked JSON/code and prevent false success claims
function sanitizeAIResponse(
  response: string, 
  actionResult: { type: string; success: boolean; details?: string } | null
): string {
  let sanitized = response;

  // Remove any JSON code blocks
  sanitized = sanitized.replace(/```json[\s\S]*?```/gi, '');
  sanitized = sanitized.replace(/```[\s\S]*?```/gi, '');
  
  // Remove any inline JSON objects (anything that looks like {key: value} or {"key": "value"})
  sanitized = sanitized.replace(/\{[^}]*"[^}]*\}/g, '');
  
  // Remove technical terms that shouldn't appear
  sanitized = sanitized.replace(/tool_code[:\s]*/gi, '');
  sanitized = sanitized.replace(/execution_log[:\s]*/gi, '');
  sanitized = sanitized.replace(/Action just executed[:\s]*/gi, '');
  sanitized = sanitized.replace(/"success"[:\s]*true/gi, '');
  sanitized = sanitized.replace(/"success"[:\s]*false/gi, '');

  // If NO action was executed but response claims success, fix it
  if (!actionResult || !actionResult.success) {
    // Check for false success claims
    const successClaims = /\b(sent!|done!|email sent|email is on its way|your email is on its way|successfully sent|has been sent)\b/i;
    if (successClaims.test(sanitized)) {
      console.log('[SANITIZE] Detected false success claim when no action succeeded, fixing response');
      // Replace false claims with appropriate response
      sanitized = sanitized.replace(successClaims, '');
      sanitized = sanitized.trim();
      if (!sanitized || sanitized.length < 10) {
        // If we stripped too much, provide a helpful response
        sanitized = "I'll help you draft that email. What should I include in it?";
      }
    }
  }

  // Clean up any leftover artifacts
  sanitized = sanitized.replace(/\s{3,}/g, ' '); // Multiple spaces
  sanitized = sanitized.replace(/^\s*\.\.\.\s*$/gm, ''); // Lone ellipsis
  sanitized = sanitized.trim();

  return sanitized || "How can I help you?";
}

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
        if (actionResult.success) {
          contextPrompt += `\n\n[ACTION SUCCESS] ${actionResult.type}: ${actionResult.details || 'completed'}. Give a brief confirmation like "Sent!" or "Done!"`;
        } else {
          contextPrompt += `\n\n[ACTION FAILED] ${actionResult.type}: ${actionResult.details || 'unknown error'}. Explain what went wrong briefly.`;
        }
      } else {
        // NO action was executed - make this crystal clear to the AI
        contextPrompt += `\n\n[NO ACTION EXECUTED] The user's message did not trigger any action. If they want to send an email, help them draft it by asking for details (recipient, subject, body). Do NOT claim any email was sent - no action happened.`;
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

    let aiResponse = response.text || "I'm sorry, I couldn't generate a response. Please try again.";

    // POST-PROCESSING: Sanitize response to remove any leaked JSON/code
    aiResponse = sanitizeAIResponse(aiResponse, actionResult);

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

    const actionDetectionPrompt = `You are an action detector. Analyze if the user wants to EXECUTE an action RIGHT NOW.
${historyContext}
Current user message: "${userMessage}"

CRITICAL: Return {type: "none"} by default. Only return an action if ALL conditions are met.

=== SEND EMAIL ===
ONLY trigger send_email if BOTH conditions are true:
1. User's CURRENT message contains an EXPLICIT send command word
2. All required details (to, subject, body) are available from conversation

EXPLICIT SEND COMMANDS (must contain one of these EXACT patterns):
- "send it" / "send this" / "send the email" / "send now"
- "yes send" / "please send" / "go ahead and send"
- "send" (as the main intent, not "can you send" which is a request)

THESE ARE NOT SEND COMMANDS - return {type: "none"}:
- "can you send" / "could you send" / "write an email" / "draft an email" (these are REQUESTS to help)
- "ok" / "sure" / "sounds good" / "that's fine" / "you decide" / "you can decide" (these are answers to questions)
- "make it longer" / "change the subject" / "add more" (these are EDITS)
- Answering a question like "What subject?" with a subject line

If user says "you decide" or "you can decide" for a detail - that's answering your question, NOT a send command!

=== EMAIL CONTENT RULES ===
When extracting email content from conversation history:
- "to": The recipient email address mentioned
- "subject": The subject discussed, or create one if user said "you decide"
- "body": The message content discussed, properly formatted as an email

=== OTHER ACTIONS ===
- mark_read/mark_unread/delete/archive/star/unstar: Need emailId from context
- create_event: Need summary, startTime, endTime
- update_event: Need eventId and fields to update
- delete_event: Need eventId

=== JSON FORMAT ===
send_email: {type: "send_email", to: "email@example.com", subject: "Subject", body: "Email body text"}
mark_read: {type: "mark_read", emailId: "id"}
create_event: {type: "create_event", summary: "...", startTime: "ISO", endTime: "ISO"}
No action: {type: "none"}

REMEMBER: Default to {type: "none"}. Only return an action for EXPLICIT execution commands.

Return ONLY valid JSON.`;

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
