import { google, sheets_v4 } from 'googleapis';
import { getEnv } from '@/config/env';

export const SHEET_NAMES = ['Outlet Master','SKU Master','Visits','Stock','Sampling','Reorders','Roster'] as const;
export type SheetName = typeof SHEET_NAMES[number];
let client: sheets_v4.Sheets | undefined;

export function getSheetsClient() {
  if (client) return client;
  const env = getEnv();
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  client = google.sheets({ version: 'v4', auth });
  return client;
}

export async function readRange(range: string): Promise<string[][]> {
  const env = getEnv();
  const response = await withRetry(() => getSheetsClient().spreadsheets.values.get({ spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID, range, valueRenderOption: 'UNFORMATTED_VALUE' }));
  return (response.data.values ?? []) as string[][];
}

export async function appendRows(sheet: SheetName, rows: unknown[][]): Promise<void> {
  if (!rows.length) return;
  const env = getEnv();
  await withRetry(() => getSheetsClient().spreadsheets.values.append({ spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID, range: `'${sheet}'!A:Z`, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS', requestBody: { values: rows } }));
}

export async function getSpreadsheetMetadata() {
  const env = getEnv();
  return withRetry(() => getSheetsClient().spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID, fields: 'spreadsheetId,properties(title),sheets(properties(sheetId,title,index))' }));
}

export async function ensureSheetTabs(tabs: readonly string[]) {
  const metadata = await getSpreadsheetMetadata();
  const existing = new Set((metadata.data.sheets ?? []).map(s => s.properties?.title).filter((v): v is string => Boolean(v)));
  const missing = tabs.filter(t => !existing.has(t));
  if (!missing.length) return { created: [], existing: [...existing] };
  const requests: sheets_v4.Schema$Request[] = missing.map(title => ({ addSheet: { properties: { title } } }));
  const env = getEnv();
  await withRetry(() => getSheetsClient().spreadsheets.batchUpdate({ spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID, requestBody: { requests } }));
  return { created: missing, existing: [...existing, ...missing] };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (error) { last = error; if (i === attempts - 1) break; await new Promise(r => setTimeout(r, 500 * 2 ** i)); }
  }
  throw last;
}
