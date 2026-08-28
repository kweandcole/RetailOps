import { EXPECTED_HEADERS, SHEET_NAMES, SheetName } from '@/domain/types';
import { appendRows, readRange } from '@/sheets/google-sheets';

export async function validateSheetHeaders(sheet: SheetName) {
  const rows = await readRange(`'${sheet}'!1:1`);
  const actual = rows[0] ?? [];
  const expected = EXPECTED_HEADERS[sheet];
  const missing = expected.filter((header) => !actual.includes(header));
  const unexpected = actual.filter((header) => header && !expected.includes(header));
  return { sheet, valid: missing.length === 0, missing, unexpected, expected, actual };
}

export async function initializeSheetHeaders() {
  const results: Record<string, unknown> = {};
  for (const sheet of Object.values(SHEET_NAMES)) {
    const current = await readRange(`'${sheet}'!1:1`);
    if (!current.length || current[0].length === 0) {
      await appendRows(sheet, [EXPECTED_HEADERS[sheet]]);
      results[sheet] = { initialized: true };
    } else {
      results[sheet] = await validateSheetHeaders(sheet);
    }
  }
  return results;
}
