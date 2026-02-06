import { externalSyncService, EntityType } from '@/lib/sync/external-sync'

type LoyaltyEvent = 'adjust' | 'redeem'

function getDefaultEnabledSystemId(): string | null {
  const systems = externalSyncService.getSystems()
  const enabled = systems.filter(s => s.enabled)
  return enabled.length > 0 ? enabled[0].id : null
}

export async function triggerLoyaltySaasSync(event: LoyaltyEvent, payload: any) {
  const systemId = getDefaultEnabledSystemId()
  if (!systemId) return

  try {
    if (event === 'adjust') {
      const record = {
        id: payload?.id || `lp-${Date.now()}`,
        customerId: String(payload?.customerId),
        programId: payload?.programId ? String(payload.programId) : undefined,
        points: Number(payload?.points ?? payload?.delta ?? 0),
        reason: payload?.reason || 'Ajuste manual',
        referenceType: payload?.referenceType || 'MANUAL',
        createdAt: payload?.createdAt || new Date().toISOString(),
      }
      externalSyncService.enqueueOutboundRecords(systemId, 'loyalty_points' as EntityType, [record])
      await externalSyncService.syncEntity(systemId, 'loyalty_points' as EntityType, 'outbound', 'realtime')
    } else if (event === 'redeem') {
      const record = {
        id: payload?.id || `lr-${Date.now()}`,
        customerId: String(payload?.customerId),
        programId: String(payload?.programId),
        rewardId: String(payload?.rewardId),
        pointsSpent: typeof payload?.pointsSpent === 'number' ? payload.pointsSpent : undefined,
        createdAt: payload?.createdAt || new Date().toISOString(),
      }
      externalSyncService.enqueueOutboundRecords(systemId, 'loyalty_redemptions' as EntityType, [record])
      await externalSyncService.syncEntity(systemId, 'loyalty_redemptions' as EntityType, 'outbound', 'realtime')
    }
  } catch {}
}

