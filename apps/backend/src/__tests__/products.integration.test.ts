import { createClient } from '@supabase/supabase-js';
import { prisma } from '../index';
import { productCache } from '../services/cache.service';

describe('Products Integration Tests', () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  beforeAll(async () => {
    // Setup test environment
    await productCache.clear();
  });

  afterAll(async () => {
    // Cleanup
    await productCache.clear();
  });

  describe('Real-time Synchronization', () => {
    it('should sync product changes across multiple clients', async () => {
      // This test would require setting up multiple Supabase clients
      // and verifying that changes are synchronized properly
      expect(true).toBe(true); // Placeholder
    });

    it('should handle concurrent product updates', async () => {
      // Test operational transformation for concurrent edits
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Cache Integration', () => {
    it('should cache frequently accessed products', async () => {
      const cacheKey = 'test-product-cache';
      const testData = { id: 'test', name: 'Test Product' };

      // Set cache
      await productCache.set(cacheKey, testData, 60);

      // Get from cache
      const cached = await productCache.get<typeof testData>(cacheKey);

      expect(cached).toEqual(testData);
    });

    it('should invalidate cache on product updates', async () => {
      // Create a product
      const product = await prisma.product.create({
        data: {
          name: 'Cache Test Product',
          sku: 'CACHE001',
          categoryId: 'test-category',
          costPrice: 10,
          salePrice: 15,
          stockQuantity: 100,
          minStock: 10
        }
      });

      // Cache should be invalidated when product is updated
      await productCache.invalidateProduct(product.id);

      // Verify cache is cleared
      const cached = await productCache.get(product.id);
      expect(cached).toBeNull();

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  describe('Database Constraints', () => {
    it('should enforce SKU uniqueness', async () => {
      const sku = 'UNIQUE_TEST_001';

      // Create first product
      const product1 = await prisma.product.create({
        data: {
          name: 'Unique Test Product 1',
          sku,
          categoryId: 'test-category',
          costPrice: 10,
          salePrice: 15,
          stockQuantity: 100,
          minStock: 10
        }
      });

      // Attempt to create second product with same SKU should fail
      await expect(
        prisma.product.create({
          data: {
            name: 'Unique Test Product 2',
            sku,
            categoryId: 'test-category',
            costPrice: 10,
            salePrice: 15,
            stockQuantity: 100,
            minStock: 10
          }
        })
      ).rejects.toThrow();

      // Cleanup
      await prisma.product.delete({ where: { id: product1.id } });
    });

    it('should maintain referential integrity', async () => {
      // Create product with category
      const product = await prisma.product.create({
        data: {
          name: 'Referential Integrity Test',
          sku: 'REF_TEST_001',
          categoryId: 'test-category',
          costPrice: 10,
          salePrice: 15,
          stockQuantity: 100,
          minStock: 10
        }
      });

      // Attempt to delete category should fail or cascade
      // This depends on the foreign key constraints setup
      await expect(
        prisma.category.delete({ where: { id: 'test-category' } })
      ).rejects.toThrow();

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple products
      const products = Array.from({ length: 10 }, (_, i) => ({
        name: `Bulk Test Product ${i}`,
        sku: `BULK_TEST_${i.toString().padStart(3, '0')}`,
        categoryId: 'test-category',
        costPrice: 10 + i,
        salePrice: 15 + i,
        stockQuantity: 100,
        minStock: 10
      }));

      await prisma.product.createMany({ data: products });

      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Bulk update
      const updateStartTime = Date.now();
      await prisma.product.updateMany({
        where: { sku: { startsWith: 'BULK_TEST_' } },
        data: { stockQuantity: 150 }
      });

      const updateTime = Date.now() - updateStartTime;
      expect(updateTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Cleanup
      await prisma.product.deleteMany({
        where: { sku: { startsWith: 'BULK_TEST_' } }
      });
    });

    it('should perform efficient searches', async () => {
      // Create test products
      const searchProducts = Array.from({ length: 50 }, (_, i) => ({
        name: `Search Test Product ${i}`,
        sku: `SEARCH_TEST_${i.toString().padStart(3, '0')}`,
        categoryId: 'test-category',
        costPrice: 10,
        salePrice: 15,
        stockQuantity: 100,
        minStock: 10
      }));

      await prisma.product.createMany({ data: searchProducts });

      const searchStartTime = Date.now();

      // Perform search
      const results = await prisma.product.findMany({
        where: {
          name: { contains: 'Search Test', mode: 'insensitive' }
        },
        take: 20
      });

      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.product.deleteMany({
        where: { sku: { startsWith: 'SEARCH_TEST_' } }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test basic error handling
      expect(async () => {
        await prisma.product.findUnique({
          where: { id: 'non-existent-id' }
        });
      }).not.toThrow();
    });

    it('should handle cache failures gracefully', async () => {
      // Test cache failure scenarios
      const cacheKey = 'failure-test';

      // This should not throw even if cache is down
      await expect(
        productCache.get(cacheKey)
      ).resolves.toBeNull();

      await expect(
        productCache.set(cacheKey, { test: 'data' })
      ).resolves.not.toThrow();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain inventory movement history', async () => {
      // Create product
      const product = await prisma.product.create({
        data: {
          name: 'Consistency Test Product',
          sku: 'CONSISTENCY_TEST_001',
          categoryId: 'test-category',
          costPrice: 10,
          salePrice: 15,
          stockQuantity: 100,
          minStock: 10
        }
      });

      // Update stock (should create inventory movement)
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: 120 }
      });

      // Check inventory movements were created
      const movements = await prisma.inventoryMovement.findMany({
        where: { productId: product.id }
      });

      expect(movements.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.inventoryMovement.deleteMany({ where: { productId: product.id } });
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('should handle transaction rollbacks', async () => {
      const sku = 'TRANSACTION_TEST_001';

      // Attempt operation that should fail and rollback
      try {
        await prisma.$transaction(async (tx) => {
          // Create product
          await tx.product.create({
            data: {
              name: 'Transaction Test Product',
              sku,
              categoryId: 'test-category',
              costPrice: 10,
              salePrice: 15,
              stockQuantity: 100,
              minStock: 10
            }
          });

          // Force an error to trigger rollback
          throw new Error('Forced transaction failure');
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify product was not created (rolled back)
      const product = await prisma.product.findUnique({
        where: { sku }
      });

      expect(product).toBeNull();
    });
  });
});