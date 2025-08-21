import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const new_name = url.searchParams.get('new_name') || ''
  const token = (await cookies()).get('jwt')?.value
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${params.id}/rename?new_name=${encodeURIComponent(new_name)}`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })

  if (!r.ok) {
    const text = await r.text()
    return NextResponse.json({ detail: text || 'Failed to rename' }, { status: r.status })
  }
  return NextResponse.json({ ok: true })
}


