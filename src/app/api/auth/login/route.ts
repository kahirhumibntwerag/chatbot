// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  const acceptHeader = req.headers.get('accept') || '';

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
    credentials: 'include',
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const token = data.jwt || data.token || data.access_token;

  if (token) {
    const isSecure = (() => {
      try {
        return new URL(req.url).protocol === 'https:';
      } catch {
        return process.env.NODE_ENV === 'production';
      }
    })();

    // JSON response for fetch/XHR clients
    const jsonResp = NextResponse.json({ ok: true });
    jsonResp.cookies.set('jwt', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      priority: 'high',
    });

    // Real form post (e.g., iOS Safari) → redirect and also set cookie on the redirect
    if (acceptHeader.includes('text/html')) {
      const redirect = NextResponse.redirect(new URL('/chat', req.url), { status: 303 });
      redirect.cookies.set('jwt', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        priority: 'high',
      });
      return redirect;
    }

    return jsonResp;
  }

  return NextResponse.json({ ok: true });
}