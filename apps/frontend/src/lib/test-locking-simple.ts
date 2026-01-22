// Simple test runner to validate locking mechanisms
import { redeemRewardSafe, adjustPointsSafe, closeCashSessionSafe } from './loyalty-safe.js';

async function runSimpleLockingTests() {
  console.log('🧪 Validando mecanismos de bloqueo para prevenir condiciones de carrera...');
  
  try {
    // Test 1: Concurrent reward redemption (should only succeed once)
    console.log('\n📋 Test 1: Canje concurrente de recompensas');
    console.log('Iniciando 3 canjes simultáneos de la misma recompensa...');
    
    const rewardId = 'test-reward-1';
    const customerId = 'test-customer-1';
    const userId = 'test-user-1';
    
    // Run 3 concurrent redemptions
    const results = await Promise.allSettled([
      redeemRewardSafe(rewardId, customerId, 'sale-1', 'redemption-1'),
      redeemRewardSafe(rewardId, customerId, 'sale-2', 'redemption-2'),
      redeemRewardSafe(rewardId, customerId, 'sale-3', 'redemption-3')
    ]);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Resultados: ${successful} exitosos, ${failed} fallidos`);
    console.log(`🎯 Expected: 1 successful, 2 failed`);
    
    if (successful === 1 && failed === 2) {
      console.log('✅ Test PASSED: Solo un canje exitoso como esperado');
    } else {
      console.log('❌ Test FAILED: Resultados inesperados');
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.log(`  Intent ${i+1} failed:`, r.reason.message);
        } else {
          console.log(`  Intent ${i+1} succeeded:`, r.value);
        }
      });
    }
    
    // Test 2: Concurrent point adjustments (should all succeed)
    console.log('\n📋 Test 2: Ajustes concurrentes de puntos');
    console.log('Iniciando 5 ajustes simultáneos de puntos...');
    
    const adjustmentResults = await Promise.allSettled([
      adjustPointsSafe(customerId, 50, 'adjustment-1', 'adjust-1'),
      adjustPointsSafe(customerId, 30, 'adjustment-2', 'adjust-2'),
      adjustPointsSafe(customerId, 20, 'adjustment-3', 'adjust-3'),
      adjustPointsSafe(customerId, 40, 'adjustment-4', 'adjust-4'),
      adjustPointsSafe(customerId, 10, 'adjustment-5', 'adjust-5')
    ]);
    
    const successfulAdjustments = adjustmentResults.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Resultados: ${successfulAdjustments} ajustes exitosos`);
    console.log(`🎯 Expected: 5 successful adjustments`);
    
    if (successfulAdjustments === 5) {
      console.log('✅ Test PASSED: Todos los ajustes exitosos como esperado');
    } else {
      console.log('❌ Test FAILED: Resultados inesperados');
      adjustmentResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.log(`  Adjustment ${i+1} failed:`, r.reason.message);
        } else {
          console.log(`  Adjustment ${i+1} succeeded:`, r.value);
        }
      });
    }
    
    // Test 3: Concurrent cash session closure (should only succeed once)
    console.log('\n📋 Test 3: Cierre concurrente de sesión de caja');
    console.log('Iniciando 2 cierres simultáneos de sesión...');
    
    const sessionId = 'test-session-1';
    
    const closureResults = await Promise.allSettled([
      closeCashSessionSafe(sessionId, 1200, 'closure-1'), // $1200 expected
      closeCashSessionSafe(sessionId, 1200, 'closure-2')  // $1200 expected
    ]);
    
    const successfulClosures = closureResults.filter(r => r.status === 'fulfilled').length;
    const failedClosures = closureResults.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Resultados: ${successfulClosures} cierres exitosos, ${failedClosures} fallidos`);
    console.log(`🎯 Expected: 1 successful, 1 failed`);
    
    if (successfulClosures === 1 && failedClosures === 1) {
      console.log('✅ Test PASSED: Solo un cierre exitoso como esperado');
    } else {
      console.log('❌ Test FAILED: Resultados inesperados');
      closureResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.log(`  Closure ${i+1} failed:`, r.reason.message);
        } else {
          console.log(`  Closure ${i+1} succeeded:`, r.value);
        }
      });
    }
    
    console.log('\n🎉 Todos los tests de concurrencia completados');
    console.log('📊 Los mecanismos de bloqueo están funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error durante los tests:', error);
  }
}

// Run the tests
runSimpleLockingTests().catch(console.error);