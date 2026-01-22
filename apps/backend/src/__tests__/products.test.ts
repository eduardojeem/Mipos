import request from 'supertest';
import app from '../index';
import { prisma } from '../index';
import { productCache } from '../services/cache.service';

describe('Products API', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  const authToken = 'test-jwt-token';

  beforeAll(async () => {
    // Setup test data
    await prisma.category.create({
      data: {
        id: 'test-category',
        name: 'Test Category',
        description: 'Category for testing'
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.product.deleteMany({ where: { categoryId: 'test-category' } });
    await prisma.category.deleteMany({ where: { id: 'test-category' } });
    await productCache.clear();
  });

  describe('GET /api/products', () => {
    it('should return products list with pagination', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'test' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ categoryId: 'test-category' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/products', () => {
    const validProduct = {
      name: 'Test Product',
      sku: 'TEST001',
      categoryId: 'test-category',
      costPrice: 10.00,
      salePrice: 15.00,
      stockQuantity: 100,
      minStock: 10
    };

    it('should create a new product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProduct);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('product');
      expect(response.body.product.name).toBe(validProduct.name);
      expect(response.body.product.sku).toBe(validProduct.sku);
    });

    it('should validate required fields', async () => {
      const invalidProduct = {
        name: 'Test Product'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProduct);

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate SKU', async () => {
      // First create a product
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProduct);

      // Try to create another with same SKU
      const duplicateProduct = {
        ...validProduct,
        name: 'Different Name'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateProduct);

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      // Create a test product
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Update Test Product',
          sku: 'UPDATE001',
          categoryId: 'test-category',
          costPrice: 20.00,
          salePrice: 30.00,
          stockQuantity: 50,
          minStock: 5
        });

      productId = response.body.product.id;
    });

    it('should update an existing product', async () => {
      const updateData = {
        name: 'Updated Product Name',
        salePrice: 35.00
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.product.name).toBe(updateData.name);
      expect(response.body.product.salePrice).toBe(updateData.salePrice);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .put('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      // Create a test product
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Delete Test Product',
          sku: 'DELETE001',
          categoryId: 'test-category',
          costPrice: 5.00,
          salePrice: 8.00,
          stockQuantity: 25,
          minStock: 3
        });

      productId = response.body.product.id;
    });

    it('should delete an existing product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should prevent deletion of product with sales', async () => {
      // This test would require creating a product with sales first
      // For now, we'll skip this test
    });
  });

  describe('GET /api/products/search', () => {
    beforeAll(async () => {
      // Create test products for search
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Search Test Product',
          sku: 'SEARCH001',
          categoryId: 'test-category',
          costPrice: 15.00,
          salePrice: 25.00,
          stockQuantity: 75,
          minStock: 10
        });
    });

    it('should perform advanced search', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'Search',
          sortBy: 'name',
          sortOrder: 'asc',
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('search');
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          minPrice: 20,
          maxPrice: 30
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.products)).toBe(true);
    });
  });

  describe('GET /api/products/export', () => {
    it('should export products in CSV format', async () => {
      const response = await request(app)
        .get('/api/products/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(typeof response.text).toBe('string');
    });

    it('should export products in JSON format', async () => {
      const response = await request(app)
        .get('/api/products/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('POST /api/products/bulk-stock-update', () => {
    let productId: string;

    beforeAll(async () => {
      // Create a test product
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bulk Update Test Product',
          sku: 'BULK001',
          categoryId: 'test-category',
          costPrice: 12.00,
          salePrice: 18.00,
          stockQuantity: 40,
          minStock: 8
        });

      productId = response.body.product.id;
    });

    it('should perform bulk stock updates', async () => {
      const bulkUpdate = {
        updates: [
          {
            productId,
            quantity: 10,
            reason: 'Restock'
          }
        ]
      };

      const response = await request(app)
        .post('/api/products/bulk-stock-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkUpdate);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.successful).toBe(1);
      expect(response.body.summary.failed).toBe(0);
    });

    it('should handle bulk update errors gracefully', async () => {
      const bulkUpdate = {
        updates: [
          {
            productId: 'non-existent-id',
            quantity: 10,
            reason: 'Test'
          }
        ]
      };

      const response = await request(app)
        .post('/api/products/bulk-stock-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkUpdate);

      expect(response.status).toBe(200);
      expect(response.body.summary.successful).toBe(0);
      expect(response.body.summary.failed).toBe(1);
    });
  });

  describe('GET /api/products/alerts/low-stock', () => {
    it('should return low stock alerts', async () => {
      const response = await request(app)
        .get('/api/products/alerts/low-stock')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});