import { NextResponse } from 'next/server';
import { getSpreadsheetMetadata } from '@/src/sheets/google-sheets';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const metadata = await getSpreadsheetMetadata();
    const tabs = (metadata.data.sheets ?? []).map(s => s.properties?.title).filter(Boolean);
    return NextResponse.json({ ok: true, spreadsheetId: metadata.data.spreadsheetId, title: metadata.data.properties?.title, tabs });
  } catch (error) {
    console.error('Google Sheets health check failed', error);
    return NextResponse.json({ ok: false, error: 'Google Sheets connection failed' }, { status: 503 });
  }
}
