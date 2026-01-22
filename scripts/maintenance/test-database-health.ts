import { getDatabaseHealth, testDatabaseOperations, dbHealthMonitor } from './apps/backend/src/config/database-health';

async function testDatabaseHealthSystem() {
  console.log('🏥 Testing Database Health Monitoring System\n');

  try {
    // Test 1: Full health check
    console.log('1️⃣ Running full health check...');
    const health = await getDatabaseHealth();
    
    console.log('📊 Health Check Results:');
    console.log(`   Overall Status: ${health.overall}`);
    console.log(`   SQLite Status: ${health.sqlite.status}`);
    console.log(`   SQLite Response Time: ${health.sqlite.responseTime}ms`);
    if (health.sqlite.error) {
      console.log(`   SQLite Error: ${health.sqlite.error}`);
    }
    
    console.log(`   Supabase Status: ${health.supabase.status}`);
    if (health.supabase.responseTime) {
      console.log(`   Supabase Response Time: ${health.supabase.responseTime}ms`);
    }
    if (health.supabase.error) {
      console.log(`   Supabase Error: ${health.supabase.error}`);
    }

    // Test 2: Database operations
    console.log('\n2️⃣ Testing database operations...');
    const operationsTest = await testDatabaseOperations();
    
    console.log('🔧 Operations Test Results:');
    console.log(`   Overall Success: ${operationsTest.success}`);
    console.log(`   Connect: ${operationsTest.operations.connect ? '✅' : '❌'}`);
    console.log(`   Read: ${operationsTest.operations.read ? '✅' : '❌'}`);
    console.log(`   Write: ${operationsTest.operations.write ? '✅' : '❌'}`);
    console.log(`   Transaction: ${operationsTest.operations.transaction ? '✅' : '❌'}`);
    
    if (operationsTest.errors.length > 0) {
      console.log('   Errors:');
      operationsTest.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }

    // Test 3: Individual health checks
    console.log('\n3️⃣ Testing individual health checks...');
    
    const sqliteHealth = await dbHealthMonitor.checkSQLiteHealth();
    console.log(`SQLite Individual Check: ${sqliteHealth.status} (${sqliteHealth.responseTime}ms)`);
    
    const supabaseHealth = await dbHealthMonitor.checkSupabaseHealth();
    console.log(`Supabase Individual Check: ${supabaseHealth.status} (${supabaseHealth.responseTime || 'N/A'}ms)`);

    // Test 4: Database client access
    console.log('\n4️⃣ Testing database client access...');
    const prisma = dbHealthMonitor.getPrismaClient();
    
    const categoryCount = await prisma.category.count();
    const productCount = await prisma.product.count();
    
    console.log(`📊 Database Statistics:`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Products: ${productCount}`);

    // Test 5: Performance monitoring
    console.log('\n5️⃣ Running performance tests...');
    
    const performanceTests = [
      {
        name: 'Simple Count Query',
        operation: () => prisma.product.count()
      },
      {
        name: 'Complex Query with Relations',
        operation: () => prisma.product.findMany({
          include: { category: true },
          take: 10
        })
      },
      {
        name: 'Aggregation Query',
        operation: () => prisma.product.aggregate({
          _avg: { salePrice: true },
          _count: { id: true }
        })
      }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      try {
        await test.operation();
        const duration = Date.now() - startTime;
        console.log(`   ${test.name}: ${duration}ms ✅`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`   ${test.name}: ${duration}ms ❌ (${error})`);
      }
    }

    // Test 6: Health check over time (simulate monitoring)
    console.log('\n6️⃣ Simulating continuous monitoring...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`   Check ${i}/3...`);
      const quickHealth = await getDatabaseHealth();
      console.log(`   Status: ${quickHealth.overall} (SQLite: ${quickHealth.sqlite.responseTime}ms)`);
      
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }

    console.log('\n✅ Database health monitoring test completed successfully!');

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   Primary Database (SQLite): ${health.sqlite.status}`);
    console.log(`   Backup Database (Supabase): ${health.supabase.status}`);
    console.log(`   Overall System Health: ${health.overall}`);
    
    if (health.overall === 'healthy') {
      console.log('   🎉 System is fully operational!');
    } else if (health.overall === 'degraded') {
      console.log('   ⚠️ System is operational but with limitations');
    } else {
      console.log('   🚨 System requires immediate attention');
    }

  } catch (error) {
    console.error('\n❌ Database health test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  } finally {
    // Cleanup
    try {
      await dbHealthMonitor.disconnect();
      console.log('\n🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Run the test
testDatabaseHealthSystem().catch(console.error);