import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Request } from 'express';

let cachedClient: SupabaseClient | null = null;

function readEnvValue(...keys: string[]): string | null {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw !== 'string') continue;
    const value = raw.trim().replace(/^['"]|['"]$/g, '');
    if (value) return value;
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = readEnvValue('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const serviceKey = readEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = readEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
  return Boolean(supabaseUrl && (serviceKey || anonKey));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const supabaseUrl = readEnvValue('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const serviceKey = readEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = readEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null;
  }

  // Prefer service role for server-side operations; fallback to anon in dev.
  cachedClient = createClient(supabaseUrl, serviceKey || anonKey!);
  return cachedClient;
}

export function isDevMockMode(): boolean {
  const dev = process.env.NODE_ENV !== 'production';
  const mock = process.env.MOCK_AUTH === 'true';
  const supabaseMissing = !isSupabaseConfigured();
  return dev && (mock || supabaseMissing);
}

export function extractTokenFromHeaders(req: Request): string | null {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Common alternative headers used in dev/testing
  const altToken = (req.headers['x-access-token'] || req.headers['x-supabase-token']) as string | undefined;
  return altToken || null;
}

export function buildMockUserFromHeaders(req: Request) {
  const headerId = (req.headers['x-user-id'] as string) || 'mock-user-id';
  const headerEmail = (req.headers['x-user-email'] as string) || 'admin@cosmeticos.com';
  const headerRole = (req.headers['x-user-role'] as string) || 'ADMIN';
  return { id: headerId, email: headerEmail, role: headerRole };
}

export async function verifySupabaseToken(token: string): Promise<{ user: User | null; error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: new Error('Supabase not configured') };
  }
  try {
    const { data, error } = await client.auth.getUser(token);
    return { user: data?.user ?? null, error: error ?? null };
  } catch (err: any) {
    return { user: null, error: err instanceof Error ? err : new Error('Unknown auth error') };
  }
}

export function mapSupabaseUserToAuth(user: User): { id: string; email: string; role: string; fullName?: string } {
  return {
    id: user.id,
    email: user.email || '',
    role: (user.user_metadata as any)?.role || 'ADMIN',
    fullName: (user.user_metadata as any)?.full_name || user.email || undefined
  };
}
