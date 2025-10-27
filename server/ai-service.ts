import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { executeAIAction, type AIAction } from "./ai-actions";

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
      actionExecuted: actionResult,
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error(`Failed to generate response: ${error}`);
  }
}

async function detectAndExecuteAction(userMessage: string): Promise<{ type: string; success: boolean; details?: string } | null> {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('send') && (lowerMessage.includes('email') || lowerMessage.includes('message'))) {
    const emailMatch = userMessage.match(/to\s+([^\s@]+@[^\s@]+\.[^\s@]+)/i);
    const subjectMatch = userMessage.match(/subject[:\s]+"([^"]+)"|subject[:\s]+([^\n]+)/i);
    
    if (emailMatch) {
      const to = emailMatch[1];
      const subject = subjectMatch ? (subjectMatch[1] || subjectMatch[2]).trim() : 'Message from Inbox AI';
      
      const bodyStart = userMessage.toLowerCase().indexOf('body');
      const body = bodyStart > 0 ? userMessage.substring(bodyStart + 4).trim() : userMessage;

      const result = await executeAIAction({
        type: 'send_email',
        to,
        subject,
        body: body || 'Sent via Inbox AI Assistant',
      });

      return {
        type: 'send_email',
        success: result.success,
        details: result.success ? `Email sent to ${to}` : result.error,
      };
    }
  }

  return null;
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
