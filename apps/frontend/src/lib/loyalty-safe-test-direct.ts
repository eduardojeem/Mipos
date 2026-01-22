import { createClient } from '@supabase/supabase-js'
import { redeemRewardSafe, adjustPointsSafe, closeCashSessionSafe } from '@/lib/loyalty-safe'

// Direct Supabase configuration for testing
const supabase = createClient(
  'https://zrbzkmfloiurwhydpvap.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnprbWZsb2l1cndoeWRwdmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjM1MTksImV4cCI6MjA3NDgzOTUxOX0.Ouc409D7kZYtOEjALVjmjHCX6R8YjdL1a-WcFhDJk0U'
)

async function setupTestData() {
  console.log('Setting up test data...')
  
  // Clean up any existing test data first
  await supabase.from('customer_rewards').delete().ilike('customer_loyalty_id', 'test-customer%')
  await supabase.from('points_transactions').delete().ilike('customer_loyalty_id', 'test-customer%')
  await supabase.from('customer_loyalty').delete().ilike('id', 'test-customer%')
  await supabase.from('loyalty_rewards').delete().ilike('name', 'Test Reward%')
  await supabase.from('cash_sessions').delete().ilike('id', 'test-session%')
  
  // Get existing program and user for proper foreign keys
  const { data: program } = await supabase.from('loyalty_programs').select('id').limit(1).single()
  const { data: user } = await supabase.from('users').select('id').limit(1).single()
  
  if (!program || !user) {
    throw new Error('No loyalty program or user found in database')
  }
  
  const { data: c } = await supabase.from('customer_loyalty').insert({ 
    customer_id: 'test-customer-001', 
    program_id: program.id, 
    current_points: 1000, 
    total_points_earned: 1000, 
    total_points_redeemed: 0 
  }).select('id').single()
  
  const { data: r } = await supabase.from('loyalty_rewards').insert({ 
    program_id: program.id,
    name: 'Test Reward', 
    description: 'Test reward for concurrency testing',
    type: 'DISCOUNT',
    points_cost: 100, 
    max_redemptions: 10,
    current_redemptions: 0,
    is_active: true 
  }).select('id').single()
  
  const { data: s } = await supabase.from('cash_sessions').insert({ 
    opened_by: user.id,
    opening_amount: 1000, 
    status: 'OPEN' 
  }).select('id').single()
  
  console.log('Test data setup complete')
  return { customerId: c!.id, rewardId: r!.id, sessionId: s!.id }
}

async function cleanupTestData(customerId: string, rewardId: string, sessionId: string) {
  console.log('Cleaning up test data...')
  await supabase.from('customer_rewards').delete().eq('customer_loyalty_id', customerId)
  await supabase.from('points_transactions').delete().eq('customer_loyalty_id', customerId)
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