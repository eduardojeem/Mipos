import { externalSyncService, EntityType } from '@/lib/sync/external-sync'

type CashSaasEvent = 'open' | 'close' | 'movement'

function getDefaultEnabledSystemId(): string | null {
  const systems = externalSyncService.getSystems()
  const enabled = systems.filter(s => s.enabled)
  return enabled.length > 0 ? enabled[0].id : null
}

export async function triggerCashSaasSync(event: CashSaasEvent, payload?: any) {
  const systemId = getDefaultEnabledSystemId()
  if (!systemId) return

  try {
    switch (event) {
      case 'movement': {
        const record = {
          id: payload?.id || `mv-${Date.now()}`,
          type: payload?.type,
          amount: payload?.amount,
          reason: payload?.reason,
          sessionId: payload?.sessionId,
          createdAt: payload?.createdAt || new Date().toISOString(),
        }
        externalSyncService.enqueueOutboundRecords(systemId, 'inventory_movements' as EntityType, [record])
        await externalSyncService.syncEntity(systemId, 'inventory_movements' as EntityType, 'outbound', 'realtime')
        break
      }
      case 'open':
      case 'close': {
        const record = {
          id: payload?.id || `sale-${Date.now()}`,
          event: event,
          sessionId: payload?.sessionId,
          amount: payload?.amount,
          notes: payload?.notes,
          createdAt: payload?.createdAt || new Date().toISOString(),
        }
        externalSyncService.enqueueOutboundRecords(systemId, 'sales' as EntityType, [record])
        await externalSyncService.syncEntity(systemId, 'sales' as EntityType, 'outbound', 'realtime')
        break
      }
    }
  } catch (e) {
    // Silenciar errores de sync para no afectar la UX de caja
    // Se puede instrumentar logging más adelante
  }
}
