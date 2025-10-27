// Gmail OAuth integration
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
];

let cachedTokens: any = null;

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
    : 'http://localhost:5000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your secrets.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
}

export async function handleAuthCallback(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  cachedTokens = tokens;
  oauth2Client.setCredentials(tokens);
  return tokens;
}

export function isAuthenticated() {
  return cachedTokens !== null;
}

export function clearAuth() {
  cachedTokens = null;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGmailClient() {
  if (!cachedTokens) {
    throw new Error('Gmail not authenticated. Please authenticate first.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(cachedTokens);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}
