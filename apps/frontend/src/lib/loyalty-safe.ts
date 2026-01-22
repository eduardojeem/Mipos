import { createClient } from '@/lib/supabase'
import { MemoryLock } from '@/lib/simple-lock'

const supabase = createClient()

export async function redeemRewardSafe(rewardId: string, customerId: string, saleId?: string, idempotencyKey?: string) {
  const lockAcquired = await MemoryLock.acquire(`reward:${rewardId}`, 15000)
  if (!lockAcquired) throw new Error('No se pudo adquirir el lock para el reward')
  try {
    const { data, error } = await supabase.rpc('redeem_reward_safe', {
      p_reward_id: rewardId,
      p_customer_id: customerId,
      p_sale_id: saleId || null,
      p_idempotency_key: idempotencyKey || null
    })
    if (error) throw error
    return data
  } finally {
    MemoryLock.release(`reward:${rewardId}`)
  }
}

export async function adjustPointsSafe(customerId: string, delta: number, description?: string, idempotencyKey?: string) {
  const lockAcquired = await MemoryLock.acquire(`points:${customerId}`, 10000)
  if (!lockAcquired) throw new Error('No se pudo adquirir el lock para el cliente')
  try {
    const { data, error } = await supabase.rpc('adjust_points_safe', {
      p_customer_id: customerId,
      p_delta: delta,
      p_descr: description || 'Manual adjustment',
      p_idempotency_key: idempotencyKey || null
    })
    if (error) throw error
    return data
  } finally {
    MemoryLock.release(`points:${customerId}`)
  }
}

export async function closeCashSessionSafe(sessionId: string, actualCash: number, idempotencyKey?: string) {
  const lockAcquired = await MemoryLock.acquire(`cash:${sessionId}`, 12000)
  if (!lockAcquired) throw new Error('No se pudo adquirir el lock para la caja')
  try {
    const { data, error } = await supabase.rpc('close_cash_session_safe', {
      p_session_id: sessionId,
      p_actual_cash: actualCash,
      p_idempotency_key: idempotencyKey || null
    })
    if (error) throw error
    return data
  } finally {
    MemoryLock.release(`cash:${sessionId}`)
  }
}