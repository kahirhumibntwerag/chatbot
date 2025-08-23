import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const token = (await cookies()).get('jwt')?.value
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })

  // Stream the incoming multipart body directly to the backend to avoid body parser limits
  const contentType = req.headers.get('content-type') || undefined
  const contentLength = req.headers.get('content-length') || undefined

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/upload`, {
    method: 'POST',
    body: req.body ?? undefined,
    headers: {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const text = await r.text()
  let data: any = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }

  if (!r.ok) return NextResponse.json(typeof data === 'object' ? data : { detail: String(data) }, { status: r.status })
  return NextResponse.json(data ?? { ok: true })
}


