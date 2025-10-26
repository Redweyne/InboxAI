import {
  type Email,
  type InsertEmail,
  type CalendarEvent,
  type InsertCalendarEvent,
  type ChatMessage,
  type InsertChatMessage,
  type EmailAnalytics,
  type CalendarAnalytics,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Email operations
  getEmails(): Promise<Email[]>;
  getEmail(id: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined>;
  deleteEmail(id: string): Promise<boolean>;
  getEmailsByCategory(category: string): Promise<Email[]>;
  getUrgentEmails(): Promise<Email[]>;
  getUnreadEmails(): Promise<Email[]>;

  // Calendar operations
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: string): Promise<boolean>;
  getUpcomingEvents(limit?: number): Promise<CalendarEvent[]>;
  getTodayEvents(): Promise<CalendarEvent[]>;

  // Chat operations
  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(): Promise<void>;

  // Analytics
  getEmailAnalytics(): Promise<EmailAnalytics>;
  getCalendarAnalytics(): Promise<CalendarAnalytics>;
}

export class MemStorage implements IStorage {
  private emails: Map<string, Email>;
  private calendarEvents: Map<string, CalendarEvent>;
  private chatMessages: ChatMessage[];

  constructor() {
    this.emails = new Map();
    this.calendarEvents = new Map();
    this.chatMessages = [];
  }

  // Email operations
  async getEmails(): Promise<Email[]> {
    return Array.from(this.emails.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getEmail(id: string): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = randomUUID();
    const email: Email = { 
      ...insertEmail, 
      id,
      date: insertEmail.date || new Date(),
    };
    this.emails.set(id, email);
    return email;
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    const updated = { ...email, ...updates };
    this.emails.set(id, updated);
    return updated;
  }

  async deleteEmail(id: string): Promise<boolean> {
    return this.emails.delete(id);
  }

  async getEmailsByCategory(category: string): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      (email) => email.category === category
    );
  }

  async getUrgentEmails(): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      (email) => email.isUrgent
    );
  }

  async getUnreadEmails(): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      (email) => !email.isRead
    );
  }

  // Calendar operations
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = randomUUID();
    const event: CalendarEvent = { ...insertEvent, id };
    this.calendarEvents.set(id, event);
    return event;
  }

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const event = this.calendarEvents.get(id);
    if (!event) return undefined;
    
    const updated = { ...event, ...updates };
    this.calendarEvents.set(id, updated);
    return updated;
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }

  async getUpcomingEvents(limit: number = 10): Promise<CalendarEvent[]> {
    const now = new Date();
    return Array.from(this.calendarEvents.values())
      .filter((event) => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limit);
  }

  async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Array.from(this.calendarEvents.values()).filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= today && eventDate < tomorrow;
    });
  }

  // Chat operations
  async getChatMessages(): Promise<ChatMessage[]> {
    return [...this.chatMessages];
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: randomUUID(),
      ...insertMessage,
      timestamp: new Date(),
    };
    this.chatMessages.push(message);
    return message;
  }

  async clearChatHistory(): Promise<void> {
    this.chatMessages = [];
  }

  // Analytics
  async getEmailAnalytics(): Promise<EmailAnalytics> {
    const emails = await this.getEmails();
    const unreadEmails = emails.filter((e) => !e.isRead);
    const urgentEmails = emails.filter((e) => e.isUrgent);

    const categoryBreakdown = {
      urgent: emails.filter((e) => e.category === "urgent").length,
      important: emails.filter((e) => e.category === "important").length,
      promotional: emails.filter((e) => e.category === "promotional").length,
      social: emails.filter((e) => e.category === "social").length,
      updates: emails.filter((e) => e.category === "updates").length,
      newsletter: emails.filter((e) => e.category === "newsletter").length,
    };

    // Generate recent activity for last 7 days
    const recentActivity = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = emails.filter((email) => {
        const emailDate = new Date(email.date);
        return emailDate >= date && emailDate < nextDate;
      }).length;

      recentActivity.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return {
      totalEmails: emails.length,
      unreadCount: unreadEmails.length,
      urgentCount: urgentEmails.length,
      categoryBreakdown,
      recentActivity,
    };
  }

  async getCalendarAnalytics(): Promise<CalendarAnalytics> {
    const upcomingEvents = await this.getUpcomingEvents(100);
    const todayEvents = await this.getTodayEvents();

    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const weekEvents = upcomingEvents.filter(
      (event) => new Date(event.startTime) < weekFromNow
    );

    // Calculate free slots for the next 3 days during work hours (9 AM - 5 PM)
    const freeSlots = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      date.setHours(9, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(17, 0, 0, 0);

      // Find events on this day
      const dayEvents = upcomingEvents.filter((event) => {
        const eventDate = new Date(event.startTime);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      });

      // Find gaps between events
      let currentTime = new Date(date);
      dayEvents.forEach((event) => {
        const eventStart = new Date(event.startTime);
        if (currentTime < eventStart && (eventStart.getTime() - currentTime.getTime()) / 1000 / 60 >= 30) {
          freeSlots.push({
            date: date.toISOString().split("T")[0],
            startTime: currentTime.toTimeString().slice(0, 5),
            endTime: eventStart.toTimeString().slice(0, 5),
          });
        }
        currentTime = new Date(Math.max(currentTime.getTime(), new Date(event.endTime).getTime()));
      });

      // Check if there's time after last event
      if (currentTime < dayEnd && (dayEnd.getTime() - currentTime.getTime()) / 1000 / 60 >= 30) {
        freeSlots.push({
          date: date.toISOString().split("T")[0],
          startTime: currentTime.toTimeString().slice(0, 5),
          endTime: dayEnd.toTimeString().slice(0, 5),
        });
      }
    }

    return {
      upcomingEvents: upcomingEvents.length,
      todayEvents: todayEvents.length,
      weekEvents: weekEvents.length,
      freeSlots: freeSlots.slice(0, 5), // Return top 5 free slots
    };
  }
}

export const storage = new MemStorage();
