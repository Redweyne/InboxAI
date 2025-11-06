// Google Calendar OAuth integration
import { google } from 'googleapis';
import { getCachedTokens } from './gmail-client';

// Tokens are now managed by gmail-client.ts and stored in the database
// This ensures both Gmail and Calendar use the same OAuth token

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Support both Replit and custom VPS domains
  let redirectUri: string;
  if (process.env.APP_URL) {
    // Custom domain for VPS deployment (e.g., https://yourdomain.com)
    redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Replit development domain
    redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  } else {
    // Local development fallback
    redirectUri = 'http://localhost:5000/api/auth/google/callback';
  }

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
  oauth2Client.setCredentials(tokens);

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
