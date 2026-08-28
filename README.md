# RetailOps

Kwe & Cole RetailOps application. The application uses Next.js and Google Sheets as the v1 data store.

## Google resources

Required environment variables:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`

Optional:

- `GOOGLE_DRIVE_FOLDER_ID`

The Google service account must have access to the target spreadsheet. Do not commit service-account JSON or private keys to GitHub.

## Required Sheets

The v1 data model uses these tabs:

- Outlet Master
- SKU Master
- Visits
- Stock
- Sampling
- Reorders
- Roster

## Local development

```bash
npm install
npm run dev
```

After configuring `.env.local`, check the Sheets connection at `/api/health`.

## Vercel

Connect this GitHub repository to Vercel and add the same environment variables to the Preview and Production environments. Never expose Google credentials as `NEXT_PUBLIC_*` variables.
