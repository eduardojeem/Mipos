import { SyncedStore } from './synced-store'
import api from '@/lib/api'
import { triggerLoyaltySaasSync } from '@/lib/sync/loyalty-saas'
import { startRealtimeSync, stopRealtimeSync } from './realtime'
import { attachOnlineResync } from './resync'
import { SyncEvent, SyncState } from './types'

export type LoyaltyState = {
  customerId: string
  currentPoints: number
  totalRedeemed: number
  lastActivity: string
}

export type LoyaltyActions = {
  adjustPoints: (delta: number, reason?: string, programId?: string) => void
  redeemPoints: (programId: string, rewardId: string) => void
}

export function createLoyaltyStore(customerId: string, branchId?: string, posId?: string) {
  const config = {
    channel: 'loyalty',
    entityId: `customer:${customerId}`,
    branchId: branchId ?? null,
    posId: posId ?? null,
    debounceMs: 300
  }

  const merge = (local: LoyaltyState, remote: LoyaltyState, type: string): LoyaltyState => {
    if (type === 'points.delta') {
      return {
        ...local,
        currentPoints: remote.currentPoints,
        totalRedeemed: remote.totalRedeemed,
        lastActivity: remote.lastActivity
      }
    }
    return remote
  }

  const store = new SyncedStore<LoyaltyState>(
    `loyalty:${customerId}`,
    {
      customerId,
      currentPoints: 0,
      totalRedeemed: 0,
      lastActivity: new Date().toISOString()
    },
    config,
    merge
  )

  let realtimeSubscription: any = null
  let detachResync: (() => void) | null = null

  const start = () => {
    realtimeSubscription = startRealtimeSync(
      config.channel,
      config.entityId,
      (evt: SyncEvent) => {
        const patch = evt.payload as Partial<LoyaltyState>
        store.setState(patch, evt.type)
      }
    )
    detachResync = attachOnlineResync(
      config.channel,
      config.entityId,
      (evt: SyncEvent) => {
        const patch = evt.payload as Partial<LoyaltyState>
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

  const actions: LoyaltyActions = {
    adjustPoints: async (delta: number, reason?: string, programId?: string) => {
      const prev = store.getData()
      const nextPoints = Math.max(0, prev.currentPoints + delta)
      store.setState({ currentPoints: nextPoints, lastActivity: new Date().toISOString() }, 'points.delta')
      
      try {
        const resp = await api.get(`/loyalty/customers/${prev.customerId}`, { params: { programId } })
        const raw: any = resp.data
        const cl = raw?.data ?? raw
        const clId = cl?.id || cl?.customerLoyaltyId || cl?.customer_loyalty_id
        
        if (!clId) {
          throw new Error('customerLoyaltyId no disponible')
        }
        
        await api.post('/loyalty/points-adjustment', {
          customerLoyaltyId: String(clId),
          points: Number(delta),
          description: reason || 'Ajuste manual',
          referenceType: 'MANUAL'
        })
        triggerLoyaltySaasSync('adjust', {
          customerId: prev.customerId,
          programId,
          points: Number(delta),
          reason: reason || 'Ajuste manual',
          referenceType: 'MANUAL',
          createdAt: new Date().toISOString(),
        })
        
        console.log('[Loyalty Sync] Points adjusted successfully:', { delta, reason, programId })
      } catch (error: any) {
        // Rollback optimistic update
        store.setState({ ...prev, lastActivity: new Date().toISOString() }, 'points.rollback')
        
        // Log error
        console.error('[Loyalty Sync] Failed to adjust points:', {
          error: error.message,
          delta,
          reason,
          programId,
          customerId: prev.customerId
        })
        
        // Re-throw para que el caller pueda manejar
        throw new Error(`Error al ajustar puntos: ${error.message || 'Error desconocido'}`)
      }
    },
    
    redeemPoints: async (programId: string, rewardId: string) => {
      const prev = store.getData()
      
      try {
        await api.post(`/loyalty/customers/${prev.customerId}/rewards/redeem`, { 
          programId, 
          rewardId 
        })
        
        store.setState({ lastActivity: new Date().toISOString() }, 'points.redeem')
        triggerLoyaltySaasSync('redeem', {
          customerId: prev.customerId,
          programId,
          rewardId,
          createdAt: new Date().toISOString(),
        })
        
        console.log('[Loyalty Sync] Points redeemed successfully:', { programId, rewardId })
      } catch (error: any) {
        // Rollback
        store.setState({ ...prev, lastActivity: new Date().toISOString() }, 'redeem.rollback')
        
        // Log error
        console.error('[Loyalty Sync] Failed to redeem points:', {
          error: error.message,
          programId,
          rewardId,
          customerId: prev.customerId
        })
        
        // Re-throw
        throw new Error(`Error al canjear puntos: ${error.message || 'Error desconocido'}`)
      }
    }
  }

  return { store, actions, start, stop }
}
