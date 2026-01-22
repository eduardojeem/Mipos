'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

/**
 * Listens to `user_sessions` changes for the current session and performs a safe logout
 * when the session is invalidated due to permission/role changes.
 */
export function useSessionInvalidation() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();

        // If no session or Supabase not configured, do nothing
        if (!session || !(supabase as any).channel) return;

        const currentSessionId = (session as any)?.user?.id || session?.user?.id || null;
        const supabaseSessionId = (session as any)?.access_token ? session.access_token : null;

        // Subscribe to user_sessions updates for this user
        const channel = (supabase as any)
          .channel('user-sessions-invalidation')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_sessions',
              filter: `user_id=eq.${user?.id}`
            },
            async (payload: any) => {
              const newRow = payload?.new || {};
              if (newRow && newRow.is_active === false) {
                // Session invalidated: sign out and redirect to login
                try {
                  await supabase.auth.signOut();
                } catch {}
                router.replace('/auth/login');
              }
            }
          )
          .subscribe();

        unsub = () => channel.unsubscribe();
      } catch (err) {
        console.warn('Session invalidation listener error:', err);
      }
    };

    init();
    return () => {
      if (unsub) unsub();
    };
  }, [supabase, router]);
}