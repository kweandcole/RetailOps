import { z } from 'zod';

const schema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1).optional(),
  GOOGLE_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: z.string().min(1).optional(),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
}).superRefine((value, ctx) => {
  const hasBase64 = Boolean(value.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64);
  const hasPem = Boolean(value.GOOGLE_SERVICE_ACCOUNT_EMAIL && value.GOOGLE_PRIVATE_KEY);

  if (!hasBase64 && !hasPem) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['GOOGLE_SERVICE_ACCOUNT_JSON_BASE64'],
      message: 'Provide GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 or both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY',
    });
  }
});

export function getEnv() {
  const parsed = schema.safeParse({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
  });
  if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.message}`);
  return parsed.data;
}
