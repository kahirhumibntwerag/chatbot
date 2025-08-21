import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const token = (await cookies()).get('jwt')?.value
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${params.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })

  if (!r.ok) {
    const text = await r.text()
    return NextResponse.json({ detail: text || 'Failed to delete' }, { status: r.status })
  }
  return NextResponse.json({ ok: true })
}


