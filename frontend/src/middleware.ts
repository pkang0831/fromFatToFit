import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const pathname = request.nextUrl.pathname;
  
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/try');
  const isDashboardPage = pathname.startsWith('/home') ||
                        pathname.startsWith('/calories') ||
                        pathname.startsWith('/food-camera') ||
                        pathname.startsWith('/workouts') ||
                        pathname.startsWith('/fasting') ||
                        pathname.startsWith('/body-scan') ||
                        pathname.startsWith('/beauty-scan') ||
                        pathname.startsWith('/fashion') ||
                        pathname.startsWith('/chat') ||
                        pathname.startsWith('/profile') ||
                        pathname.startsWith('/progress') ||
                        pathname.startsWith('/upgrade');

  // Handle root path — show landing page to unauthenticated, redirect to dashboard for authenticated
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Redirect unauthenticated users away from dashboard pages
  if (isDashboardPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
