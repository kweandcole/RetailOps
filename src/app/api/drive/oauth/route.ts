import { NextResponse } from 'next/server';
import { DRIVE_SCOPE, getDriveOAuthClient } from '@/drive/google-drive';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authUrl = getDriveOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [DRIVE_SCOPE],
      include_granted_scopes: true,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Drive OAuth start failed', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to start Google Drive authorization' },
      { status: 500 },
    );
  }
}
