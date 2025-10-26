// Rule-based intelligence engine for email categorization and analysis
import type { InsertEmail, DraftResponse, FreeTimeSlot } from "@shared/schema";

// Categorize email based on sender, subject, and content
export function categorizeEmail(from: string, subject: string, body: string): string {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Urgent indicators
  const urgentPatterns = [
    'urgent', 'asap', 'immediately', 'critical', 'emergency',
    'deadline', 'today', 'now', 'important', 'action required'
  ];

  if (urgentPatterns.some(pattern => subjectLower.includes(pattern) || bodyLower.includes(pattern))) {
    return 'urgent';
  }

  // Newsletter indicators
  const newsletterPatterns = [
    'unsubscribe', 'newsletter', 'weekly digest', 'monthly update',
    'subscription', 'mailing list'
  ];
  
  if (newsletterPatterns.some(pattern => bodyLower.includes(pattern)) ||
      fromLower.includes('newsletter') || fromLower.includes('noreply')) {
    return 'newsletter';
  }

  // Promotional indicators
  const promoPatterns = [
    'discount', 'sale', 'offer', 'deal', 'promo', 'coupon',
    '% off', 'limited time', 'buy now', 'shop now', 'exclusive'
  ];

  if (promoPatterns.some(pattern => subjectLower.includes(pattern) || bodyLower.includes(pattern))) {
    return 'promotional';
  }

  // Social indicators
  const socialPatterns = [
    'liked your', 'commented on', 'mentioned you', 'tagged you',
    'friend request', 'followed you', 'connection request'
  ];

  const socialDomains = ['facebook', 'twitter', 'linkedin', 'instagram'];

  if (socialPatterns.some(pattern => subjectLower.includes(pattern)) ||
      socialDomains.some(domain => fromLower.includes(domain))) {
    return 'social';
  }

  // Updates indicators
  const updatePatterns = [
    'update', 'notification', 'alert', 'reminder', 'confirmation',
    'receipt', 'invoice', 'order', 'shipment', 'delivery'
  ];

  if (updatePatterns.some(pattern => subjectLower.includes(pattern))) {
    return 'updates';
  }

  // Default to important
  return 'important';
}

// Determine if email is urgent
export function isEmailUrgent(from: string, subject: string, body: string): boolean {
  const urgentPatterns = [
    'urgent', 'asap', 'immediately', 'critical', 'emergency',
    'deadline today', 'deadline tomorrow', 'action required',
    'important:', 'high priority'
  ];

  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  return urgentPatterns.some(pattern => 
    subjectLower.includes(pattern) || bodyLower.includes(pattern)
  );
}

// Generate intelligent email summary
export function summarizeEmail(subject: string, body: string): string {
  // Extract first meaningful sentence or paragraph
  const lines = body.split('\n').filter(line => line.trim().length > 20);
  
  if (lines.length === 0) {
    return subject;
  }

  // Take first significant line, limit to 150 characters
  let summary = lines[0].trim();
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }

  return summary;
}

// Generate draft response based on email content
export function generateDraftResponse(email: InsertEmail): DraftResponse {
  const subject = email.subject;
  const category = email.category;

  let responseSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  let tone = 'professional';
  let body = '';

  switch (category) {
    case 'urgent':
      tone = 'formal';
      body = `Thank you for your urgent message regarding "${subject}".\n\nI have received your email and will address this matter with highest priority. I will get back to you with a detailed response shortly.\n\nBest regards`;
      break;

    case 'important':
      tone = 'professional';
      body = `Thank you for your email regarding "${subject}".\n\nI appreciate you reaching out. I have reviewed your message and will respond with the information you need.\n\nBest regards`;
      break;

    case 'promotional':
      tone = 'casual';
      body = `Thank you for sharing this offer.\n\nI'll review the details and get back to you if interested.\n\nBest regards`;
      break;

    case 'social':
      tone = 'casual';
      body = `Thanks for connecting!\n\nI appreciate you reaching out. Let's stay in touch.\n\nBest regards`;
      break;

    default:
      tone = 'professional';
      body = `Thank you for your email.\n\nI have received your message and will respond accordingly.\n\nBest regards`;
  }

  return {
    subject: responseSubject,
    body,
    tone,
  };
}

// Find free time slots for scheduling
export function findFreeSlots(
  events: { startTime: Date; endTime: Date }[],
  durationMinutes: number = 60,
  daysAhead: number = 7
): FreeTimeSlot[] {
  const freeSlots: FreeTimeSlot[] = [];
  const workHourStart = 9; // 9 AM
  const workHourEnd = 17; // 5 PM

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(workHourStart, 0, 0, 0);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const dayEnd = new Date(date);
    dayEnd.setHours(workHourEnd, 0, 0, 0);

    // Get events for this day
    const dayEvents = events
      .filter(event => {
        const eventDate = new Date(event.startTime);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Find gaps between events
    let currentTime = new Date(date);

    for (const event of dayEvents) {
      const eventStart = new Date(event.startTime);
      const gapMinutes = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);

      if (gapMinutes >= durationMinutes) {
        freeSlots.push({
          date: date.toISOString().split('T')[0],
          startTime: currentTime.toTimeString().slice(0, 5),
          endTime: eventStart.toTimeString().slice(0, 5),
          durationMinutes: Math.floor(gapMinutes),
        });
      }

      currentTime = new Date(Math.max(currentTime.getTime(), new Date(event.endTime).getTime()));
    }

    // Check time after last event
    const remainingMinutes = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60);
    if (remainingMinutes >= durationMinutes) {
      freeSlots.push({
        date: date.toISOString().split('T')[0],
        startTime: currentTime.toTimeString().slice(0, 5),
        endTime: dayEnd.toTimeString().slice(0, 5),
        durationMinutes: Math.floor(remainingMinutes),
      });
    }
  }

  return freeSlots.slice(0, 10); // Return top 10 slots
}

// Process chat query and generate intelligent response
export function processChatQuery(
  query: string,
  context: {
    emails?: any[];
    events?: any[];
    analytics?: any;
  }
): string {
  const queryLower = query.toLowerCase();

  // Email-related queries
  if (queryLower.includes('email') || queryLower.includes('inbox') || queryLower.includes('message')) {
    if (queryLower.includes('urgent')) {
      const urgentCount = context.emails?.filter(e => e.isUrgent).length || 0;
      return `You have ${urgentCount} urgent email${urgentCount !== 1 ? 's' : ''} in your inbox. ${urgentCount > 0 ? 'I recommend reviewing them as soon as possible.' : 'Great job staying on top of your inbox!'}`;
    }

    if (queryLower.includes('unread')) {
      const unreadCount = context.emails?.filter(e => !e.isRead).length || 0;
      return `You have ${unreadCount} unread email${unreadCount !== 1 ? 's' : ''} waiting for you.`;
    }

    if (queryLower.includes('summarize') || queryLower.includes('summary')) {
      const totalEmails = context.emails?.length || 0;
      const urgentCount = context.emails?.filter(e => e.isUrgent).length || 0;
      const unreadCount = context.emails?.filter(e => !e.isRead).length || 0;

      return `Here's your email summary:\n• Total emails: ${totalEmails}\n• Unread: ${unreadCount}\n• Urgent: ${urgentCount}\n\n${urgentCount > 0 ? 'You have urgent emails that need attention!' : 'Your inbox is under control.'}`;
    }

    const totalEmails = context.emails?.length || 0;
    return `You have ${totalEmails} email${totalEmails !== 1 ? 's' : ''} in your inbox. Would you like me to help you organize or summarize them?`;
  }

  // Calendar-related queries
  if (queryLower.includes('calendar') || queryLower.includes('meeting') || queryLower.includes('event') || queryLower.includes('schedule')) {
    if (queryLower.includes('today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayEvents = context.events?.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= today && eventDate < tomorrow;
      }) || [];

      if (todayEvents.length === 0) {
        return "You have no events scheduled for today. Your calendar is clear!";
      }

      const eventList = todayEvents
        .map(e => `• ${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.summary}`)
        .join('\n');

      return `You have ${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today:\n\n${eventList}`;
    }

    if (queryLower.includes('free') || queryLower.includes('available')) {
      const upcomingEvents = context.events?.filter(e => new Date(e.startTime) > new Date()) || [];
      const freeSlots = findFreeSlots(
        upcomingEvents.map(e => ({ startTime: new Date(e.startTime), endTime: new Date(e.endTime) })),
        60,
        5
      );

      if (freeSlots.length === 0) {
        return "Your calendar is quite busy! I couldn't find many free slots in the next few days.";
      }

      const slotList = freeSlots.slice(0, 3)
        .map(s => `• ${new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${s.startTime} (${s.durationMinutes} min available)`)
        .join('\n');

      return `Here are your next available time slots:\n\n${slotList}`;
    }

    const upcomingCount = context.events?.filter(e => new Date(e.startTime) > new Date()).length || 0;
    return `You have ${upcomingCount} upcoming event${upcomingCount !== 1 ? 's' : ''} on your calendar. Would you like to see them or find available time slots?`;
  }

  // Analytics queries
  if (queryLower.includes('analytics') || queryLower.includes('stats') || queryLower.includes('report')) {
    const totalEmails = context.analytics?.totalEmails || 0;
    const unreadCount = context.analytics?.unreadCount || 0;
    const urgentCount = context.analytics?.urgentCount || 0;

    return `Here are your email analytics:\n• Total emails: ${totalEmails}\n• Unread: ${unreadCount}\n• Urgent: ${urgentCount}\n\nCheck the Analytics page for detailed visualizations!`;
  }

  // Default helpful response
  return "I can help you with:\n• Summarizing your emails\n• Finding urgent or unread messages\n• Checking your calendar and meetings\n• Finding free time slots\n• Viewing analytics and insights\n\nWhat would you like to know?";
}
