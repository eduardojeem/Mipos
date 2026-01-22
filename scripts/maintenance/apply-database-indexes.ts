import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function applyDatabaseIndexes() {
  console.log('🔧 Applying Database Indexing Optimizations\n');

  try {
    // Read the SQL file
    const sqlContent = readFileSync(join(__dirname, 'database', 'indices_productos_optimizacion.sql'), 'utf-8');

    // Remove comments and split by semicolon
    const cleanSql = sqlContent
      .replace(/--.*$/gm, '') // Remove single line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

    const sqlCommands = cleanSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`📝 Found ${sqlCommands.length} SQL commands to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];

      // Skip comments and empty commands
      if (command.startsWith('--') || command.trim() === '') {
        skipCount++;
        continue;
      }

      try {
        console.log(`⚡ Executing command ${i + 1}/${sqlCommands.length}:`);
        console.log(`   ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);

        await prisma.$executeRawUnsafe(command);
        successCount++;
        console.log('   ✅ Success\n');

      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's just an "index already exists" error
        if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
          console.log('   ⚠️ Index already exists (skipping)\n');
          skipCount++;
          errorCount--; // Don't count as error
        } else {
          console.log(`   ❌ Error: ${errorMessage}\n`);
        }
      }
    }

    // Run ANALYZE to update statistics
    console.log('📊 Running ANALYZE to update database statistics...');
    try {
      await prisma.$executeRaw`ANALYZE`;
      console.log('✅ ANALYZE completed successfully\n');
    } catch (error) {
      console.log(`❌ ANALYZE failed: ${error}\n`);
    }

    // Summary
    console.log('📋 INDEXING SUMMARY:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️ Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total Commands: ${sqlCommands.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 All database indexes applied successfully!');
    } else {
      console.log(`\n⚠️ Completed with ${errorCount} errors. Check the logs above for details.`);
    }

    // Test some queries to verify indexes are working
    console.log('\n🧪 Testing Index Performance...');

    const performanceTests = [
      {
        name: 'Product by SKU lookup',
        query: () => prisma.product.findFirst({ where: { sku: 'TEST-SKU' } })
      },
      {
        name: 'Products by category',
        query: () => prisma.product.findMany({
          where: { categoryId: 'test-category-id' },
          take: 10
        })
      },
      {
        name: 'Low stock products',
        query: () => prisma.product.findMany({
          where: { stockQuantity: { lte: 10 } },
          take: 10
        })
      },
      {
        name: 'Recent sales',
        query: () => prisma.sale.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          take: 10
        })
      }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      try {
        await test.query();
        const duration = Date.now() - startTime;
        console.log(`   ${test.name}: ${duration}ms ✅`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`   ${test.name}: ${duration}ms ❌ (${error})`);
      }
    }

    console.log('\n✨ Database indexing optimization completed!');

  } catch (error) {
    console.error('\n❌ Failed to apply database indexes:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the indexing
applyDatabaseIndexes().catch(console.error);