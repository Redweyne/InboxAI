import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Email schema with categorization and metadata
export const emails = pgTable("emails", {
  id: varchar("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  threadId: text("thread_id"),
  subject: text("subject").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  snippet: text("snippet"),
  body: text("body"),
  date: timestamp("date").notNull(),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  category: text("category").notNull(), // urgent, important, promotional, social, updates, newsletter
  isUrgent: boolean("is_urgent").default(false),
  labels: text("labels").array(),
  attachmentCount: integer("attachment_count").default(0),
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

// Calendar events schema
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  summary: text("summary").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  attendees: text("attendees").array(),
  organizer: text("organizer"),
  status: text("status"), // confirmed, tentative, cancelled
  isAllDay: boolean("is_all_day").default(false),
  colorId: text("color_id"),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Chat messages schema for conversation history
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // user or assistant
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  metadata: text("metadata"), // JSON string for additional data
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Analytics data for email insights
export interface EmailAnalytics {
  totalEmails: number;
  unreadCount: number;
  urgentCount: number;
  categoryBreakdown: {
    urgent: number;
    important: number;
    promotional: number;
    social: number;
    updates: number;
    newsletter: number;
  };
  recentActivity: {
    date: string;
    count: number;
  }[];
}

// Calendar analytics
export interface CalendarAnalytics {
  upcomingEvents: number;
  todayEvents: number;
  weekEvents: number;
  freeSlots: {
    date: string;
    startTime: string;
    endTime: string;
  }[];
}

// Free time slot for scheduling
export interface FreeTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

// Draft email response
export interface DraftResponse {
  subject: string;
  body: string;
  tone: string; // professional, casual, formal
}

// Tasks/Todo schema for task management
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull(), // high, medium, low
  status: text("status").notNull(), // pending, in_progress, completed, cancelled
  dueDate: timestamp("due_date"),
  relatedEmailId: text("related_email_id"),
  relatedEventId: text("related_event_id"),
  category: text("category"), // work, personal, follow-up, etc
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// OAuth tokens schema for persistent storage
export const oauthTokens = pgTable("oauth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // 'google'
  userId: text("user_id").default('default_user'), // For future multi-user support
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertOAuthTokenSchema = createInsertSchema(oauthTokens).omit({
  id: true,
  updatedAt: true,
});

export type InsertOAuthToken = z.infer<typeof insertOAuthTokenSchema>;
export type OAuthToken = typeof oauthTokens.$inferSelect;

// Dashboard data interface
export interface DashboardData {
  greeting: string;
  date: string;
  summary: {
    urgentEmails: number;
    unreadEmails: number;
    todayMeetings: number;
    pendingTasks: number;
  };
  urgentItems: Array<{
    id: string;
    type: 'email' | 'event' | 'task';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    time?: string;
    from?: string;
    quickActions?: Array<{
      label: string;
      action: string;
      variant?: 'default' | 'destructive' | 'outline';
    }>;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
  }>;
  topPriorityTasks: Task[];
  insights: string[];
}
