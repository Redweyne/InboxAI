// Google Calendar OAuth integration
import { google } from 'googleapis';

let cachedTokens: any = null;

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your secrets.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function setTokens(tokens: any) {
  cachedTokens = tokens;
}

export function isAuthenticated() {
  return cachedTokens !== null;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleCalendarClient() {
  if (!cachedTokens) {
    throw new Error('Google Calendar not authenticated. Please authenticate first.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(cachedTokens);

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
