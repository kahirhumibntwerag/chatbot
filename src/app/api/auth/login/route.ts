// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

function cookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    // domain: '.example.com', // uncomment if using subdomains
  };
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  const acceptHeader = req.headers.get('accept') || '';
  const secFetchMode = req.headers.get('sec-fetch-mode') || '';
  const secFetchDest = req.headers.get('sec-fetch-dest') || '';
  const isDocumentNavigation = secFetchMode === 'navigate' || secFetchDest === 'document';

  // Support both real form posts and fetch
  let username = '';
  let password = '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    username = String(form.get('username') || '');
    password = String(form.get('password') || '');
  } else {
    const body = await req.json().catch(() => ({}));
    username = String(body.username || '');
    password = String(body.password || '');
  }

  const upstream = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
    // credentials not needed unless your API requires them
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const token = data.jwt || data.token || data.access_token;
  if (!token) {
    return NextResponse.json({ error: 'No token returned' }, { status: 500 });
  }

  const isSecure = (() => {
    try {
      return new URL(req.url).protocol === 'https:';
    } catch {
      return process.env.NODE_ENV === 'production';
    }
  })();

  // Generate a new thread id to redirect the user directly into a chat
  const threadId = (globalThis as any).crypto?.randomUUID
    ? (globalThis as any).crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now()}`;

  // If this is a real document navigation (common on iOS Safari),
  // return HTML 200 with Set-Cookie and delayed client-side redirect.
  // Avoid Set-Cookie on 30x redirect, which is flaky on iOS, and give
  // the browser a moment to persist the cookie before navigating.
  if (isDocumentNavigation || acceptHeader.includes('text/html')) {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Signing you in…</title>
    <meta http-equiv="refresh" content="1;url=/chat/${threadId}" />
    <noscript><meta http-equiv="refresh" content="2;url=/chat/${threadId}" /></noscript>
  </head>
  <body>Signing you in…</body>
</html>`;
    const res = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
    res.cookies.set('jwt', token, cookieOptions(isSecure));
    return res;
  }

  // XHR/Fetch clients: set cookie and return JSON
  const json = NextResponse.json({ ok: true, redirectTo: `/chat/${threadId}` });
  json.cookies.set('jwt', token, cookieOptions(isSecure));
  return json;
}