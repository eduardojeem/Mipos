import { SyncEvent } from './types';
import { supabase } from './utils';

export async function resync(
  channel: string,
  entityId: string,
  sinceVersion?: number
): Promise<SyncEvent[]> {
  const versionKey = `sync:${channel}:${entityId}:lastVersion`;
  const lastVersion = sinceVersion ?? parseInt(localStorage.getItem(versionKey) || '0', 10);
  
  try {
    const { data, error } = await supabase
      .from('sync_events')
      .select('*')
      .eq('channel', channel)
      .eq('entity_id', entityId)
      .gt('version', lastVersion)
      .order('version', { ascending: true });

    if (error) {
      console.error('Resync error:', error);
      return [];
    }

    return (data || []) as SyncEvent[];
  } catch (error) {
    console.error('Resync network error:', error);
    return [];
  }
}

export function attachOnlineResync(
  channel: string,
  entityId: string,
  apply: (evt: SyncEvent) => void,
  onError?: (error: Error) => void
): () => void {
  let isResyncing = false;
  
  const handler = async () => {
    if (isResyncing) return;
    isResyncing = true;
    
    try {
      console.log(`🔄 Starting resync for ${channel}:${entityId}`);
      const events = await resync(channel, entityId);
      
      if (events.length === 0) {
        console.log(`✅ No pending events for ${channel}:${entityId}`);
        return;
      }

      console.log(`📥 Applying ${events.length} pending events`);
      for (const event of events) {
        try {
          apply(event);
          const versionKey = `sync:${channel}:${entityId}:lastVersion`;
          localStorage.setItem(versionKey, String(event.version || 0));
        } catch (error) {
          console.error('Error applying resync event:', error);
          onError?.(error as Error);
        }
      }
      
      console.log(`✅ Resync completed for ${channel}:${entityId}`);
    } catch (error) {
      console.error('Resync handler error:', error);
      onError?.(error as Error);
    } finally {
      isResyncing = false;
    }
  };

  window.addEventListener('online', handler);
  
  if (navigator.onLine) {
    handler().catch(console.error);
  }
  
  return () => window.removeEventListener('online', handler);
}

export function detachOnlineResync(handler: () => void) {
  handler();
}