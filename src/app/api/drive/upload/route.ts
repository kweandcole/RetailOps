import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { getDriveClient } from '@/drive/google-drive';
import { getEnv } from '@/config/env';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    if (!env.GOOGLE_DRIVE_FOLDER_ID) {
      return NextResponse.json({ ok: false, error: 'GOOGLE_DRIVE_FOLDER_ID is not configured' }, { status: 500 });
    }

    const body = await request.json() as {
      visitId?: string;
      outletName?: string;
      photoType?: string;
      fileName?: string;
      mimeType?: string;
      base64?: string;
    };

    if (!body.visitId || !body.base64 || !body.fileName || !body.mimeType) {
      return NextResponse.json({ ok: false, error: 'visitId, fileName, mimeType and base64 are required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(body.mimeType)) {
      return NextResponse.json({ ok: false, error: 'Only JPEG, PNG and WebP images are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(body.base64, 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'Photo must be between 1 byte and 8 MB' }, { status: 400 });
    }

    const drive = getDriveClient();
    const safeType = (body.photoType || 'evidence').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const safeVisit = body.visitId.replace(/[^a-z0-9_-]/gi, '-');
    const safeName = body.fileName.replace(/[^a-z0-9._-]/gi, '-');
    const name = `VIS-${safeVisit}-${safeType}-${Date.now()}-${safeName}`;

    const created = await drive.files.create({
      requestBody: {
        name,
        parents: [env.GOOGLE_DRIVE_FOLDER_ID],
        description: `RetailOps visit evidence | visit ${body.visitId} | ${body.outletName || 'store'}`,
      },
      media: {
        mimeType: body.mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id,name,mimeType,webViewLink,size,createdTime',
    });

    return NextResponse.json({
      ok: true,
      file: {
        id: created.data.id,
        name: created.data.name,
        mimeType: created.data.mimeType,
        webViewLink: created.data.webViewLink || null,
        size: created.data.size ? Number(created.data.size) : buffer.length,
        createdTime: created.data.createdTime || null,
        photoType: body.photoType || 'evidence',
        visitId: body.visitId,
      },
    });
  } catch (error) {
    console.error('Google Drive evidence upload failed', error);
    const err = error as { code?: number; message?: string };
    return NextResponse.json({
      ok: false,
      error: err.message || (error instanceof Error ? error.message : 'Unable to upload photo'),
      googleCode: err.code ?? null,
    }, { status: 500 });
  }
}
