import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  const token = (await cookies()).get('jwt')?.value
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ token })
}


