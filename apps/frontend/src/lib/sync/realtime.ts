import { SyncEvent } from './types';
import { supabase, ORIGIN } from './utils';

export type ApplyFn = (evt: SyncEvent) => void;

export function startRealtimeSync(
  channel: string,
  entityId: string,
  apply: ApplyFn,
  onError?: (error: Error) => void
) {
  const subscription = supabase
    .channel(`realtime:sync_events:${channel}:${entityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sync_events',
        filter: `channel=eq.${channel}`
      },
      (payload: any) => {
        const row = payload.new as SyncEvent;
        if (!row || row.entity_id !== entityId) return;
        if (row.origin === ORIGIN) return;
        
        const versionKey = `sync:${channel}:${entityId}:lastVersion`;
        const lastVersion = parseInt(localStorage.getItem(versionKey) || '0', 10);
        const eventVersion = row.version || 0;
        
        if (eventVersion <= lastVersion) return;
        
        try {
          apply(row);
          localStorage.setItem(versionKey, String(eventVersion));
        } catch (error) {
          console.error('Error applying sync event:', error);
          onError?.(error as Error);
        }
      }
    )
    .subscribe((status: any) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Realtime sync subscribed: ${channel}:${entityId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Realtime sync error: ${channel}:${entityId}`);
        onError?.(new Error('Failed to subscribe to realtime sync'));
      }
    });

  return subscription;
}

export function stopRealtimeSync(subscription: any) {
  supabase.removeChannel(subscription);
}