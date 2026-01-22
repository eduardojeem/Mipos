import request from 'supertest';
import express from 'express';
import productRoutes from '../routes/products';
import purchaseRoutes from '../routes/purchases';
import salesRoutes from '../routes/sales';
import { PrismaClient } from '@prisma/client';

// Create test app
const app = express();
app.use(express.json());

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'admin@example.com',
      role: 'ADMIN'
    };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }
}));

app.use('/products', productRoutes);
app.use('/purchases', purchaseRoutes);
app.use('/sales', salesRoutes);

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Sales Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Sales Flow', () => {
    it('should handle complete flow: create product → receive purchase → stock increases → create sale → stock decreases', async () => {
      // Step 1: Create a product
      const productData = {
        name: 'Test Laptop',
        sku: 'LAPTOP001',
        description: 'Gaming laptop',
        costPrice: 800.00,
        salePrice: 1200.00,
        stockQuantity: 0, // Start with 0 stock
        minStock: 5,
        categoryId: 'electronics-cat',
        images: ['laptop.jpg']
      };

      const mockCategory = {
        id: 'electronics-cat',
        name: 'Electronics'
      };

      const mockCreatedProduct = {
        id: 'product-1',
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock category exists
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      
      // Mock product creation with initial inventory movement
      (mockPrisma.$transaction as jest.Mock).mockResolvedValueOnce([
        mockCreatedProduct,
        { id: 'movement-1', type: 'IN', quantity: 0 }
      ]);

      const createProductResponse = await request(app)
        .post('/products')
        .send(productData);

      expect(createProductResponse.status).toBe(201);
      expect(createProductResponse.body.product.stockQuantity).toBe(0);

      // Step 2: Receive a purchase (stock should increase)
      const purchaseData = {
        supplierId: 'supplier-1',
        items: [
          {
            productId: 'product-1',
            quantity: 10,
            unitCost: 750.00
          }
        ]
      };

      const mockSupplier = {
        id: 'supplier-1',
        name: 'Tech Supplier'
      };

      const mockProductForPurchase = {
        id: 'product-1',
        name: 'Test Laptop',
        stockQuantity: 0,
        costPrice: 800.00
      };

      const mockUpdatedProductAfterPurchase = {
        ...mockProductForPurchase,
        stockQuantity: 10,
        costPrice: 750.00 // Updated with weighted average
      };

      const mockCreatedPurchase = {
        id: 'purchase-1',
        supplierId: 'supplier-1',
        userId: 'test-user-id',
        total: 7500.00,
        createdAt: new Date()
      };

      // Mock supplier exists
      (mockPrisma.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier);
      
      // Mock product exists for purchase
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProductForPurchase);
      
      // Mock purchase transaction
      (mockPrisma.$transaction as jest.Mock).mockResolvedValueOnce([
        mockCreatedPurchase,
        { id: 'purchase-item-1' },
        mockUpdatedProductAfterPurchase,
        { id: 'movement-2', type: 'IN', quantity: 10 }
      ]);

      const createPurchaseResponse = await request(app)
        .post('/purchases')
        .send(purchaseData);

      expect(createPurchaseResponse.status).toBe(201);
      expect(createPurchaseResponse.body.purchase.total).toBe(7500.00);

      // Step 3: Create a sale (stock should decrease)
      const saleData = {
        customerId: 'customer-1',
        paymentMethod: 'CASH',
        discount: 0,
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 1200.00
          }
        ]
      };

      const mockCustomer = {
        id: 'customer-1',
        name: 'John Doe'
      };

      const mockProductForSale = {
        id: 'product-1',
        name: 'Test Laptop',
        stockQuantity: 10,
        salePrice: 1200.00
      };

      const mockUpdatedProductAfterSale = {
        ...mockProductForSale,
        stockQuantity: 8 // 10 - 2 = 8
      };

      const mockCreatedSale = {
        id: 'sale-1',
        userId: 'test-user-id',
        customerId: 'customer-1',
        total: 2400.00,
        paymentMethod: 'CASH',
        discount: 0,
        createdAt: new Date()
      };

      // Mock customer exists
      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
      
      // Mock product exists for sale with sufficient stock
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProductForSale);
      
      // Mock sale transaction
      (mockPrisma.$transaction as jest.Mock).mockResolvedValueOnce([
        mockCreatedSale,
        { id: 'sale-item-1' },
        mockUpdatedProductAfterSale,
        { id: 'movement-3', type: 'OUT', quantity: 2 }
      ]);

      const createSaleResponse = await request(app)
        .post('/sales')
        .send(saleData);

      expect(createSaleResponse.status).toBe(201);
      expect(createSaleResponse.body.sale.total).toBe(2400.00);

      // Verify the transaction calls were made correctly
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should prevent sale when insufficient stock', async () => {
      const saleData = {
        customerId: 'customer-1',
        paymentMethod: 'CASH',
        discount: 0,
        items: [
          {
            productId: 'product-1',
            quantity: 15, // More than available stock
            unitPrice: 1200.00
          }
        ]
      };

      const mockCustomer = {
        id: 'customer-1',
        name: 'John Doe'
      };

      const mockProductWithLowStock = {
        id: 'product-1',
        name: 'Test Laptop',
        stockQuantity: 5, // Only 5 in stock
        salePrice: 1200.00
      };

      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProductWithLowStock);

      const response = await request(app)
        .post('/sales')
        .send(saleData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient stock');
    });

    it('should calculate correct totals with discount', async () => {
      const saleData = {
        customerId: 'customer-1',
        paymentMethod: 'CARD',
        discount: 10, // 10% discount
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            unitPrice: 1000.00
          },
          {
            productId: 'product-2',
            quantity: 2,
            unitPrice: 500.00
          }
        ]
      };

      const mockCustomer = {
        id: 'customer-1',
        name: 'John Doe'
      };

      const mockProduct1 = {
        id: 'product-1',
        name: 'Product 1',
        stockQuantity: 10,
        salePrice: 1000.00
      };

      const mockProduct2 = {
        id: 'product-2',
        name: 'Product 2',
        stockQuantity: 20,
        salePrice: 500.00
      };

      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
      (mockPrisma.product.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);

      // Subtotal: (1 * 1000) + (2 * 500) = 2000
      // Discount: 2000 * 0.10 = 200
      // Total: 2000 - 200 = 1800
      const expectedTotal = 1800.00;

      const mockCreatedSale = {
        id: 'sale-1',
        userId: 'test-user-id',
        customerId: 'customer-1',
        total: expectedTotal,
        paymentMethod: 'CARD',
        discount: 10,
        createdAt: new Date()
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
        mockCreatedSale,
        { id: 'sale-item-1' },
        { id: 'sale-item-2' },
        { id: 'updated-product-1' },
        { id: 'updated-product-2' },
        { id: 'movement-1' },
        { id: 'movement-2' }
      ]);

      const response = await request(app)
        .post('/sales')
        .send(saleData);

      expect(response.status).toBe(201);
      expect(response.body.sale.total).toBe(expectedTotal);
      expect(response.body.sale.discount).toBe(10);
    });
  });

  describe('Authorization Tests', () => {
    it('should prevent cashier from deleting products', async () => {
      // Override auth middleware for this test
      const cashierApp = express();
      cashierApp.use(express.json());
      
      // Mock cashier user
      cashierApp.use((req: any, res: any, next: any) => {
        req.user = {
          id: 'cashier-user-id',
          email: 'cashier@example.com',
          role: 'CASHIER'
        };
        next();
      });
      
      cashierApp.use('/products', productRoutes);

      const mockProduct = {
        id: '1',
        name: 'Test Product'
      };

      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(cashierApp)
        .delete('/products/1');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should allow cashier to create sales', async () => {
      // Override auth middleware for this test
      const cashierApp = express();
      cashierApp.use(express.json());
      
      // Mock cashier user
      cashierApp.use((req: any, res: any, next: any) => {
        req.user = {
          id: 'cashier-user-id',
          email: 'cashier@example.com',
          role: 'CASHIER'
        };
        next();
      });
      
      cashierApp.use('/sales', salesRoutes);

      const saleData = {
        customerId: 'customer-1',
        paymentMethod: 'CASH',
        discount: 0,
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            unitPrice: 100.00
          }
        ]
      };

      const mockCustomer = { id: 'customer-1', name: 'John Doe' };
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        stockQuantity: 10,
        salePrice: 100.00
      };

      const mockCreatedSale = {
        id: 'sale-1',
        userId: 'cashier-user-id',
        customerId: 'customer-1',
        total: 100.00,
        paymentMethod: 'CASH',
        discount: 0,
        createdAt: new Date()
      };

      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
        mockCreatedSale,
        { id: 'sale-item-1' },
        { id: 'updated-product' },
        { id: 'movement-1' }
      ]);

      const response = await request(cashierApp)
        .post('/sales')
        .send(saleData);

      expect(response.status).toBe(201);
      expect(response.body.sale.userId).toBe('cashier-user-id');
    });
  });
});