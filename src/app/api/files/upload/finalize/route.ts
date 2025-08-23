import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const token = (await cookies()).get('jwt')?.value
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })

  let payload: any = null
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/upload/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await r.text()
  let data: any = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }

  if (!r.ok) return NextResponse.json(typeof data === 'object' ? data : { detail: String(data) }, { status: r.status })
  return NextResponse.json(data)
}


