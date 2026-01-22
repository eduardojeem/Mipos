import { describe, it, expect } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
  validateProduct,
  validateFilters
} from '../product-schemas';

describe('Product Schemas', () => {
  describe('createProductSchema', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        name: 'Test Product',
        code: 'TEST-001',
        description: 'Test description',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10000,
        stock: 50,
        minStock: 10
      };

      const result = createProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should reject product with invalid SKU', () => {
      const invalidProduct = {
        name: 'Test Product',
        code: 'test@#$',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10000,
        stock: 50
      };

      const result = createProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should reject product with price not multiple of 1000', () => {
      const invalidProduct = {
        name: 'Test Product',
        code: 'TEST-001',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10500,
        stock: 50
      };

      const result = createProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should reject product with stock below minStock', () => {
      const invalidProduct = {
        name: 'Test Product',
        code: 'TEST-001',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10000,
        stock: 5,
        minStock: 10
      };

      const result = createProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should reject product with offerPrice >= price', () => {
      const invalidProduct = {
        name: 'Test Product',
        code: 'TEST-001',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10000,
        offerActive: true,
        offerPrice: 15000,
        stock: 50
      };

      const result = createProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should transform SKU to uppercase', () => {
      const product = {
        name: 'Test Product',
        code: 'test-001',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10000,
        stock: 50
      };

      const result = createProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('TEST-001');
      }
    });
  });

  describe('validateProduct helper', () => {
    it('should return success for valid product', () => {
      const validProduct = {
        name: 'Test Product',
        code: 'TEST-001',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        price: 10000,
        stock: 50
      };

      const result = validateProduct(validProduct);
      expect(result.success).toBe(true);
    });

    it('should return formatted errors for invalid product', () => {
      const invalidProduct = {
        name: 'Te',
        code: 'test@#$',
        price: 10500
      };

      const result = validateProduct(invalidProduct);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.message).toBe('Datos de producto inválidos');
    });
  });

  describe('productFiltersSchema', () => {
    it('should validate valid filters', () => {
      const validFilters = {
        search: 'test',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        minPrice: 10000,
        maxPrice: 50000,
        stockStatus: 'in_stock'
      };

      const result = productFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should reject invalid stock status', () => {
      const invalidFilters = {
        stockStatus: 'invalid_status'
      };

      const result = productFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
    });
  });

  describe('validateFilters helper', () => {
    it('should return success for valid filters', () => {
      const validFilters = {
        search: 'test',
        minPrice: 10000
      };

      const result = validateFilters(validFilters);
      expect(result.success).toBe(true);
    });

    it('should return formatted errors for invalid filters', () => {
      const invalidFilters = {
        categoryId: 'not-a-uuid'
      };

      const result = validateFilters(invalidFilters);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
