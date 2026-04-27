import type { NextRequest } from 'next/server';
import { middleware } from '../middleware';

export default function runMiddleware(request: NextRequest) {
  return middleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|_next/webpack-hmr|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
