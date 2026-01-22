import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function refreshMaterializedViews() {
  console.log('🔄 Refreshing materialized views...');
  try {
    // Use CONCURRENTLY to avoid blocking readers when supported
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily_overall');
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily_product');
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily_category');
    console.log('✅ Materialized views refreshed');
  } catch (err) {
    console.warn('⚠️ Concurrent refresh failed, retrying without CONCURRENTLY...', err instanceof Error ? err.message : String(err));
    try {
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_sales_daily_overall');
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_sales_daily_product');
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_sales_daily_category');
      console.log('✅ Materialized views refreshed (non-concurrent)');
    } catch (error) {
      console.error('❌ Failed to refresh materialized views', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  refreshMaterializedViews().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}