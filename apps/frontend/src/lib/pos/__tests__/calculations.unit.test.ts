/**
 * Unit Tests for POS Calculation Functions
 * Feature: pos-audit
 * 
 * These tests verify specific examples and edge cases
 */

import { describe, it, expect } from '@jest/globals';
import { calculateCartWithIva } from '../calculations';
import type { CartItem } from '@/hooks/useCart';
import type { Product } from '@/types';

describe('POS Calculations - Unit Tests', () => {
  describe('calculateCartWithIva - Basic Calculations', () => {
    it('should calculate correctly for single product without IVA included', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 100,
        cost_price: 50,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 2,
        price: 100,
        total: 200,
      }];

      const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

      expect(result.subtotal).toBe(200); // Base price
      expect(result.taxAmount).toBe(20); // 10% of 200
      expect(result.subtotalWithIva).toBe(220); // 200 + 20
      expect(result.total).toBe(220);
      expect(result.itemCount).toBe(2);
    });

    it('should calculate correctly for single product with IVA included', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 110,
        cost_price: 50,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: true,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 1,
        price: 110,
        total: 110,
      }];

      const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

      expect(result.subtotalWithIva).toBe(110);
      expect(result.subtotal).toBeCloseTo(100, 2); // 110 / 1.10
      expect(result.taxAmount).toBeCloseTo(10, 2); // 110 - 100
      expect(result.total).toBe(110);
    });

    it('should handle empty cart', () => {
      const result = calculateCartWithIva([], [], 0, 'FIXED_AMOUNT');

      expect(result.subtotal).toBe(0);
      expect(result.subtotalWithIva).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.total).toBe(0);
      expect(result.itemCount).toBe(0);
      expect(result.itemsWithIva).toEqual([]);
    });
  });

  describe('calculateCartWithIva - Discount Calculations', () => {
    it('should apply percentage discount correctly', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 100,
        cost_price: 50,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 1,
        price: 100,
        total: 100,
      }];

      const result = calculateCartWithIva(cart, [product], 10, 'PERCENTAGE');

      expect(result.subtotalWithIva).toBe(110); // 100 + 10% IVA
      expect(result.discountAmount).toBe(11); // 10% of 110
      expect(result.total).toBe(99); // 110 - 11
    });

    it('should apply fixed discount correctly', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 100,
        cost_price: 50,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 1,
        price: 100,
        total: 100,
      }];

      const result = calculateCartWithIva(cart, [product], 20, 'FIXED_AMOUNT');

      expect(result.subtotalWithIva).toBe(110); // 100 + 10% IVA
      expect(result.discountAmount).toBe(20);
      expect(result.total).toBe(90); // 110 - 20
    });

    it('should clamp total to 0 when discount exceeds subtotal', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 50,
        cost_price: 25,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 1,
        price: 50,
        total: 50,
      }];

      const result = calculateCartWithIva(cart, [product], 100, 'FIXED_AMOUNT');

      expect(result.subtotalWithIva).toBe(55); // 50 + 5
      expect(result.discountAmount).toBe(100);
      expect(result.total).toBe(0); // Clamped to 0
    });
  });

  describe('calculateCartWithIva - Multiple Products', () => {
    it('should calculate correctly for multiple products with different IVA rates', () => {
      const products: Product[] = [
        {
          id: '1',
          name: 'Product A',
          sku: 'A-001',
          sale_price: 100,
          cost_price: 50,
          stock_quantity: 100,
          is_active: true,
          iva_rate: 10,
          iva_included: false,
        } as Product,
        {
          id: '2',
          name: 'Product B',
          sku: 'B-001',
          sale_price: 200,
          cost_price: 100,
          stock_quantity: 100,
          is_active: true,
          iva_rate: 5,
          iva_included: false,
        } as Product,
      ];

      const cart: CartItem[] = [
        {
          product_id: '1',
          product_name: 'Product A',
          quantity: 1,
          price: 100,
          total: 100,
        },
        {
          product_id: '2',
          product_name: 'Product B',
          quantity: 1,
          price: 200,
          total: 200,
        },
      ];

      const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT');

      expect(result.subtotal).toBe(300); // 100 + 200
      expect(result.taxAmount).toBe(20); // 10 (10% of 100) + 10 (5% of 200)
      expect(result.subtotalWithIva).toBe(320); // 300 + 20
      expect(result.total).toBe(320);
    });

    it('should calculate correctly for mixed IVA included/not included', () => {
      const products: Product[] = [
        {
          id: '1',
          name: 'Product A',
          sku: 'A-001',
          sale_price: 100,
          cost_price: 50,
          stock_quantity: 100,
          is_active: true,
          iva_rate: 10,
          iva_included: false,
        } as Product,
        {
          id: '2',
          name: 'Product B',
          sku: 'B-001',
          sale_price: 110,
          cost_price: 50,
          stock_quantity: 100,
          is_active: true,
          iva_rate: 10,
          iva_included: true,
        } as Product,
      ];

      const cart: CartItem[] = [
        {
          product_id: '1',
          product_name: 'Product A',
          quantity: 1,
          price: 100,
          total: 100,
        },
        {
          product_id: '2',
          product_name: 'Product B',
          quantity: 1,
          price: 110,
          total: 110,
        },
      ];

      const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT');

      expect(result.subtotal).toBeCloseTo(200, 2); // 100 + 100
      expect(result.taxAmount).toBeCloseTo(20, 2); // 10 + 10
      expect(result.subtotalWithIva).toBeCloseTo(220, 2); // 110 + 110
      expect(result.total).toBeCloseTo(220, 2);
    });
  });

  describe('calculateCartWithIva - Tax Disabled', () => {
    it('should not apply tax when globally disabled', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 100,
        cost_price: 50,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 1,
        price: 100,
        total: 100,
      }];

      const config = {
        storeSettings: {
          taxEnabled: false,
          taxRate: 0.10,
          taxIncludedInPrices: false,
        },
      };

      const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT', config);

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(0);
      expect(result.subtotalWithIva).toBe(100);
      expect(result.total).toBe(100);
    });

    it('should not apply tax to non-taxable products', () => {
      const product: Product = {
        id: '1',
        name: 'Non-taxable Product',
        sku: 'TEST-001',
        sale_price: 100,
        cost_price: 50,
        stock_quantity: 100,
        is_active: true,
        is_taxable: false,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Non-taxable Product',
        quantity: 1,
        price: 100,
        total: 100,
      }];

      const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(0);
      expect(result.subtotalWithIva).toBe(100);
      expect(result.total).toBe(100);
    });
  });

  describe('calculateCartWithIva - Rounding Edge Cases', () => {
    it('should handle prices with many decimal places', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 19.955,
        cost_price: 10,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 3,
        price: 19.955,
        total: 59.865,
      }];

      const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

      // All values should be rounded to 2 decimal places
      expect(result.subtotal).toBeCloseTo(59.87, 2);
      expect(result.taxAmount).toBeCloseTo(5.99, 2);
      expect(result.subtotalWithIva).toBeCloseTo(65.86, 2);
      expect(result.total).toBeCloseTo(65.86, 2);
    });

    it('should handle very small amounts', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        sale_price: 0.01,
        cost_price: 0.005,
        stock_quantity: 100,
        is_active: true,
        iva_rate: 10,
        iva_included: false,
      } as Product;

      const cart: CartItem[] = [{
        product_id: '1',
        product_name: 'Test Product',
        quantity: 1,
        price: 0.01,
        total: 0.01,
      }];

      const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

      expect(result.subtotal).toBe(0.01);
      expect(result.taxAmount).toBeCloseTo(0, 2);
      expect(result.subtotalWithIva).toBeCloseTo(0.01, 2);
      expect(result.total).toBeCloseTo(0.01, 2);
    });
  });

  describe('calculateCartWithIva - Product Not Found', () => {
    it('should handle missing product gracefully', () => {
      const cart: CartItem[] = [{
        product_id: 'non-existent',
        product_name: 'Missing Product',
        quantity: 1,
        price: 100,
        total: 100,
      }];

      // Product not in products array
      const result = calculateCartWithIva(cart, [], 0, 'FIXED_AMOUNT');

      // Should use default tax rate
      expect(result.subtotal).toBeCloseTo(100, 2);
      expect(result.taxAmount).toBeCloseTo(10, 2); // Default 10%
      expect(result.subtotalWithIva).toBeCloseTo(110, 2);
    });
  });
});
