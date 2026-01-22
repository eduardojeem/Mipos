import { SyncedStore } from './synced-store'
import { startRealtimeSync, stopRealtimeSync } from './realtime'
import { attachOnlineResync } from './resync'
import { SyncEvent } from './types'

export type CashSessionState = {
  sessionId: string
  status: 'OPEN' | 'CLOSING' | 'CLOSED'
  closing_amount: number | null
  transactions_count: number
  updated_at: string
}

export function createCashSessionStore(sessionId: string, branchId?: string, posId?: string) {
  const config = {
    channel: 'cash_session',
    entityId: `session:${sessionId}`,
    branchId: branchId ?? null,
    posId: posId ?? null,
    debounceMs: 200
  }

  const store = new SyncedStore<CashSessionState>(
    `cash_session:${sessionId}`,
    {
      sessionId,
      status: 'OPEN',
      closing_amount: null,
      transactions_count: 0,
      updated_at: new Date().toISOString()
    },
    config
  )

  let realtimeSubscription: any = null
  let detachResync: (() => void) | null = null

  const start = () => {
    realtimeSubscription = startRealtimeSync(
      config.channel,
      config.entityId,
      (evt: SyncEvent) => {
        const patch = evt.payload as Partial<CashSessionState>
        store.setState(patch, evt.type)
      }
    )
    detachResync = attachOnlineResync(
      config.channel,
      config.entityId,
      (evt: SyncEvent) => {
        const patch = evt.payload as Partial<CashSessionState>
        store.setState(patch, evt.type)
      }
    )
  }

  const stop = () => {
    if (realtimeSubscription) {
      stopRealtimeSync(realtimeSubscription)
      realtimeSubscription = null
    }
    if (detachResync) {
      detachResync()
      detachResync = null
    }
  }

  const closeSession = (amount: number) => {
    store.setState({
      status: 'CLOSING',
      closing_amount: amount,
      updated_at: new Date().toISOString()
    }, 'session.close')
    // Mark as closed after a small delay to simulate server confirmation
    setTimeout(() => {
      store.setState({ status: 'CLOSED', updated_at: new Date().toISOString() }, 'session.closed')
    }, 300)
  }

  return { store, start, stop, closeSession }
}