// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = []

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt')?.value
  console.log(token)

  const url = request.nextUrl

  // If route is protected and no token, redirect to login
  if (protectedRoutes.some((path) => url.pathname.startsWith(path)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// Match only protected routes
export const config = {
  matcher: ['/chat'],
}
