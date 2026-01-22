import request from 'supertest';
import app, { prisma } from '../../src/index';

describe('Sales concurrency and transactional coordination', () => {
  const TEST_SKU = `TEST-SKU-${Date.now()}`;
  let productId: string;

  beforeAll(async () => {
    // Set environment variables for testing
    (process.env as any).NODE_ENV = 'development';
    (process.env as any).MOCK_AUTH = 'true';
    // Seed a product with limited stock
    const category = await prisma.category.findFirst();
    const categoryId = category?.id || (await prisma.category.create({ data: { name: `TestCat-${Date.now()}` } })).id;
    const prod = await prisma.product.create({
      data: {
        name: 'Concurrent Product',
        sku: TEST_SKU,
        categoryId,
        costPrice: 5,
        salePrice: 10,
        stockQuantity: 5,
        minStock: 0,
        images: ''
      }
    });
    productId = prod.id;
  });

  afterAll(async () => {
    try {
      await prisma.product.delete({ where: { id: productId } });
    } catch {}
  });

  test('Concurrent sales consume stock safely; excess requests fail', async () => {
    const payload = {
      items: [{ productId, quantity: 1, unitPrice: 10 }],
      paymentMethod: 'CASH',
      discount: 0,
      discountType: 'PERCENTAGE',
      tax: 0,
      notes: 'Concurrency test'
    };

    const N = 10; // 10 simultaneous sale attempts for stock=5
    const requests = Array.from({ length: N }, () =>
      request(app)
        .post('/api/sales')
        .set('Content-Type', 'application/json')
        .send(payload)
    );

    const results = await Promise.all(requests);
    const success = results.filter((r: any) => r.status === 201).length;
    const failures = results.filter((r: any) => r.status !== 201).length;

    expect(success).toBeGreaterThan(0);
    expect(success).toBeLessThanOrEqual(5);
    expect(failures).toBeGreaterThan(0);

    const final = await prisma.product.findUnique({ where: { id: productId } });
    expect(final?.stockQuantity).toBeGreaterThanOrEqual(0);
    expect(final?.stockQuantity).toBe(5 - success);
  });

  test('Rollback on insufficient stock preserves product quantity', async () => {
    const before = await prisma.product.findUnique({ where: { id: productId } });
    const payload = {
      items: [{ productId, quantity: (before?.stockQuantity || 0) + 10, unitPrice: 10 }],
      paymentMethod: 'CASH',
      discount: 0,
      discountType: 'PERCENTAGE',
      tax: 0
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(400);
    const after = await prisma.product.findUnique({ where: { id: productId } });
    expect(after?.stockQuantity).toBe(before?.stockQuantity);
  });
});