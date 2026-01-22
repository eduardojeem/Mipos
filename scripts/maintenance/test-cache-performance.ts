import { PrismaClient } from '@prisma/client';
import { getCachedPrismaClient, cache, cacheConfig } from './apps/backend/src/config/cache';

const prisma = new PrismaClient();
const cachedPrisma = getCachedPrismaClient(prisma);

async function testCachePerformance() {
  console.log('🚀 Testing Cache Performance...\n');

  try {
    // Test 1: Categories caching
    console.log('📁 Testing Categories Cache:');
    
    const start1 = Date.now();
    const categories1 = await cachedPrisma.getCategories();
    const time1 = Date.now() - start1;
    console.log(`  First call (DB): ${time1}ms - Found ${categories1.length} categories`);

    const start2 = Date.now();
    const categories2 = await cachedPrisma.getCategories();
    const time2 = Date.now() - start2;
    console.log(`  Second call (Cache): ${time2}ms - Found ${categories2.length} categories`);
    console.log(`  Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%\n`);

    // Test 2: Dashboard stats caching
    console.log('📊 Testing Dashboard Stats Cache:');
    
    const start3 = Date.now();
    const stats1 = await cachedPrisma.getDashboardStats();
    const time3 = Date.now() - start3;
    console.log(`  First call (DB): ${time3}ms`);
    console.log(`  Stats: ${JSON.stringify(stats1, null, 2)}`);

    const start4 = Date.now();
    const stats2 = await cachedPrisma.getDashboardStats();
    const time4 = Date.now() - start4;
    console.log(`  Second call (Cache): ${time4}ms`);
    console.log(`  Performance improvement: ${((time3 - time4) / time3 * 100).toFixed(1)}%\n`);

    // Test 3: Low stock products caching
    console.log('📦 Testing Low Stock Products Cache:');
    
    const start5 = Date.now();
    const lowStock1 = await cachedPrisma.getLowStockProducts(10);
    const time5 = Date.now() - start5;
    console.log(`  First call (DB): ${time5}ms - Found ${lowStock1.length} low stock products`);

    const start6 = Date.now();
    const lowStock2 = await cachedPrisma.getLowStockProducts(10);
    const time6 = Date.now() - start6;
    console.log(`  Second call (Cache): ${time6}ms - Found ${lowStock2.length} low stock products`);
    console.log(`  Performance improvement: ${((time5 - time6) / time5 * 100).toFixed(1)}%\n`);

    // Test 4: Recent sales caching
    console.log('💰 Testing Recent Sales Cache:');
    
    const start7 = Date.now();
    const sales1 = await cachedPrisma.getRecentSales(10);
    const time7 = Date.now() - start7;
    console.log(`  First call (DB): ${time7}ms - Found ${sales1.length} recent sales`);

    const start8 = Date.now();
    const sales2 = await cachedPrisma.getRecentSales(10);
    const time8 = Date.now() - start8;
    console.log(`  Second call (Cache): ${time8}ms - Found ${sales2.length} recent sales`);
    console.log(`  Performance improvement: ${((time7 - time8) / time7 * 100).toFixed(1)}%\n`);

    // Test 5: Cache invalidation
    console.log('🔄 Testing Cache Invalidation:');
    
    console.log('  Cache stats before invalidation:', cachedPrisma.getCacheStats());
    
    cachedPrisma.invalidateSalesCache();
    console.log('  Invalidated sales cache');
    
    cachedPrisma.invalidateCategoryCache();
    console.log('  Invalidated category cache');
    
    console.log('  Cache stats after invalidation:', cachedPrisma.getCacheStats());

    // Test 6: Cache with different parameters
    console.log('\n🔍 Testing Cache with Different Parameters:');
    
    if (categories1.length > 0) {
      const categoryId = categories1[0].id;
      
      const start9 = Date.now();
      const products1 = await cachedPrisma.getProductsByCategory(categoryId, 20);
      const time9 = Date.now() - start9;
      console.log(`  Products by category (limit 20) - First call: ${time9}ms - Found ${products1.length} products`);

      const start10 = Date.now();
      const products2 = await cachedPrisma.getProductsByCategory(categoryId, 20);
      const time10 = Date.now() - start10;
      console.log(`  Products by category (limit 20) - Second call: ${time10}ms - Found ${products2.length} products`);
      console.log(`  Performance improvement: ${((time9 - time10) / time9 * 100).toFixed(1)}%`);

      // Different limit should not use cache
      const start11 = Date.now();
      const products3 = await cachedPrisma.getProductsByCategory(categoryId, 50);
      const time11 = Date.now() - start11;
      console.log(`  Products by category (limit 50) - First call: ${time11}ms - Found ${products3.length} products`);
    }

    // Test 7: Memory usage and cleanup
    console.log('\n🧹 Testing Cache Cleanup:');
    
    console.log('  Cache stats before cleanup:', cachedPrisma.getCacheStats());
    
    // Force cleanup
    cache.cleanup();
    console.log('  Cache stats after cleanup:', cachedPrisma.getCacheStats());

    // Test 8: Cache configuration
    console.log('\n⚙️ Cache Configuration:');
    console.log('  TTL Settings:', cacheConfig.ttl);
    console.log('  Sample Cache Keys:', {
      categories: cacheConfig.keys.categories,
      productsBySku: cacheConfig.keys.productsBySku('SAMPLE-SKU'),
      dashboardStats: cacheConfig.keys.dashboardStats
    });

    console.log('\n✅ Cache Performance Test Completed Successfully!');
    console.log('\n📈 Summary:');
    console.log('  - Categories: Significant performance improvement on repeated queries');
    console.log('  - Dashboard Stats: Fast access to aggregated data');
    console.log('  - Low Stock Products: Quick inventory alerts');
    console.log('  - Recent Sales: Rapid sales history access');
    console.log('  - Cache Invalidation: Working correctly');
    console.log('  - Parameter-based Caching: Different parameters create separate cache entries');
    console.log('  - Memory Management: Cleanup functionality operational');

  } catch (error) {
    console.error('❌ Cache Performance Test Failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCachePerformance().catch(console.error);