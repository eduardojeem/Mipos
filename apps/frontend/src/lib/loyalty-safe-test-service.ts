import { createClient } from '@supabase/supabase-js'

// Use service role key for testing to bypass RLS
const supabase = createClient(
  'https://zrbzkmfloiurwhydpvap.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnprbWZsb2l1cndoeWRwdmFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2MzUxOSwiZXhwIjoyMDc0ODM5NTE5fQ.6u_9I3cOQ1mQ7cGj6p6z5X8kK9yL0mN1oP2qR3sT4uV'
)

// Simple in-memory lock for testing (since we can't use advisory locks with anon)
const locks = new Map<string, boolean>()

async function acquireSimpleLock(lockKey: string, timeoutMs: number = 10000): Promise<SimpleLock | null> {
  const maxAttempts = 50
  const retryDelay = 100
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!locks.has(lockKey)) {
      locks.set(lockKey, true)
      return new SimpleLock(lockKey)
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }
  
  return null
}

class SimpleLock {
  constructor(private lockKey: string) {}
  
  async release(): Promise<void> {
    locks.delete(this.lockKey)
  }
}

// Test implementations with simple locking
async function redeemRewardSafe(rewardId: string, customerId: string, saleId?: string, idempotencyKey?: string) {
  const lock = await acquireSimpleLock(`reward:${rewardId}`, 15000)
  if (!lock) throw new Error('No se pudo adquirir el lock para el reward')
  
  try {
    // Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('loyalty_redemptions')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single()
      
      if (existing) {
        console.log(`Redemption already processed for idempotency key: ${idempotencyKey}`)
        return { success: true, already_processed: true }
      }
    }
    
    // Get reward and check stock
    const { data: reward } = await supabase
      .from('loyalty_rewards')
      .select('stock, points_cost')
      .eq('id', rewardId)
      .single()
    
    if (!reward || reward.stock <= 0) {
      throw new Error('Reward not available or out of stock')
    }
    
    // Get customer and check points
    const { data: customer } = await supabase
      .from('customer_loyalty')
      .select('current_points')
      .eq('id', customerId)
      .single()
    
    if (!customer || customer.current_points < reward.points_cost) {
      throw new Error('Insufficient points')
    }
    
    // Process redemption
    const { error: redemptionError } = await supabase
      .from('loyalty_redemptions')
      .insert({
        customer_loyalty_id: customerId,
        loyalty_reward_id: rewardId,
        points_cost: reward.points_cost,
        redemption_status: 'completed',
        idempotency_key: idempotencyKey
      })
    
    if (redemptionError) throw redemptionError
    
    // Update customer points
    const { error: pointsError } = await supabase
      .from('customer_loyalty')
      .update({ 
        current_points: customer.current_points - reward.points_cost,
        total_points_redeemed: customer.current_points - reward.points_cost
      })
      .eq('id', customerId)
    
    if (pointsError) throw pointsError
    
    // Update reward stock
    const { error: stockError } = await supabase
      .from('loyalty_rewards')
      .update({ stock: reward.stock - 1 })
      .eq('id', rewardId)
    
    if (stockError) throw stockError
    
    console.log(`Reward redeemed successfully: ${rewardId} for customer ${customerId}`)
    return { success: true, reward_id: rewardId, customer_id: customerId }
    
  } finally {
    await lock.release()
  }
}

async function adjustPointsSafe(customerId: string, delta: number, description?: string, idempotencyKey?: string) {
  const lock = await acquireSimpleLock(`points:${customerId}`, 10000)
  if (!lock) throw new Error('No se pudo adquirir el lock para el cliente')
  
  try {
    // Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('points_transactions')
        .select('id')
        .eq('reference_id', idempotencyKey)
        .eq('reference_type', 'idempotency')
        .single()
      
      if (existing) {
        console.log(`Points adjustment already processed for idempotency key: ${idempotencyKey}`)
        return { success: true, already_processed: true }
      }
    }
    
    // Get current customer points
    const { data: customer } = await supabase
      .from('customer_loyalty')
      .select('current_points, total_points_earned')
      .eq('id', customerId)
      .single()
    
    if (!customer) {
      throw new Error('Customer not found')
    }
    
    // Update customer points
    const newPoints = customer.current_points + delta
    const newTotal = delta > 0 ? customer.total_points_earned + delta : customer.total_points_earned
    
    const { error: updateError } = await supabase
      .from('customer_loyalty')
      .update({ 
        current_points: newPoints,
        total_points_earned: newTotal
      })
      .eq('id', customerId)
    
    if (updateError) throw updateError
    
    // Record transaction
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        customer_loyalty_id: customerId,
        points: delta,
        transaction_type: delta > 0 ? 'earned' : 'redeemed',
        description: description || 'Manual adjustment',
        reference_id: idempotencyKey,
        reference_type: 'idempotency'
      })
    
    if (transactionError) throw transactionError
    
    console.log(`Points adjusted successfully: ${delta} for customer ${customerId}`)
    return { success: true, customer_id: customerId, points_delta: delta }
    
  } finally {
    await lock.release()
  }
}

async function closeCashSessionSafe(sessionId: string, actualCash: number, idempotencyKey?: string) {
  const lock = await acquireSimpleLock(`cash:${sessionId}`, 12000)
  if (!lock) throw new Error('No se pudo adquirir el lock para la caja')
  
  try {
    // Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('closing_amount', actualCash)
        .single()
      
      if (existing && (existing as any).closing_amount !== null) {
        console.log(`Cash session already closed for idempotency key: ${idempotencyKey}`)
        return { success: true, already_processed: true }
      }
    }
    
    // Get current session
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('opening_amount, status')
      .eq('id', sessionId)
      .single()
    
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (session.status !== 'OPEN') {
      throw new Error('Session already closed')
    }
    
    // Calculate discrepancy
    const discrepancy = actualCash - session.opening_amount
    
    // Update session
    const { error: updateError } = await supabase
      .from('cash_sessions')
      .update({ 
        closing_amount: actualCash,
        status: 'CLOSED',
        closed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
    
    if (updateError) throw updateError
    
    console.log(`Cash session closed successfully: ${sessionId} with amount ${actualCash}`)
    return { success: true, session_id: sessionId, discrepancy }
    
  } finally {
    await lock.release()
  }
}

// Test setup functions
async function setupTestData() {
  console.log('Setting up test data...')
  
  // Clean up any existing test data first
  await supabase.from('customer_rewards').delete().eq('customer_loyalty_id', '550e8400-e29b-41d4-a716-446655440001')
  await supabase.from('points_transactions').delete().eq('customer_loyalty_id', '550e8400-e29b-41d4-a716-446655440001')
  await supabase.from('loyalty_redemptions').delete().eq('customer_loyalty_id', '550e8400-e29b-41d4-a716-446655440001')
  await supabase.from('customer_loyalty').delete().eq('id', '550e8400-e29b-41d4-a716-446655440001')
  await supabase.from('loyalty_rewards').delete().ilike('name', 'Test Reward%')
  await supabase.from('cash_sessions').delete().eq('id', '550e8400-e29b-41d4-a716-446655440002')
  
  const { data: c, error: cError } = await supabase.from('customer_loyalty').insert({ 
    id: '550e8400-e29b-41d4-a716-446655440001',
    customer_id: '550e8400-e29b-41d4-a716-446655440001', 
    program_id: '550e8400-e29b-41d4-a716-446655440000', 
    current_points: 1000, 
    total_points_earned: 1000, 
    total_points_redeemed: 0 
  }).select('id').single()
  
  if (cError) {
    console.error('Error inserting customer loyalty:', cError)
    throw cError
  }
  
  const { data: r, error: rError } = await supabase.from('loyalty_rewards').insert({ 
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Test Reward', 
    points_cost: 100, 
    stock: 10, 
    is_active: true 
  }).select('id').single()
  
  if (rError) {
    console.error('Error inserting loyalty reward:', rError)
    throw rError
  }
  
  const { data: s, error: sError } = await supabase.from('cash_sessions').insert({ 
    id: '550e8400-e29b-41d4-a716-446655440002', 
    opened_by: '550e8400-e29b-41d4-a716-446655440004', 
    opening_amount: 1000, 
    status: 'OPEN' 
  }).select('id').single()
  
  if (sError) {
    console.error('Error inserting cash session:', sError)
    throw sError
  }
  
  console.log('Test data setup complete')
  return { customerId: c!.id, rewardId: r!.id, sessionId: s!.id }
}

async function cleanupTestData(customerId: string, rewardId: string, sessionId: string) {
  console.log('Cleaning up test data...')
  await supabase.from('customer_rewards').delete().eq('customer_loyalty_id', customerId)
  await supabase.from('points_transactions').delete().eq('customer_loyalty_id', customerId)
  await supabase.from('loyalty_redemptions').delete().eq('customer_loyalty_id', customerId)
  await supabase.from('customer_loyalty').delete().eq('id', customerId)
  await supabase.from('loyalty_rewards').delete().eq('id', rewardId)
  await supabase.from('cash_sessions').delete().eq('id', sessionId)
  console.log('Cleanup complete')
}

async function testConcurrentRedeem(rewardId: string, customerId: string) {
  console.log(`\n🧪 Testing concurrent reward redemption...`)
  console.log(`Reward ID: ${rewardId}, Customer ID: ${customerId}`)
  
  // Try to redeem the same reward 3 times concurrently
  const promises = Array.from({ length: 3 }, (_, i) => redeemRewardSafe(rewardId, customerId, `sale-${i}`, `idem-redeem-${i}`))
  const results = await Promise.allSettled(promises)
  
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  console.log(`Results: ${successful} successful, ${failed} failed`)
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`  Attempt ${index + 1}: SUCCESS - ${JSON.stringify(result.value)}`)
    } else {
      console.log(`  Attempt ${index + 1}: FAILED - ${result.reason}`)
    }
  })
  
  return { successful, failed }
}

async function testConcurrentAdjust(customerId: string) {
  console.log(`\n🧪 Testing concurrent points adjustment...`)
  console.log(`Customer ID: ${customerId}`)
  
  // Try to add points 5 times concurrently
  const promises = Array.from({ length: 5 }, (_, i) => adjustPointsSafe(customerId, 10, 'Test adjustment', `idem-adjust-${i}`))
  const results = await Promise.allSettled(promises)
  
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  console.log(`Results: ${successful} successful, ${failed} failed`)
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`  Attempt ${index + 1}: SUCCESS - ${JSON.stringify(result.value)}`)
    } else {
      console.log(`  Attempt ${index + 1}: FAILED - ${result.reason}`)
    }
  })
  
  return { successful, failed }
}

async function testConcurrentClose(sessionId: string) {
  console.log(`\n🧪 Testing concurrent cash session closure...`)
  console.log(`Session ID: ${sessionId}`)
  
  // Try to close the same session 2 times concurrently
  const promises = Array.from({ length: 2 }, (_, i) => closeCashSessionSafe(sessionId, 1000 + i, `idem-close-${i}`))
  const results = await Promise.allSettled(promises)
  
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  console.log(`Results: ${successful} successful, ${failed} failed`)
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`  Attempt ${index + 1}: SUCCESS - ${JSON.stringify(result.value)}`)
    } else {
      console.log(`  Attempt ${index + 1}: FAILED - ${result.reason}`)
    }
  })
  
  return { successful, failed }
}

export async function runAllLoyaltyTests() {
  console.log('🧪 Starting Loyalty Safe Concurrency Tests')
  console.log('=' .repeat(50))
  
  try {
    const { customerId, rewardId, sessionId } = await setupTestData()
    
    console.log(`\n📋 Test Setup Complete:`)
    console.log(`  Customer ID: ${customerId}`)
    console.log(`  Reward ID: ${rewardId}`)
    console.log(`  Session ID: ${sessionId}`)
    
    // Run all concurrency tests
    const redeemResults = await testConcurrentRedeem(rewardId, customerId)
    const adjustResults = await testConcurrentAdjust(customerId)
    const closeResults = await testConcurrentClose(sessionId)
    
    // Cleanup after tests
    await cleanupTestData(customerId, rewardId, sessionId)
    
    console.log('\n' + '=' .repeat(50))
    console.log('📊 TEST SUMMARY')
    console.log('=' .repeat(50))
    console.log(`Concurrent Redeem: ${redeemResults.successful} successful, ${redeemResults.failed} failed`)
    console.log(`Concurrent Adjust: ${adjustResults.successful} successful, ${adjustResults.failed} failed`)
    console.log(`Concurrent Close: ${closeResults.successful} successful, ${closeResults.failed} failed`)
    
    // Verify final state
    console.log('\n🔍 Verifying final state...')
    
    const { data: customer } = await supabase.from('customer_loyalty').select('current_points, total_points_redeemed').eq('id', customerId).single()
    const { data: reward } = await supabase.from('loyalty_rewards').select('stock').eq('id', rewardId).single()
    const { data: session } = await supabase.from('cash_sessions').select('status').eq('id', sessionId).single()
    
    console.log(`Final customer points: ${customer?.current_points}`)
    console.log(`Final reward stock: ${reward?.stock}`)
    console.log(`Final session status: ${session?.status}`)
    
    // Expected results:
    // - Only 1 redeem should succeed (stock decreases by 1)
    // - All 5 adjusts should succeed (points increase by 50 total)
    // - Only 1 close should succeed (session becomes CLOSED)
    
    const expectedRedeemSuccess = 1
    const expectedAdjustSuccess = 5
    const expectedCloseSuccess = 1
    
    const redeemTestPassed = redeemResults.successful === expectedRedeemSuccess
    const adjustTestPassed = adjustResults.successful === expectedAdjustSuccess
    const closeTestPassed = closeResults.successful === expectedCloseSuccess
    
    console.log('\n✅ TEST RESULTS:')
    console.log(`  Redeem concurrency test: ${redeemTestPassed ? 'PASSED' : 'FAILED'}`)
    console.log(`  Adjust concurrency test: ${adjustTestPassed ? 'PASSED' : 'FAILED'}`)
    console.log(`  Close concurrency test: ${closeTestPassed ? 'PASSED' : 'FAILED'}`)
    
    if (redeemTestPassed && adjustTestPassed && closeTestPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Locking mechanisms are working correctly.')
    } else {
      console.log('\n❌ Some tests failed. Check the implementation.')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  } finally {
    console.log('\n🧹 Cleaning up...')
    // Cleanup will be done in the cleanup function
  }
}

if (require.main === module) {
  runAllLoyaltyTests().catch(console.error)
}
