import type { NextRequest } from 'next/server';
import { config, middleware } from '../middleware';

export function proxy(request: NextRequest) {
  return middleware(request);
}

export { config };
