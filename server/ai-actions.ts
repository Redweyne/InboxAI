import { getUncachableGmailClient, getCachedTokens, hasRequiredScopes, clearAuth } from "./gmail-client.js";
import { getUncachableGoogleCalendarClient } from "./calendar-client.js";
import { storage } from "./storage.js";

export interface EmailAction {
  type: 'send_email';
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface EmailModifyAction {
  type: 'mark_read' | 'mark_unread' | 'delete' | 'archive' | 'star' | 'unstar';
  emailId: string;
}

export interface CalendarAction {
  type: 'create_event' | 'update_event' | 'delete_event';
  eventData?: {
    summary: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
  };
  eventId?: string;
}

export type AIAction = EmailAction | EmailModifyAction | CalendarAction;

export async function executeSendEmail(action: EmailAction): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log('[AI-ACTION] executeSendEmail called with:', {
    to: action.to,
    subject: action.subject,
    bodyLength: action.body?.length || 0,
    cc: action.cc || '(none)',
    bcc: action.bcc || '(none)',
  });
  
  try {
    console.log('[AI-ACTION] Getting Gmail client...');
    const gmail = await getUncachableGmailClient();
    console.log('[AI-ACTION] Gmail client obtained successfully');

    const email = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `To: ${action.to}\n`,
      action.cc ? `Cc: ${action.cc}\n` : '',
      action.bcc ? `Bcc: ${action.bcc}\n` : '',
      `Subject: ${action.subject}\n\n`,
      action.body,
    ].join('');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('[AI-ACTION] Sending email via Gmail API...');
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log('[AI-ACTION] Email sent successfully! Message ID:', response.data.id);
    return {
      success: true,
      messageId: response.data.id || undefined,
    };
  } catch (error: any) {
    console.error('[AI-ACTION] ERROR sending email:', error.message);
    console.error('[AI-ACTION] Full error details:', JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export async function executeEmailModify(action: EmailModifyAction): Promise<{ success: boolean; error?: string }> {
  try {
    const gmail = await getUncachableGmailClient();

    switch (action.type) {
      case 'mark_read':
        await gmail.users.messages.modify({
          userId: 'me',
          id: action.emailId,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });
        break;

      case 'mark_unread':
        await gmail.users.messages.modify({
          userId: 'me',
          id: action.emailId,
          requestBody: {
            addLabelIds: ['UNREAD'],
          },
        });
        break;

      case 'star':
        await gmail.users.messages.modify({
          userId: 'me',
          id: action.emailId,
          requestBody: {
            addLabelIds: ['STARRED'],
          },
        });
        break;

      case 'unstar':
        await gmail.users.messages.modify({
          userId: 'me',
          id: action.emailId,
          requestBody: {
            removeLabelIds: ['STARRED'],
          },
        });
        break;

      case 'archive':
        await gmail.users.messages.modify({
          userId: 'me',
          id: action.emailId,
          requestBody: {
            removeLabelIds: ['INBOX'],
          },
        });
        break;

      case 'delete':
        await gmail.users.messages.trash({
          userId: 'me',
          id: action.emailId,
        });
        break;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error modifying email:', error);
    return {
      success: false,
      error: error.message || 'Failed to modify email',
    };
  }
}

export async function executeCalendarAction(action: CalendarAction): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const tokens = getCachedTokens();
    
    if (!hasRequiredScopes(tokens)) {
      clearAuth();
      return {
        success: false,
        error: 'Insufficient permissions. Please re-sync your Gmail and Calendar to grant all required permissions.',
      };
    }

    const calendar = await getUncachableGoogleCalendarClient();

    if (action.type === 'create_event' && action.eventData) {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: action.eventData.summary,
          description: action.eventData.description,
          location: action.eventData.location,
          start: {
            dateTime: action.eventData.startTime,
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: action.eventData.endTime,
            timeZone: 'America/New_York',
          },
          attendees: action.eventData.attendees?.map(email => ({ email })),
        },
      });

      return {
        success: true,
        eventId: response.data.id || undefined,
      };
    }

    if (action.type === 'delete_event' && action.eventId) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: action.eventId,
      });

      return { success: true };
    }

    if (action.type === 'update_event' && action.eventId && action.eventData) {
      const updatePayload: any = {};
      
      if (action.eventData.summary) {
        updatePayload.summary = action.eventData.summary;
      }
      if (action.eventData.description) {
        updatePayload.description = action.eventData.description;
      }
      if (action.eventData.location) {
        updatePayload.location = action.eventData.location;
      }
      if (action.eventData.startTime) {
        updatePayload.start = {
          dateTime: action.eventData.startTime,
          timeZone: 'America/New_York',
        };
      }
      if (action.eventData.endTime) {
        updatePayload.end = {
          dateTime: action.eventData.endTime,
          timeZone: 'America/New_York',
        };
      }
      if (action.eventData.attendees) {
        updatePayload.attendees = action.eventData.attendees.map(email => ({ email }));
      }

      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: action.eventId,
        requestBody: updatePayload,
      });

      return {
        success: true,
        eventId: response.data.id || undefined,
      };
    }

    return {
      success: false,
      error: 'Invalid action configuration',
    };
  } catch (error: any) {
    console.error('Error executing calendar action:', error);
    
    if (error.message?.includes('insufficient') || error.code === 403) {
      clearAuth();
      return {
        success: false,
        error: 'Insufficient permissions detected. Please re-sync your account to grant calendar access.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to execute calendar action',
    };
  }
}

export async function executeAIAction(action: AIAction): Promise<{ success: boolean; result?: any; error?: string }> {
  if (action.type === 'send_email') {
    return await executeSendEmail(action);
  }

  if (action.type === 'mark_read' || action.type === 'mark_unread' || action.type === 'delete' || 
      action.type === 'archive' || action.type === 'star' || action.type === 'unstar') {
    return await executeEmailModify(action);
  }

  if (action.type === 'create_event' || action.type === 'update_event' || action.type === 'delete_event') {
    return await executeCalendarAction(action);
  }

  return {
    success: false,
    error: 'Unknown action type',
  };
}
