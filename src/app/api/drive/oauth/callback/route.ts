import { NextRequest, NextResponse } from 'next/server';
import { getDriveOAuthClient } from '@/drive/google-drive';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.json({ ok: false, error: `Google authorization failed: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: 'Missing Google authorization code' }, { status: 400 });
  }

  try {
    const { tokens } = await getDriveOAuthClient().getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { ok: false, error: 'Google did not return a refresh token. Revoke the existing RetailOps Drive grant and authorize again.' },
        { status: 400 },
      );
    }

    return new NextResponse(
      `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RetailOps Drive Connected</title></head>
<body style="font-family:Arial,sans-serif;max-width:720px;margin:48px auto;padding:24px;line-height:1.5">
<h1>RetailOps Drive connected</h1>
<p>Google authorization succeeded. Copy the refresh token below into Vercel as the secret environment variable <code>GOOGLE_DRIVE_REFRESH_TOKEN</code>.</p>
<p><strong>Do not share this token in chat or screenshots.</strong></p>
<textarea readonly style="width:100%;min-height:120px;padding:12px;box-sizing:border-box">${tokens.refresh_token}</textarea>
<p>After saving it in Vercel, you can close this page.</p>
</body>
</html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  } catch (error) {
    console.error('Google Drive OAuth callback failed', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to complete Google Drive authorization' },
      { status: 500 },
    );
  }
}
