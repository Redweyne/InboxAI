import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";

// Blueprint integration reference: blueprint:javascript_gemini
// Using Gemini 2.5 Flash for fast, free AI responses

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_CONTEXT = `You are an intelligent AI assistant for "Inbox AI", a personal email and calendar management application. Your purpose is to help users manage their inbox, calendar, and improve their productivity.

Key capabilities you should help with:
- Summarizing emails and finding important messages
- Identifying urgent emails that need immediate attention
- Helping users find free time slots in their calendar
- Drafting professional email responses
- Providing insights about email patterns and calendar schedules
- Answering questions about their emails and upcoming meetings
- Suggesting ways to organize and prioritize their inbox

Be helpful, concise, and friendly. When users ask about their emails or calendar, provide specific, actionable insights. If you don't have access to their actual data yet (because they haven't synced), guide them to sync their Gmail and Calendar first.`;

export interface ChatRequest {
  message: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
}

export async function generateChatResponse(
  userMessage: string,
  includeContext: boolean = true
): Promise<ChatResponse> {
  try {
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
${urgentEmails.length > 0 ? `\nMost urgent emails:\n${urgentEmails.slice(0, 3).map(e => `  - From: ${e.from}, Subject: ${e.subject}`).join('\n')}` : ''}
${upcomingEvents.length > 0 ? `\nUpcoming events:\n${upcomingEvents.map(e => `  - ${e.summary} at ${new Date(e.startTime).toLocaleString()}`).join('\n')}` : ''}`;
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
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error(`Failed to generate response: ${error}`);
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
