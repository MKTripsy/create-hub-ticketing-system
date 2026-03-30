// import { NextRequest, NextResponse } from 'next/server'

// export function middleware(request: NextRequest) {
//   return NextResponse.next()
// }

// export const config = {
//   matcher: ['/admin/:path*']
// }







//below may be uncommented for a working login. Security currently disabled
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('admin_session')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  // Allow login page always
  if (isLoginPage) return NextResponse.next()

  // Redirect to login if no session on admin routes
  if (isAdminRoute && !session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}