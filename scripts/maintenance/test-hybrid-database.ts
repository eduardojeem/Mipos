import { hybridDb, getDatabaseHealth } from './apps/backend/src/config/hybrid-database';

async function testHybridDatabase() {
  console.log('🧪 Testing Hybrid Database Connection Strategy\n');

  try {
    // Test 1: Initialize database connection
    console.log('1️⃣ Testing database initialization...');
    const prisma = await hybridDb.initialize();
    console.log('✅ Database initialized successfully');

    // Test 2: Check configuration
    console.log('\n2️⃣ Checking database configuration...');
    const config = hybridDb.getConfig();
    console.log(`📊 Provider: ${config.provider}`);
    console.log(`🔗 Connected: ${config.isConnected}`);
    console.log(`⏰ Last attempt: ${config.lastConnectionAttempt}`);
    if (config.connectionError) {
      console.log(`❌ Last error: ${config.connectionError}`);
    }

    // Test 3: Health check
    console.log('\n3️⃣ Running health check...');
    const health = await getDatabaseHealth();
    console.log(`🏥 Status: ${health.status}`);
    console.log(`🔧 Provider: ${health.provider}`);
    console.log(`⏰ Last check: ${health.lastCheck}`);
    if (health.error) {
      console.log(`❌ Error: ${health.error}`);
    }

    // Test 4: Basic database operations
    console.log('\n4️⃣ Testing basic database operations...');
    
    // Test category operations
    console.log('📁 Testing category operations...');
    const categoryCount = await prisma.category.count();
    console.log(`📊 Categories in database: ${categoryCount}`);

    // Create a test category
    const testCategory = await prisma.category.create({
      data: {
        name: 'Hybrid Test Category',
        description: 'Test category for hybrid database'
      }
    });
    console.log(`✅ Created test category: ${testCategory.name}`);

    // Test product operations
    console.log('\n📦 Testing product operations...');
    const productCount = await prisma.product.count();
    console.log(`📊 Products in database: ${productCount}`);

    // Create a test product
    const testProduct = await prisma.product.create({
      data: {
        name: 'Hybrid Test Product',
        sku: `HYBRID-${Date.now()}`,
        categoryId: testCategory.id,
        description: 'Test product for hybrid database',
        costPrice: 10.99,
        salePrice: 19.99,
        stockQuantity: 50,
        minStock: 5
      }
    });
    console.log(`✅ Created test product: ${testProduct.name} (SKU: ${testProduct.sku})`);

    // Test 5: Query performance
    console.log('\n5️⃣ Testing query performance...');
    const startTime = Date.now();
    
    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      take: 10
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`⚡ Query executed in ${queryTime}ms`);
    console.log(`📊 Retrieved ${products.length} products with categories`);

    // Test 6: Transaction support
    console.log('\n6️⃣ Testing transaction support...');
    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { stockQuantity: 45 }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: testProduct.id,
            type: 'OUT',
            quantity: 5,
            reason: 'Hybrid database test'
          }
        });
      });
      console.log('✅ Transaction completed successfully');
    } catch (error) {
      console.log('❌ Transaction failed:', error);
    }

    // Test 7: Cleanup
    console.log('\n7️⃣ Cleaning up test data...');
    await prisma.product.delete({ where: { id: testProduct.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    console.log('✅ Test data cleaned up');

    // Test 8: Retry connection (if using SQLite, try to reconnect to Supabase)
    if (config.provider === 'sqlite') {
      console.log('\n8️⃣ Testing Supabase retry connection...');
      const retrySuccess = await hybridDb.retrySupabaseConnection();
      if (retrySuccess) {
        console.log('✅ Successfully reconnected to Supabase!');
        const newConfig = hybridDb.getConfig();
        console.log(`🔄 New provider: ${newConfig.provider}`);
      } else {
        console.log('⚠️ Still using SQLite fallback');
      }
    }

    console.log('\n🎉 Hybrid database test completed successfully!');

  } catch (error) {
    console.error('\n❌ Hybrid database test failed:', error);
    
    // Additional error information
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
      await hybridDb.disconnect();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Run the test
testHybridDatabase().catch(console.error);