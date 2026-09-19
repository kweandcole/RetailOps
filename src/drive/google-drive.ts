import { google, drive_v3 } from 'googleapis';
import { getEnv } from '@/config/env';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

export function getDriveOAuthClient() {
  const env = getEnv();
  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET || !env.GOOGLE_DRIVE_REDIRECT_URI) {
    throw new Error('Google Drive OAuth credentials are not configured');
  }

  return new google.auth.OAuth2(
    env.GOOGLE_DRIVE_CLIENT_ID,
    env.GOOGLE_DRIVE_CLIENT_SECRET,
    env.GOOGLE_DRIVE_REDIRECT_URI,
  );
}

export function getDriveClient(): drive_v3.Drive {
  const env = getEnv();
  if (!env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    throw new Error('Google Drive refresh token is not configured');
  }

  const auth = getDriveOAuthClient();
  auth.setCredentials({ refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}
