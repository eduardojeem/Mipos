import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache replacement for Redis
class SimpleCache {
  private static cache = new Map<string, { data: any; expires: number }>();
  
  static get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  static set(key: string, data: any, ttlSeconds: number): void {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expires });
  }
  
  static delete(key: string): void {
    this.cache.delete(key);
  }
  
  static deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  static clear(): void {
    this.cache.clear();
  }
}

function getTTLForPath(pathname: string) {
  if (pathname.startsWith('/api/products')) return 15;
  if (pathname.startsWith('/api/users')) return 30;
  return 20;
}

export async function GET(req: NextRequest) {
  const { pathname, search } = new URL(req.url);
  const key = `cache:${pathname}${search}`;

  // Check simple cache
  const cached = SimpleCache.get(key);
  if (cached) {
    return NextResponse.json(cached, { status: 200, headers: { 'x-cache': 'HIT' } });
  }

  // Simula datos (reemplazar por DB/servicio real)
  const data = { items: [], meta: { source: 'origin', ts: Date.now() } };

  const ttl = getTTLForPath(pathname);
  SimpleCache.set(key, data, ttl);

  return NextResponse.json(data, { status: 200, headers: { 'x-cache': 'MISS' } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prefix = body?.prefix ?? '/api/products';
  
  // Invalidate cache pattern using simple cache
  SimpleCache.deletePattern(`cache:${prefix}*`);
  
  return NextResponse.json({ ok: true });
}