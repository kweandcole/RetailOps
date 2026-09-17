import { NextResponse } from 'next/server';
import { SheetsRepository } from '@/sheets/repository';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const outlets = await new SheetsRepository().outlets();
    return NextResponse.json({ ok: true, outlets });
  } catch (error) {
    console.error('Legacy outlet lookup failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to read the legacy Outlet Master.' }, { status: 503 });
  }
}
