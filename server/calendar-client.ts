// Google Calendar OAuth integration
import { google } from 'googleapis';
import { getCachedTokens } from './gmail-client';

// Tokens are now managed by gmail-client.ts and stored in the database
// This ensures both Gmail and Calendar use the same OAuth token

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use GOOGLE_REDIRECT_URI if provided, otherwise construct from APP_URL
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    (process.env.APP_URL 
      ? `${process.env.APP_URL}/api/auth/google/callback`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
        : 'http://localhost:5000/api/auth/google/callback');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your secrets.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function setTokens(tokens: any) {
  // Tokens are managed centrally by gmail-client.ts
  // This function is kept for backwards compatibility but is no longer needed
}

export async function isAuthenticated() {
  const tokens = await getCachedTokens();
  return tokens !== null;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleCalendarClient() {
  const tokens = await getCachedTokens();
  if (!tokens) {
    throw new Error('Google Calendar not authenticated. Please authenticate first.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    ...tokens,
    refresh_token: tokens.refresh_token ?? undefined,
    token_type: tokens.token_type ?? undefined,
    scope: tokens.scope ?? undefined,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
