import {
  type Email,
  type InsertEmail,
  type CalendarEvent,
  type InsertCalendarEvent,
  type ChatMessage,
  type InsertChatMessage,
  type EmailAnalytics,
  type CalendarAnalytics,
  type Task,
  type InsertTask,
  type DashboardData,
  type OAuthToken,
  type InsertOAuthToken,
  emails,
  calendarEvents,
  chatMessages,
  tasks,
  oauthTokens,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

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

  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getPendingTasks(): Promise<Task[]>;
  getTasksByPriority(priority: string): Promise<Task[]>;
  getTasksDueToday(): Promise<Task[]>;

  // Dashboard
  getDashboardData(): Promise<DashboardData>;
  
  // OAuth token operations
  saveOAuthToken(token: InsertOAuthToken): Promise<OAuthToken>;
  getOAuthToken(provider: string, userId?: string): Promise<OAuthToken | undefined>;
  deleteOAuthToken(provider: string, userId?: string): Promise<boolean>;
  
  // Data management
  clearAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private emails: Map<string, Email>;
  private calendarEvents: Map<string, CalendarEvent>;
  private chatMessages: ChatMessage[];
  private tasks: Map<string, Task>;

  constructor() {
    this.emails = new Map();
    this.calendarEvents = new Map();
    this.chatMessages = [];
    this.tasks = new Map();
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

  // Task operations
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
    );
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      createdAt: new Date(),
      completedAt: insertTask.status === 'completed' ? new Date() : null,
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...updates,
      completedAt: updates.status === 'completed' && !task.completedAt ? new Date() : task.completedAt,
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getPendingTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.status === 'pending' || task.status === 'in_progress'
    );
  }

  async getTasksByPriority(priority: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.priority === priority
    );
  }

  async getTasksDueToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Array.from(this.tasks.values()).filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    });
  }

  // Dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    const urgentEmails = await this.getUrgentEmails();
    const unreadEmails = await this.getUnreadEmails();
    const todayEvents = await this.getTodayEvents();
    const pendingTasks = await this.getPendingTasks();
    const allEmails = await this.getEmails();

    // Get urgent items (top 5 urgent emails + today's events + high priority tasks)
    const urgentItems: DashboardData['urgentItems'] = [];

    // Add urgent/unread emails
    urgentEmails.slice(0, 3).forEach((email) => {
      urgentItems.push({
        id: email.id,
        type: 'email',
        title: email.subject,
        description: email.snippet || '',
        priority: 'high',
        from: email.from,
        quickActions: [
          { label: 'Mark Read', action: 'mark_read' },
          { label: 'Reply', action: 'reply', variant: 'default' },
          { label: 'Archive', action: 'archive', variant: 'outline' },
        ],
      });
    });

    // Add today's events
    todayEvents.slice(0, 2).forEach((event) => {
      urgentItems.push({
        id: event.id,
        type: 'event',
        title: event.summary,
        description: `${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${event.location || 'No location'}`,
        priority: 'medium',
        time: new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        quickActions: [
          { label: 'View Details', action: 'view_event' },
          { label: 'Join Meeting', action: 'join', variant: 'default' },
        ],
      });
    });

    // Add high priority tasks
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high').slice(0, 2);
    highPriorityTasks.forEach((task) => {
      urgentItems.push({
        id: task.id,
        type: 'task',
        title: task.title,
        description: task.description || '',
        priority: 'high',
        quickActions: [
          { label: 'Complete', action: 'complete', variant: 'default' },
          { label: 'View', action: 'view_task' },
        ],
      });
    });

    // Generate insights
    const insights: string[] = [];
    if (urgentEmails.length > 5) {
      insights.push(`You have ${urgentEmails.length} urgent emails that need attention`);
    }
    if (todayEvents.length > 0) {
      insights.push(`You have ${todayEvents.length} meeting${todayEvents.length > 1 ? 's' : ''} scheduled today`);
    }
    if (unreadEmails.length > 10) {
      insights.push(`Your inbox has ${unreadEmails.length} unread emails`);
    }
    const completedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'completed');
    if (completedTasks.length > 0) {
      insights.push(`Great job! You've completed ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''} recently`);
    }
    if (insights.length === 0) {
      insights.push("You're all caught up! Great work staying organized.");
    }

    return {
      greeting,
      date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      summary: {
        urgentEmails: urgentEmails.length,
        unreadEmails: unreadEmails.length,
        todayMeetings: todayEvents.length,
        pendingTasks: pendingTasks.length,
      },
      urgentItems,
      upcomingEvents: todayEvents.map(event => ({
        id: event.id,
        title: event.summary,
        startTime: new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        endTime: new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        location: event.location,
        attendees: event.attendees || [],
      })),
      topPriorityTasks: pendingTasks.filter(t => t.priority === 'high').slice(0, 5),
      insights,
    };
  }

  // OAuth token operations (in-memory)
  private oauthTokens: Map<string, OAuthToken> = new Map();

  async saveOAuthToken(token: InsertOAuthToken): Promise<OAuthToken> {
    const key = `${token.provider}_${token.userId || 'default_user'}`;
    const savedToken: OAuthToken = {
      id: randomUUID(),
      ...token,
      userId: token.userId || 'default_user',
      updatedAt: new Date(),
    };
    this.oauthTokens.set(key, savedToken);
    return savedToken;
  }

  async getOAuthToken(provider: string, userId: string = 'default_user'): Promise<OAuthToken | undefined> {
    const key = `${provider}_${userId}`;
    return this.oauthTokens.get(key);
  }

  async deleteOAuthToken(provider: string, userId: string = 'default_user'): Promise<boolean> {
    const key = `${provider}_${userId}`;
    return this.oauthTokens.delete(key);
  }

  // Template data loader
  async loadTemplateData(): Promise<void> {
    const now = new Date();

    // Template Emails - Rich variety for testing
    const templateEmails: InsertEmail[] = [
      {
        messageId: 'template-urgent-1',
        threadId: 'thread-1',
        subject: 'URGENT: Q4 Budget Approval Needed by EOD',
        from: 'sarah.johnson@company.com',
        to: 'me@example.com',
        snippet: 'Hi, I need your approval on the Q4 budget proposal before 5 PM today...',
        body: 'Hi,\n\nI need your approval on the Q4 budget proposal before 5 PM today. The board meeting is tomorrow morning and we need to finalize the numbers. Please review the attached spreadsheet and let me know if you have any concerns.\n\nBest regards,\nSarah',
        date: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: false,
        isStarred: true,
        category: 'urgent',
        isUrgent: true,
        labels: ['work', 'action-required'],
        attachmentCount: 1,
      },
      {
        messageId: 'template-urgent-2',
        threadId: 'thread-2',
        subject: 'Client Meeting Rescheduled to 2 PM Today',
        from: 'mike.chen@clientcompany.com',
        to: 'me@example.com',
        snippet: 'Quick update - we need to move our meeting to 2 PM today instead of 4 PM...',
        body: 'Hi there,\n\nQuick update - we need to move our meeting to 2 PM today instead of 4 PM. Hope this works for you. We\'ll discuss the new product roadmap and pricing structure.\n\nSee you soon!\nMike',
        date: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        isRead: false,
        isStarred: false,
        category: 'urgent',
        isUrgent: true,
        labels: ['client', 'meeting'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-important-1',
        threadId: 'thread-3',
        subject: 'Team Performance Review - Action Items',
        from: 'hr@company.com',
        to: 'me@example.com',
        snippet: 'Following up on yesterday\'s team performance review meeting...',
        body: 'Hi,\n\nFollowing up on yesterday\'s team performance review meeting, here are the key action items:\n1. Complete self-assessment by Friday\n2. Schedule 1-on-1s with direct reports\n3. Submit team goals for next quarter\n\nLet me know if you have questions!\n\nBest,\nHR Team',
        date: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        category: 'important',
        isUrgent: false,
        labels: ['work', 'hr'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-important-2',
        threadId: 'thread-4',
        subject: 'Project Alpha: Weekly Status Update',
        from: 'jennifer.lee@company.com',
        to: 'me@example.com',
        snippet: 'Here\'s this week\'s progress on Project Alpha. We\'re 85% complete...',
        body: 'Hi team,\n\nHere\'s this week\'s progress on Project Alpha:\n- Backend API: 95% complete\n- Frontend UI: 80% complete\n- Testing: 60% complete\n\nWe\'re on track for the November 15th launch. Next week we\'ll focus on integration testing and bug fixes.\n\nThanks,\nJennifer',
        date: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        isRead: true,
        isStarred: true,
        category: 'important',
        isUrgent: false,
        labels: ['work', 'project-alpha'],
        attachmentCount: 2,
      },
      {
        messageId: 'template-promo-1',
        threadId: 'thread-5',
        subject: '🎉 50% Off Black Friday Sale - This Weekend Only!',
        from: 'deals@techstore.com',
        to: 'me@example.com',
        snippet: 'Don\'t miss our biggest sale of the year! Up to 50% off on laptops, phones...',
        body: 'BLACK FRIDAY DEALS!\n\nUp to 50% off on:\n- Laptops\n- Smartphones\n- Tablets\n- Accessories\n\nSale ends Monday! Shop now while supplies last.\n\nUse code: BLACKFRIDAY50',
        date: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        isRead: true,
        isStarred: false,
        category: 'promotional',
        isUrgent: false,
        labels: ['shopping'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-social-1',
        threadId: 'thread-6',
        subject: 'John Smith commented on your LinkedIn post',
        from: 'notifications@linkedin.com',
        to: 'me@example.com',
        snippet: 'John Smith and 12 others commented on your post about AI trends...',
        body: 'Hi,\n\nJohn Smith commented: "Great insights on AI! I completely agree with your point about ethical considerations."\n\nView all comments on LinkedIn.',
        date: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        category: 'social',
        isUrgent: false,
        labels: ['linkedin'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-update-1',
        threadId: 'thread-7',
        subject: 'Your Amazon order has shipped!',
        from: 'ship-confirm@amazon.com',
        to: 'me@example.com',
        snippet: 'Good news! Your order #123-4567890-1234567 has been shipped...',
        body: 'Hello,\n\nYour order has been shipped and is on the way!\n\nOrder #123-4567890-1234567\nExpected delivery: Tomorrow by 8 PM\n\nTrack your package: [Tracking Link]',
        date: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        category: 'updates',
        isUrgent: false,
        labels: ['shopping', 'order'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-newsletter-1',
        threadId: 'thread-8',
        subject: 'Tech Weekly: AI Breakthroughs & Industry News',
        from: 'newsletter@techweekly.com',
        to: 'me@example.com',
        snippet: 'This week: New AI models, startup funding rounds, and tech policy updates...',
        body: 'TECH WEEKLY - November Edition\n\nTop Stories:\n1. New AI model achieves breakthrough in reasoning\n2. Tech startups raise $2B in funding this week\n3. New privacy regulations coming in 2025\n\nRead more at techweekly.com\n\nUnsubscribe | Manage preferences',
        date: new Date(now.getTime() - 18 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        category: 'newsletter',
        isUrgent: false,
        labels: ['newsletter', 'tech'],
        attachmentCount: 0,
      },
    ];

    // Template Calendar Events
    const templateEvents: InsertCalendarEvent[] = [
      {
        eventId: 'template-event-1',
        summary: 'Team Standup Meeting',
        description: 'Daily standup to discuss progress and blockers',
        location: 'Conference Room A / Zoom',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30),
        attendees: ['team@company.com', 'manager@company.com'],
        organizer: 'me@example.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '9',
      },
      {
        eventId: 'template-event-2',
        summary: 'Client Presentation - Q4 Results',
        description: 'Present Q4 performance metrics and next quarter roadmap',
        location: 'https://zoom.us/j/1234567890',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0),
        attendees: ['client@company.com', 'sales@company.com'],
        organizer: 'me@example.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '11',
      },
      {
        eventId: 'template-event-3',
        summary: 'Lunch with Sarah',
        description: 'Catch up on Project Alpha',
        location: 'The Garden Restaurant',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30),
        attendees: ['sarah@company.com'],
        organizer: 'me@example.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '2',
      },
      {
        eventId: 'template-event-4',
        summary: 'Product Strategy Workshop',
        description: 'Brainstorming session for 2025 product roadmap',
        location: 'Office - Innovation Lab',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0),
        attendees: ['product-team@company.com'],
        organizer: 'product-lead@company.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '5',
      },
      {
        eventId: 'template-event-5',
        summary: 'Code Review Session',
        description: 'Review PRs for sprint completion',
        location: 'https://meet.google.com/abc-defg-hij',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0),
        attendees: ['dev-team@company.com'],
        organizer: 'tech-lead@company.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '1',
      },
    ];

    // Template Tasks
    const templateTasks: InsertTask[] = [
      {
        title: 'Review and approve Q4 budget proposal',
        description: 'Sarah needs approval before EOD for tomorrow\'s board meeting',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Complete self-assessment for performance review',
        description: 'Fill out the performance review self-assessment form',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Prepare slides for client presentation',
        description: 'Create presentation deck with Q4 metrics and roadmap',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: 'template-event-2',
      },
      {
        title: 'Schedule 1-on-1s with team members',
        description: 'Set up performance review meetings with each team member',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Review Project Alpha weekly update',
        description: 'Read through Jennifer\'s status update and provide feedback',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        category: 'work',
        relatedEmailId: 'template-important-2',
        relatedEventId: null,
      },
      {
        title: 'Submit team goals for next quarter',
        description: 'Define and submit Q1 2025 team objectives',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Book dentist appointment',
        description: 'Schedule 6-month checkup',
        priority: 'low',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
        category: 'personal',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Respond to LinkedIn comments',
        description: 'Reply to John and others who commented on AI post',
        priority: 'low',
        status: 'pending',
        dueDate: null,
        category: 'personal',
        relatedEmailId: 'template-social-1',
        relatedEventId: null,
      },
    ];

    // Load all template data
    for (const email of templateEmails) {
      await this.createEmail(email);
    }

    for (const event of templateEvents) {
      await this.createCalendarEvent(event);
    }

    for (const task of templateTasks) {
      await this.createTask(task);
    }
  }

  async clearAllData(): Promise<void> {
    this.emails.clear();
    this.calendarEvents.clear();
    this.chatMessages = [];
    this.tasks.clear();
  }
}

// Database-backed storage implementation
export class DbStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Disable SSL for local PostgreSQL
      ssl: false,
    });
    this.db = drizzle(pool);
  }
  // Email operations
  async getEmails(): Promise<Email[]> {
    const result = await this.db.select().from(emails).orderBy(desc(emails.date));
    return result;
  }

  async getEmail(id: string): Promise<Email | undefined> {
    const result = await this.db.select().from(emails).where(eq(emails.id, id)).limit(1);
    return result[0];
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = randomUUID();
    const email: Email = {
      ...insertEmail,
      id,
      date: insertEmail.date || new Date(),
    };
    
    const result = await this.db.insert(emails)
      .values(email)
      .onConflictDoUpdate({
        target: emails.messageId,
        set: {
          threadId: email.threadId,
          subject: email.subject,
          from: email.from,
          to: email.to,
          snippet: email.snippet,
          body: email.body,
          date: email.date,
          isRead: email.isRead,
          isStarred: email.isStarred,
          category: email.category,
          isUrgent: email.isUrgent,
          labels: email.labels,
          attachmentCount: email.attachmentCount,
        }
      })
      .returning();
    
    return result[0];
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined> {
    const result = await this.db.update(emails).set(updates).where(eq(emails.id, id)).returning();
    return result[0];
  }

  async deleteEmail(id: string): Promise<boolean> {
    const result = await this.db.delete(emails).where(eq(emails.id, id));
    return true;
  }

  async getEmailsByCategory(category: string): Promise<Email[]> {
    const result = await this.db.select().from(emails).where(eq(emails.category, category));
    return result;
  }

  async getUrgentEmails(): Promise<Email[]> {
    const result = await this.db.select().from(emails).where(eq(emails.isUrgent, true));
    return result;
  }

  async getUnreadEmails(): Promise<Email[]> {
    const result = await this.db.select().from(emails).where(eq(emails.isRead, false));
    return result;
  }

  // Calendar operations
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    const result = await this.db.select().from(calendarEvents).orderBy(asc(calendarEvents.startTime));
    return result;
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    const result = await this.db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
    return result[0];
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = randomUUID();
    const event: CalendarEvent = { ...insertEvent, id };
    
    const result = await this.db.insert(calendarEvents)
      .values(event)
      .onConflictDoUpdate({
        target: calendarEvents.eventId,
        set: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          startTime: event.startTime,
          endTime: event.endTime,
          attendees: event.attendees,
          organizer: event.organizer,
          status: event.status,
          isAllDay: event.isAllDay,
          colorId: event.colorId,
        }
      })
      .returning();
    
    return result[0];
  }

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const result = await this.db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id)).returning();
    return result[0];
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return true;
  }

  async getUpcomingEvents(limit: number = 10): Promise<CalendarEvent[]> {
    const now = new Date();
    const result = await this.db.select().from(calendarEvents)
      .where(gte(calendarEvents.startTime, now))
      .orderBy(asc(calendarEvents.startTime))
      .limit(limit);
    return result;
  }

  async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db.select().from(calendarEvents).where(
      and(
        gte(calendarEvents.startTime, today),
        lte(calendarEvents.startTime, tomorrow)
      )
    );
    return result;
  }

  // Chat operations
  async getChatMessages(): Promise<ChatMessage[]> {
    const result = await this.db.select().from(chatMessages).orderBy(asc(chatMessages.timestamp));
    return result;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const result = await this.db.insert(chatMessages).values(insertMessage).returning();
    return result[0];
  }

  async clearChatHistory(): Promise<void> {
    await this.db.delete(chatMessages);
  }

  // Analytics
  async getEmailAnalytics(): Promise<EmailAnalytics> {
    const allEmails = await this.getEmails();
    const unreadEmails = allEmails.filter((e) => !e.isRead);
    const urgentEmails = allEmails.filter((e) => e.isUrgent);

    const categoryBreakdown = {
      urgent: allEmails.filter((e) => e.category === "urgent").length,
      important: allEmails.filter((e) => e.category === "important").length,
      promotional: allEmails.filter((e) => e.category === "promotional").length,
      social: allEmails.filter((e) => e.category === "social").length,
      updates: allEmails.filter((e) => e.category === "updates").length,
      newsletter: allEmails.filter((e) => e.category === "newsletter").length,
    };

    const recentActivity = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = allEmails.filter((email) => {
        const emailDate = new Date(email.date);
        return emailDate >= date && emailDate < nextDate;
      }).length;

      recentActivity.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return {
      totalEmails: allEmails.length,
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

    const freeSlots = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      date.setHours(9, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(17, 0, 0, 0);

      const dayEvents = upcomingEvents.filter((event) => {
        const eventDate = new Date(event.startTime);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      });

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
      freeSlots: freeSlots.slice(0, 5),
    };
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    const result = await this.db.select().from(tasks).orderBy(tasks.priority, desc(tasks.createdAt));
    return result;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const result = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const result = await this.db.insert(tasks).values(insertTask).returning();
    return result[0];
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const updatedValues = {
      ...updates,
      completedAt: updates.status === 'completed' && !updates.completedAt ? new Date() : updates.completedAt,
    };
    const result = await this.db.update(tasks).set(updatedValues).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  async getPendingTasks(): Promise<Task[]> {
    const result = await this.db.select().from(tasks).where(
      eq(tasks.status, 'pending')
    );
    const inProgressResult = await this.db.select().from(tasks).where(
      eq(tasks.status, 'in_progress')
    );
    return [...result, ...inProgressResult];
  }

  async getTasksByPriority(priority: string): Promise<Task[]> {
    const result = await this.db.select().from(tasks).where(eq(tasks.priority, priority));
    return result;
  }

  async getTasksDueToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db.select().from(tasks).where(
      and(
        gte(tasks.dueDate, today),
        lte(tasks.dueDate, tomorrow)
      )
    );
    return result;
  }

  // Dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const urgentEmails = await this.getUrgentEmails();
    const unreadEmails = await this.getUnreadEmails();
    const todayEvents = await this.getTodayEvents();
    const pendingTasks = await this.getPendingTasks();
    const allEmails = await this.getEmails();

    const urgentItems: DashboardData['urgentItems'] = [];

    urgentEmails.slice(0, 3).forEach((email) => {
      urgentItems.push({
        id: email.id,
        type: 'email',
        title: email.subject,
        description: email.snippet || '',
        priority: 'high',
        from: email.from,
        quickActions: [
          { label: 'Mark Read', action: 'mark_read' },
          { label: 'Reply', action: 'reply', variant: 'default' },
          { label: 'Archive', action: 'archive', variant: 'outline' },
        ],
      });
    });

    todayEvents.slice(0, 2).forEach((event) => {
      urgentItems.push({
        id: event.id,
        type: 'event',
        title: event.summary,
        description: `${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${event.location || 'No location'}`,
        priority: 'medium',
        time: new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        quickActions: [
          { label: 'View Details', action: 'view_event' },
          { label: 'Join Meeting', action: 'join', variant: 'default' },
        ],
      });
    });

    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high').slice(0, 2);
    highPriorityTasks.forEach((task) => {
      urgentItems.push({
        id: task.id,
        type: 'task',
        title: task.title,
        description: task.description || '',
        priority: 'high',
        quickActions: [
          { label: 'Complete', action: 'complete', variant: 'default' },
          { label: 'View', action: 'view_task' },
        ],
      });
    });

    const insights: string[] = [];
    if (urgentEmails.length > 5) {
      insights.push(`You have ${urgentEmails.length} urgent emails that need attention`);
    }
    if (todayEvents.length > 0) {
      insights.push(`You have ${todayEvents.length} meeting${todayEvents.length > 1 ? 's' : ''} scheduled today`);
    }
    if (unreadEmails.length > 10) {
      insights.push(`Your inbox has ${unreadEmails.length} unread emails`);
    }
    const completedTasks = await this.db.select().from(tasks).where(eq(tasks.status, 'completed'));
    if (completedTasks.length > 0) {
      insights.push(`Great job! You've completed ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''} recently`);
    }
    if (insights.length === 0) {
      insights.push("You're all caught up! Great work staying organized.");
    }

    return {
      greeting,
      date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      summary: {
        urgentEmails: urgentEmails.length,
        unreadEmails: unreadEmails.length,
        todayMeetings: todayEvents.length,
        pendingTasks: pendingTasks.length,
      },
      urgentItems,
      upcomingEvents: todayEvents.map(event => ({
        id: event.id,
        title: event.summary,
        startTime: new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        endTime: new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        location: event.location,
        attendees: event.attendees || [],
      })),
      topPriorityTasks: pendingTasks.filter(t => t.priority === 'high').slice(0, 5),
      insights,
    };
  }

  // OAuth token operations (database-backed)
  async saveOAuthToken(token: InsertOAuthToken): Promise<OAuthToken> {
    const userId = token.userId || 'default_user';
    
    // Check if token already exists
    const existing = await this.db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.provider, token.provider),
          eq(oauthTokens.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing token
      const updated = await this.db
        .update(oauthTokens)
        .set({
          ...token,
          userId,
          updatedAt: new Date(),
        })
        .where(eq(oauthTokens.id, existing[0].id))
        .returning();
      return updated[0];
    } else {
      // Insert new token
      const inserted = await this.db
        .insert(oauthTokens)
        .values({
          ...token,
          userId,
        })
        .returning();
      return inserted[0];
    }
  }

  async getOAuthToken(provider: string, userId: string = 'default_user'): Promise<OAuthToken | undefined> {
    const results = await this.db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.provider, provider),
          eq(oauthTokens.userId, userId)
        )
      )
      .limit(1);
    
    return results[0];
  }

  async deleteOAuthToken(provider: string, userId: string = 'default_user'): Promise<boolean> {
    const result = await this.db
      .delete(oauthTokens)
      .where(
        and(
          eq(oauthTokens.provider, provider),
          eq(oauthTokens.userId, userId)
        )
      );
    
    return true;
  }

  // Template data loader - idempotent version that clears existing template data first
  async loadTemplateData(): Promise<void> {
    // Clear any existing template data first to make this idempotent
    const templateEmailIds = [
      'template-urgent-1', 'template-urgent-2', 'template-important-1', 'template-important-2',
      'template-promo-1', 'template-social-1', 'template-update-1', 'template-newsletter-1'
    ];
    const templateEventIds = [
      'template-event-1', 'template-event-2', 'template-event-3', 'template-event-4', 'template-event-5'
    ];
    const templateTaskTitles = [
      'Review and approve Q4 budget proposal',
      'Complete self-assessment for performance review',
      'Prepare slides for client presentation',
      'Schedule 1-on-1s with team members',
      'Review Project Alpha weekly update',
      'Submit team goals for next quarter',
      'Book dentist appointment',
      'Respond to LinkedIn comments'
    ];
    
    // Delete existing template data (using OR conditions for bulk delete)
    for (const messageId of templateEmailIds) {
      await this.db.delete(emails).where(eq(emails.messageId, messageId));
    }
    for (const eventId of templateEventIds) {
      await this.db.delete(calendarEvents).where(eq(calendarEvents.eventId, eventId));
    }
    for (const title of templateTaskTitles) {
      await this.db.delete(tasks).where(eq(tasks.title, title));
    }
    
    const now = new Date();

    const templateEmails: InsertEmail[] = [
      {
        messageId: 'template-urgent-1',
        threadId: 'thread-1',
        subject: 'URGENT: Q4 Budget Approval Needed by EOD',
        from: 'sarah.johnson@company.com',
        to: 'me@example.com',
        snippet: 'Hi, I need your approval on the Q4 budget proposal before 5 PM today...',
        body: 'Hi,\n\nI need your approval on the Q4 budget proposal before 5 PM today. The board meeting is tomorrow morning and we need to finalize the numbers. Please review the attached spreadsheet and let me know if you have any concerns.\n\nBest regards,\nSarah',
        date: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        isRead: false,
        isStarred: true,
        category: 'urgent',
        isUrgent: true,
        labels: ['work', 'action-required'],
        attachmentCount: 1,
      },
      {
        messageId: 'template-urgent-2',
        threadId: 'thread-2',
        subject: 'Client Meeting Rescheduled to 2 PM Today',
        from: 'mike.chen@clientcompany.com',
        to: 'me@example.com',
        snippet: 'Quick update - we need to move our meeting to 2 PM today instead of 4 PM...',
        body: 'Hi there,\n\nQuick update - we need to move our meeting to 2 PM today instead of 4 PM. Hope this works for you. We\'ll discuss the new product roadmap and pricing structure.\n\nSee you soon!\nMike',
        date: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        category: 'urgent',
        isUrgent: true,
        labels: ['client', 'meeting'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-important-1',
        threadId: 'thread-3',
        subject: 'Team Performance Review - Action Items',
        from: 'hr@company.com',
        to: 'me@example.com',
        snippet: 'Following up on yesterday\'s team performance review meeting...',
        body: 'Hi,\n\nFollowing up on yesterday\'s team performance review meeting, here are the key action items:\n1. Complete self-assessment by Friday\n2. Schedule 1-on-1s with direct reports\n3. Submit team goals for next quarter\n\nLet me know if you have questions!\n\nBest,\nHR Team',
        date: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        category: 'important',
        isUrgent: false,
        labels: ['work', 'hr'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-important-2',
        threadId: 'thread-4',
        subject: 'Project Alpha: Weekly Status Update',
        from: 'jennifer.lee@company.com',
        to: 'me@example.com',
        snippet: 'Here\'s this week\'s progress on Project Alpha. We\'re 85% complete...',
        body: 'Hi team,\n\nHere\'s this week\'s progress on Project Alpha:\n- Backend API: 95% complete\n- Frontend UI: 80% complete\n- Testing: 60% complete\n\nWe\'re on track for the November 15th launch. Next week we\'ll focus on integration testing and bug fixes.\n\nThanks,\nJennifer',
        date: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        isRead: true,
        isStarred: true,
        category: 'important',
        isUrgent: false,
        labels: ['work', 'project-alpha'],
        attachmentCount: 2,
      },
      {
        messageId: 'template-promo-1',
        threadId: 'thread-5',
        subject: '🎉 50% Off Black Friday Sale - This Weekend Only!',
        from: 'deals@techstore.com',
        to: 'me@example.com',
        snippet: 'Don\'t miss our biggest sale of the year! Up to 50% off on laptops, phones...',
        body: 'BLACK FRIDAY DEALS!\n\nUp to 50% off on:\n- Laptops\n- Smartphones\n- Tablets\n- Accessories\n\nSale ends Monday! Shop now while supplies last.\n\nUse code: BLACKFRIDAY50',
        date: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        category: 'promotional',
        isUrgent: false,
        labels: ['shopping'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-social-1',
        threadId: 'thread-6',
        subject: 'John Smith commented on your LinkedIn post',
        from: 'notifications@linkedin.com',
        to: 'me@example.com',
        snippet: 'John Smith and 12 others commented on your post about AI trends...',
        body: 'Hi,\n\nJohn Smith commented: "Great insights on AI! I completely agree with your point about ethical considerations."\n\nView all comments on LinkedIn.',
        date: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        category: 'social',
        isUrgent: false,
        labels: ['linkedin'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-update-1',
        threadId: 'thread-7',
        subject: 'Your Amazon order has shipped!',
        from: 'ship-confirm@amazon.com',
        to: 'me@example.com',
        snippet: 'Good news! Your order #123-4567890-1234567 has been shipped...',
        body: 'Hello,\n\nYour order has been shipped and is on the way!\n\nOrder #123-4567890-1234567\nExpected delivery: Tomorrow by 8 PM\n\nTrack your package: [Tracking Link]',
        date: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        category: 'updates',
        isUrgent: false,
        labels: ['shopping', 'order'],
        attachmentCount: 0,
      },
      {
        messageId: 'template-newsletter-1',
        threadId: 'thread-8',
        subject: 'Tech Weekly: AI Breakthroughs & Industry News',
        from: 'newsletter@techweekly.com',
        to: 'me@example.com',
        snippet: 'This week: New AI models, startup funding rounds, and tech policy updates...',
        body: 'TECH WEEKLY - November Edition\n\nTop Stories:\n1. New AI model achieves breakthrough in reasoning\n2. Tech startups raise $2B in funding this week\n3. New privacy regulations coming in 2025\n\nRead more at techweekly.com\n\nUnsubscribe | Manage preferences',
        date: new Date(now.getTime() - 18 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        category: 'newsletter',
        isUrgent: false,
        labels: ['newsletter', 'tech'],
        attachmentCount: 0,
      },
    ];

    const templateEvents: InsertCalendarEvent[] = [
      {
        eventId: 'template-event-1',
        summary: 'Team Standup Meeting',
        description: 'Daily standup to discuss progress and blockers',
        location: 'Conference Room A / Zoom',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30),
        attendees: ['team@company.com', 'manager@company.com'],
        organizer: 'me@example.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '9',
      },
      {
        eventId: 'template-event-2',
        summary: 'Client Presentation - Q4 Results',
        description: 'Present Q4 performance metrics and next quarter roadmap',
        location: 'https://zoom.us/j/1234567890',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0),
        attendees: ['client@company.com', 'sales@company.com'],
        organizer: 'me@example.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '11',
      },
      {
        eventId: 'template-event-3',
        summary: 'Lunch with Sarah',
        description: 'Catch up on Project Alpha',
        location: 'The Garden Restaurant',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30),
        attendees: ['sarah@company.com'],
        organizer: 'me@example.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '2',
      },
      {
        eventId: 'template-event-4',
        summary: 'Product Strategy Workshop',
        description: 'Brainstorming session for 2025 product roadmap',
        location: 'Office - Innovation Lab',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0),
        attendees: ['product-team@company.com'],
        organizer: 'product-lead@company.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '5',
      },
      {
        eventId: 'template-event-5',
        summary: 'Code Review Session',
        description: 'Review PRs for sprint completion',
        location: 'https://meet.google.com/abc-defg-hij',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0),
        attendees: ['dev-team@company.com'],
        organizer: 'tech-lead@company.com',
        status: 'confirmed',
        isAllDay: false,
        colorId: '1',
      },
    ];

    const templateTasks: InsertTask[] = [
      {
        title: 'Review and approve Q4 budget proposal',
        description: 'Sarah needs approval before EOD for tomorrow\'s board meeting',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Complete self-assessment for performance review',
        description: 'Fill out the performance review self-assessment form',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Prepare slides for client presentation',
        description: 'Create presentation deck with Q4 metrics and roadmap',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: 'template-event-2',
      },
      {
        title: 'Schedule 1-on-1s with team members',
        description: 'Set up performance review meetings with each team member',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Review Project Alpha weekly update',
        description: 'Read through Jennifer\'s status update and provide feedback',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        category: 'work',
        relatedEmailId: 'template-important-2',
        relatedEventId: null,
      },
      {
        title: 'Submit team goals for next quarter',
        description: 'Define and submit Q1 2025 team objectives',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
        category: 'work',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Book dentist appointment',
        description: 'Schedule 6-month checkup',
        priority: 'low',
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
        category: 'personal',
        relatedEmailId: null,
        relatedEventId: null,
      },
      {
        title: 'Respond to LinkedIn comments',
        description: 'Reply to John and others who commented on AI post',
        priority: 'low',
        status: 'pending',
        dueDate: null,
        category: 'personal',
        relatedEmailId: 'template-social-1',
        relatedEventId: null,
      },
    ];

    for (const email of templateEmails) {
      await this.createEmail(email);
    }

    for (const event of templateEvents) {
      await this.createCalendarEvent(event);
    }

    for (const task of templateTasks) {
      await this.createTask(task);
    }
  }

  async clearAllData(): Promise<void> {
    await this.db.delete(emails);
    await this.db.delete(calendarEvents);
    await this.db.delete(chatMessages);
    await this.db.delete(tasks);
  }
}

export const storage = new DbStorage();
