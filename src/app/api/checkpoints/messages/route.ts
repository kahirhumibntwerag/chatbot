import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const token = (await cookies()).get('jwt')?.value
  if (!token) return NextResponse.json([], { status: 200 })

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/checkpoints/messages`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    credentials: 'include',
  })

  if (!r.ok) {
    try { return NextResponse.json(await r.json(), { status: r.status }) } catch { return NextResponse.json([], { status: r.status }) }
  }
  const data = await r.json()
  return NextResponse.json(data)
}


