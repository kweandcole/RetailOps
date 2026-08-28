import { NextResponse } from 'next/server';
import { getSpreadsheetMetadata } from '@/sheets/google-sheets';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const metadata = await getSpreadsheetMetadata();
    return NextResponse.json({
      ok: true,
      spreadsheetId: metadata.data.spreadsheetId,
      title: metadata.data.properties?.title ?? null,
      sheets: (metadata.data.sheets ?? [])
        .map((sheet) => sheet.properties?.title)
        .filter(Boolean),
    });
  } catch (error) {
    console.error('Google Sheets health check failed', error);
    return NextResponse.json(
      { ok: false, error: 'Google Sheets connection failed' },
      { status: 503 },
    );
  }
}
