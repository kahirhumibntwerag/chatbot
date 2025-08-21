// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
    credentials: 'include',
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const token = data.jwt || data.token || data.access_token;
  const resp = NextResponse.json({ ok: true });

  if (token) {
    resp.cookies.set('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false in dev
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return resp;
}
