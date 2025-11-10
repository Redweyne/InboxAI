// Gmail OAuth integration
import { google } from 'googleapis';
import { storage } from './storage';
import type { InsertOAuthToken } from '@shared/schema';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
];

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
];

const ALL_SCOPES = [...GMAIL_SCOPES, ...CALENDAR_SCOPES];

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

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ALL_SCOPES,
  });
}

export async function handleAuthCallback(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Save tokens to database for persistence
  const tokenData: InsertOAuthToken = {
    provider: 'google',
    userId: 'default_user',
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    scope: tokens.scope,
  };
  
  await storage.saveOAuthToken(tokenData);
  return tokens;
}

export async function isAuthenticated() {
  const storedToken = await storage.getOAuthToken('google', 'default_user');
  return storedToken !== undefined;
}

export async function clearAuth() {
  await storage.deleteOAuthToken('google', 'default_user');
}

export async function getCachedTokens() {
  const storedToken = await storage.getOAuthToken('google', 'default_user');
  if (!storedToken) return null;
  
  return {
    access_token: storedToken.accessToken,
    refresh_token: storedToken.refreshToken,
    token_type: storedToken.tokenType,
    expiry_date: storedToken.expiryDate ? storedToken.expiryDate.getTime() : undefined,
    scope: storedToken.scope,
  };
}

export function hasRequiredScopes(tokens: any): boolean {
  if (!tokens || !tokens.scope) {
    return false;
  }
  const tokenScopes = tokens.scope.split(' ');
  return ALL_SCOPES.every(scope => tokenScopes.includes(scope));
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGmailClient() {
  const tokens = await getCachedTokens();
  if (!tokens) {
    throw new Error('Gmail not authenticated. Please authenticate first.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function getUserEmail(): Promise<string | null> {
  try {
    const gmail = await getUncachableGmailClient();
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress || null;
  } catch (error) {
    console.error('Failed to fetch user email:', error);
    return null;
  }
}
