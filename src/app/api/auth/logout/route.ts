import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  // Best-effort notify backend to invalidate session
  try {
    const cookieStore = await cookies()
    const jwt = cookieStore.get('jwt')?.value
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
    if (base) {
      await fetch(`${base}/logout`, {
        method: 'POST',
        headers: {
          ...(jwt ? { Cookie: `jwt=${jwt}` } : {}),
          Accept: 'application/json',
        },
        credentials: 'include',
      })
    }
  } catch {
    // ignore network/backend errors; we'll still clear local cookie
  }

  const isSecure = (() => {
    try {
      return new URL(req.url).protocol === 'https:'
    } catch {
      return process.env.NODE_ENV === 'production'
    }
  })()

  const res = NextResponse.json({ ok: true })

  // Delete the jwt cookie
  res.cookies.set('jwt', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })

  return res
}


