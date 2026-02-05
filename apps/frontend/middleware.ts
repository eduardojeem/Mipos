import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Skip middleware for RSC fetches to avoid aborting server component streams
  const url = request.nextUrl;
  if (url.searchParams.has('_rsc')) {
    return NextResponse.next();
  }

  // Redirect /admin/settings to /dashboard/settings
  if (url.pathname === '/admin/settings') {
    return NextResponse.redirect(new URL('/dashboard/settings', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (data prefetch for app router)
     * - _next/webpack-hmr (dev HMR)
     * - favicon.ico (favicon file)
     * - asset file extensions (images)
     */
    '/((?!_next/static|_next/image|_next/data|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};