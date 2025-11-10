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

const USERINFO_SCOPE = [
  'https://www.googleapis.com/auth/userinfo.email',
];

const ALL_SCOPES = [...GMAIL_SCOPES, ...CALENDAR_SCOPES, ...USERINFO_SCOPE];

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

  console.log('🔐 OAuth2 Client Configuration:');
  console.log('   - Redirect URI:', redirectUri);
  console.log('   - Client ID:', clientId?.substring(0, 20) + '...');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ALL_SCOPES,
    prompt: 'consent', // Force consent screen to ensure refresh token
  });
  
  console.log('🔗 Generated OAuth URL');
  console.log('   - URL length:', authUrl.length);
  console.log('   - Scopes:', ALL_SCOPES.join(', '));
  
  return authUrl;
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
    const tokens = await getCachedTokens();
    if (!tokens || !tokens.access_token) {
      console.log('[getUserEmail] No tokens found');
      return null;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    // Try OAuth2 userinfo first (works for new users with userinfo.email scope)
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      if (userInfo.data.email) {
        console.log('[getUserEmail] Successfully fetched email from OAuth2 userinfo');
        return userInfo.data.email;
      }
    } catch (oauthError: any) {
      console.log('[getUserEmail] OAuth2 userinfo failed, trying Gmail API fallback:', oauthError.message);
    }
    
    // Fallback to Gmail API (works for existing users without userinfo scope)
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      if (profile.data.emailAddress) {
        console.log('[getUserEmail] Successfully fetched email from Gmail API');
        return profile.data.emailAddress;
      }
    } catch (gmailError: any) {
      console.error('[getUserEmail] Gmail API also failed:', gmailError.message);
    }
    
    console.log('[getUserEmail] All methods failed to fetch email');
    return null;
  } catch (error: any) {
    console.error('[getUserEmail] Unexpected error:', error.message);
    return null;
  }
}
