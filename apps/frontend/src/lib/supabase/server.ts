import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseConfig, getSupabaseAdminConfig } from '../env';
import type { Database } from '../../types/supabase';

// Verificación de configuración centralizada en '@/lib/env'

export async function createAdminClient() {
  const cfg = getSupabaseAdminConfig();
  if (!cfg) {
    console.warn('⚠️ Supabase Service Role Key no configurado, intentando usar cliente normal.');
    return createClient();
  }

  return createSupabaseClient<Database>(cfg.url, cfg.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

const createMockAuth = () => ({
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (_handler: any) => ({
    data: { subscription: { unsubscribe: () => { } } }
  }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase no configurado') }),
  signOut: async () => ({ error: null }),
  signUp: async () => ({ data: { user: null }, error: new Error('Supabase no configurado') }),
  getUser: async () => ({ data: { user: null }, error: null }),
  resetPasswordForEmail: async () => ({ error: new Error('Supabase no configurado') }),
  updateUser: async () => ({ data: { user: null }, error: new Error('Supabase no configurado') }),
});

const createMockFrom = () => ({
  select: () => createMockFrom(),
  eq: () => createMockFrom(),
  neq: () => createMockFrom(),
  gt: () => createMockFrom(),
  gte: () => createMockFrom(),
  lt: () => createMockFrom(),
  lte: () => createMockFrom(),
  like: () => createMockFrom(),
  ilike: () => createMockFrom(),
  is: () => createMockFrom(),
  in: () => createMockFrom(),
  contains: () => createMockFrom(),
  containedBy: () => createMockFrom(),
  range: () => createMockFrom(),
  rangeGt: () => createMockFrom(),
  rangeGte: () => createMockFrom(),
  rangeLt: () => createMockFrom(),
  rangeLte: () => createMockFrom(),
  rangeAdjacent: () => createMockFrom(),
  overlaps: () => createMockFrom(),
  textSearch: () => createMockFrom(),
  match: () => createMockFrom(),
  not: () => createMockFrom(),
  or: () => createMockFrom(),
  filter: () => createMockFrom(),
  order: () => createMockFrom(),
  limit: () => createMockFrom(),
  single: async () => ({ data: null, error: null }),
  upsert: () => createMockFrom(),
  insert: () => createMockFrom(),
  update: () => createMockFrom(),
  delete: () => createMockFrom(),
  maybeSingle: async () => ({ data: null, error: null }),
  then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
});

export async function createClient() {
  const cookieStore = await cookies();

  const cfg = getSupabaseConfig();

  // Fallback seguro cuando no hay configuración de Supabase
  if (!cfg) {
    console.warn('⚠️ Supabase no configurado en frontend (server), usando modo mock para auth.');
    return {
      auth: createMockAuth(),
      from: () => createMockFrom(),
    } as any;
  }

  const client = createSSRServerClient<Database>(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });

  const originalFrom = client.from.bind(client);
  client.from = ((table: string) => {
    const target: any = originalFrom(table);
    const methods = [
      'or','lt','lte','gt','gte','neq','is','filter','like','ilike',
      'contains','containedBy','range','rangeGt','rangeGte','rangeLt',
      'rangeLte','rangeAdjacent','overlaps','textSearch','match','not',
      'eq','in','order','limit','single','maybeSingle','upsert','insert',
      'update','delete'
    ];
    const patch = (obj: any) => {
      methods.forEach((name) => {
        const fn = obj[name];
        if (typeof fn === 'function') {
          obj[name] = (...args: any[]) => {
            const res = fn.apply(obj, args);
            return typeof res === 'object' ? patch(res) : res;
          };
        } else {
          obj[name] = () => obj;
        }
      });
      return obj;
    };
    return patch(target);
  }) as any;

  if (typeof client.from !== 'function') {
    console.error('CRITICAL ERROR: Supabase client created but "from" is not a function! Falling back to mock.', {
      keys: Object.keys(client),
      cfgUrl: cfg.url ? 'present' : 'missing',
      cfgKey: cfg.anonKey ? 'present' : 'missing'
    });
    return {
      auth: createMockAuth(),
      from: () => createMockFrom(),
    } as any;
  }

  return client;
}
