import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              gt: () => ({
                order: async () => ({ data: [], error: null })
              })
            })
          })
        })
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) })
      }),
      removeChannel: () => {}
    } as any;

function uuid(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEVICE_ID = (() => {
  const key = 'sync_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = uuid();
  localStorage.setItem(key, id);
  return id;
})();

export const TAB_ID = (() => {
  const key = 'sync_tab_id';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = uuid();
  sessionStorage.setItem(key, id);
  return id;
})();

export const ORIGIN = `${DEVICE_ID}:${TAB_ID}`;