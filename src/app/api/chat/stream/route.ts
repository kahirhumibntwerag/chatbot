import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = (await cookies()).get('jwt')?.value
  if (!token) return new Response('Unauthorized', { status: 401 })

  const qs = new URLSearchParams(url.search)
  qs.set('token', token)

  const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/stream?${qs.toString()}`

  const backendRes = await fetch(backendUrl, {
    headers: { Accept: 'text/event-stream' },
    // Important for streaming
    cache: 'no-store',
  })

  if (!backendRes.ok || !backendRes.body) {
    const text = await backendRes.text().catch(() => 'Failed to connect')
    return new Response(text || 'Upstream error', { status: backendRes.status || 502 })
  }

  // Stream passthrough
  return new Response(backendRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}


