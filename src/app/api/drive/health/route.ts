import { NextResponse } from 'next/server';
import { getDriveClient } from '@/drive/google-drive';
import { getEnv } from '@/config/env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const env = getEnv();
    if (!env.GOOGLE_DRIVE_FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured');

    const drive = getDriveClient();
    const response = await drive.files.get({
      fileId: env.GOOGLE_DRIVE_FOLDER_ID,
      fields: 'id,name,mimeType,trashed',
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      folderId: response.data.id,
      folderName: response.data.name,
      mimeType: response.data.mimeType,
      trashed: response.data.trashed ?? false,
    });
  } catch (error) {
    console.error('Google Drive health check failed', error);
    const err = error as { code?: number; message?: string };
    return NextResponse.json({
      ok: false,
      connected: false,
      googleCode: err.code ?? null,
      googleMessage: err.message ?? (error instanceof Error ? error.message : 'Unknown error'),
    }, { status: 503 });
  }
}
