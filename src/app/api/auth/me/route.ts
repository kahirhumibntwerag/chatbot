import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value

  if (!token) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: any = null
  try {
    data = await res.json()
  } catch (_) {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    return NextResponse.json(data ?? { detail: 'Unauthorized' }, { status: res.status })
  }

  return NextResponse.json(data)
}


