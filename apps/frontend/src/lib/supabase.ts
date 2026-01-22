import { createBrowserClient, createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from './env';
import type {
  Product,
  Category,
  Customer,
  Supplier,
  User,
  Role,
  Permission,
  Database
} from '@/types/supabase';

// Client-side Supabase client
// Detecta variables de entorno faltantes o placeholders de ejemplo
// Config checks centralizados en '@/lib/env'


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

const createMockChannel = () => ({
  on: () => createMockChannel(),
  subscribe: (_cb?: any) => ({ unsubscribe: () => {} }),
});

export const createClient = () => {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    if (typeof window !== 'undefined') {
      console.warn('⚠️ Supabase no configurado en frontend, usando modo mock para auth.');
    }
    return {
      auth: createMockAuth(),
      from: () => createMockFrom(),
      channel: () => createMockChannel(),
      removeChannel: (_ch: any) => {},
      getChannels: () => [],
      removeAllChannels: async () => {},
    } as any;
  }
  return createBrowserClient<Database>(cfg.url, cfg.anonKey);
};

// Server-side Supabase client (for Server Components)
export const createServerClient = async (cookieStore: any) => {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    console.warn('⚠️ Supabase no configurado en frontend (server), usando modo mock para auth.');
    return {
      auth: createMockAuth(),
      from: () => createMockFrom(),
      channel: () => createMockChannel(),
      removeChannel: (_ch: any) => {},
      getChannels: () => [],
      removeAllChannels: async () => {},
    } as any;
  }
  return createSupabaseServerClient<Database>(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: any[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignorar en Server Components
        }
      },
    },
  });
};

// Supabase configuration
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

// Cliente con service role para operaciones administrativas (solo server-side)
export const createAdminClient = () => {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    console.warn('⚠️ Supabase no configurado para cliente admin');
    return null;
  }

  // Solo usar service role key en server-side o para operaciones específicas
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('⚠️ Service role key no disponible');
    return null;
  }

  return createBrowserClient<Database>(cfg.url, serviceRoleKey);
};

// Evitar throw en desarrollo si faltan variables; usar modo mock
if (!getSupabaseConfig()) {
  console.warn('⚠️ Faltan variables de entorno de Supabase; habilitando modo mock en frontend.');
}

// Re-exportar tipos para compatibilidad
export type {
  Product,
  Category,
  Customer,
  Supplier,
  User,
  Role,
  Permission
} from '@/types/supabase';

// Tipos de base de datos actualizados para Supabase
export type { Database } from '@/types/supabase';
