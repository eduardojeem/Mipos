import { createClient } from '@/lib/supabase'
import { redeemRewardSafe, adjustPointsSafe, closeCashSessionSafe } from '@/lib/loyalty-safe'

const supabase = createClient()

async function setupTestData() {
  const { data: c } = await supabase.from('customer_loyalty').insert({ customer_id: 'test-customer', program_id: 'test-program', current_points: 1000, total_points_earned: 1000, total_points_redeemed: 0 }).select('id').single()
  const { data: r } = await supabase.from('loyalty_rewards').insert({ name: 'Test Reward', points_cost: 100, stock: 10, is_active: true }).select('id').single()
  const { data: s } = await supabase.from('cash_sessions').insert({ id: 'test-session', user_id: 'test-user', expected_cash: 1000, status: 'OPEN' }).select('id').single()
  return { customerId: c!.id, rewardId: r!.id, sessionId: s!.id }
}

async function cleanupTestData(customerId: string, rewardId: string, sessionId: string) {
  await supabase.from('customer_rewards').delete().eq('customer_id', customerId)
  await supabase.from('customer_loyalty').delete().eq('id', customerId)
  await supabase.from('loyalty_rewards').delete().eq('id', rewardId)
  await supabase.from('cash_sessions').delete().eq('id', sessionId)
  await supabase.from('points_transactions').delete().eq('customer_loyalty_id', customerId)
}

async function testConcurrentRedeem(rewardId: string, customerId: string) {
  const promises = Array.from({ length: 2 }, (_, i) => redeemRewardSafe(rewardId, customerId, `sale-${i}`, `idem-${i}`))
  const results = await Promise.allSettled(promises)
  const ok = results.filter(r => r.status === 'fulfilled').length
  const fail = results.filter(r => r.status === 'rejected').length
  console.log(`Concurrent redeem: ok=${ok}, fail=${fail}`)
  return { ok, fail }
}

async function testConcurrentAdjust(customerId: string) {
  const promises = Array.from({ length: 3 }, (_, i) => adjustPointsSafe(customerId, 50, 'Test', `idem-adjust-${i}`))
  const results = await Promise.allSettled(promises)
  const ok = results.filter(r => r.status === 'fulfilled').length
  const fail = results.filter(r => r.status === 'rejected').length
  console.log(`Concurrent adjust: ok=${ok}, fail=${fail}`)
  return { ok, fail }
}

async function testConcurrentClose(sessionId: string) {
  const promises = Array.from({ length: 2 }, (_, i) => closeCashSessionSafe(sessionId, 1000 + i, `idem-close-${i}`))
  const results = await Promise.allSettled(promises)
  const ok = results.filter(r => r.status === 'fulfilled').length
  const fail = results.filter(r => r.status === 'rejected').length
  console.log(`Concurrent close: ok=${ok}, fail=${fail}`)
  return { ok, fail }
}

export async function runAllLoyaltyTests() {
  console.log('🧪 Running loyalty safe tests...')
  const { customerId, rewardId, sessionId } = await setupTestData()
  try {
    await testConcurrentRedeem(rewardId, customerId)
    await testConcurrentAdjust(customerId)
    await testConcurrentClose(sessionId)
    console.log('✅ All tests completed')
  } finally {
    await cleanupTestData(customerId, rewardId, sessionId)
  }
}

if (require.main === module) {
  runAllLoyaltyTests().catch(console.error)
}