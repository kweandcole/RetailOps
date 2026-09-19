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


## Current build status — September 2026

The first operational UI is now in the repository. The current flow is:

- Dashboard reads Outlet Master, SKU Master, Visits, Stock, Sampling and Reorders.
- Field reps can log a sampling visit from the mobile-friendly home screen.
- A sampling submission writes a Visit and Sampling record and calculates taste rate and purchase conversion.
- Store pulse highlights recent visits, sampling activity and out-of-stock flags.
- Google Sheets remains the current datastore while the Firebase migration is staged.

### Next build sequence

1. Firebase Authentication and role-aware access.
2. Firestore repository alongside the existing Sheets repository.
3. Browser GPS capture at visit start/submit.
4. Photo upload to Firebase Storage.
5. Store-level analytics and sampling-vs-sales impact analysis.
6. Retire Sheets writes after Firebase parity is verified.
