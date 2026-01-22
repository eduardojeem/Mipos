/**
 * Property-Based Tests for POS Calculation Functions
 * Feature: pos-audit
 * 
 * These tests verify universal properties that should hold for all valid inputs
 * using fast-check for property-based testing with 100+ iterations per test.
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { calculateCartWithIva, type DiscountType } from '../calculations';
import type { CartItem } from '@/hooks/useCart';
import type { Product } from '@/types';

// Arbitraries (generators) for test data
const productArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  sku: fc.string({ minLength: 1, maxLength: 20 }),
  sale_price: fc.float({ min: 0.01, max: 10000, noNaN: true }),
  cost_price: fc.float({ min: 0.01, max: 5000, noNaN: true }),
  stock_quantity: fc.integer({ min: 0, max: 1000 }),
  is_active: fc.constant(true),
  iva_rate: fc.option(fc.float({ min: 0, max: 30 }), { nil: undefined }),
  iva_included: fc.option(fc.boolean(), { nil: undefined }),
  is_taxable: fc.option(fc.boolean(), { nil: undefined }),
});

const cartItemArbitrary = (productId: string, price: number) =>
  fc.record({
    product_id: fc.constant(productId),
    product_name: fc.string({ minLength: 1 }),
    quantity: fc.integer({ min: 1, max: 100 }),
    price: fc.constant(price),
    total: fc.constant(0), // Will be calculated
  }).map(item => ({
    ...item,
    total: item.price * item.quantity,
  }));

describe('POS Calculations - Property-Based Tests', () => {
  describe('calculateCartWithIva - IVA Properties', () => {
    /**
     * Feature: pos-audit, Property 25: IVA is calculated on all products
     * Validates: Requirements 9.1
     */
    it('Property 25: IVA should be calculated using configured rate', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            // Create cart items from products
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const config = {
              storeSettings: {
                taxEnabled: true,
                taxRate: 0.10, // 10% Paraguay
                taxIncludedInPrices: false,
              },
            };

            const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT', config);

            // Property: Tax amount should be approximately 10% of subtotal
            const expectedTax = result.subtotal * 0.10;
            const tolerance = 0.02; // Allow 2 cent tolerance for rounding

            expect(Math.abs(result.taxAmount - expectedTax)).toBeLessThanOrEqual(tolerance);
            
            // Property: Subtotal with IVA should equal subtotal + tax
            expect(Math.abs(result.subtotalWithIva - (result.subtotal + result.taxAmount))).toBeLessThanOrEqual(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: pos-audit, Property 26: IVA recalculates after discounts
     * Validates: Requirements 9.2
     */
    it('Property 26: Total should reflect discount applied to subtotal with IVA', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 5 }),
          fc.float({ min: 0, max: 50 }), // Discount percentage
          (products, discountPercent) => {
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const result = calculateCartWithIva(cart, products, discountPercent, 'PERCENTAGE');

            // Property: Discount should be applied to subtotal with IVA
            const expectedDiscount = (result.subtotalWithIva * discountPercent) / 100;
            const tolerance = 0.02;

            expect(Math.abs(result.discountAmount - expectedDiscount)).toBeLessThanOrEqual(tolerance);

            // Property: Total should be subtotal with IVA minus discount
            const expectedTotal = Math.max(0, result.subtotalWithIva - result.discountAmount);
            expect(Math.abs(result.total - expectedTotal)).toBeLessThanOrEqual(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: pos-audit, Property 27: Custom IVA rates are respected
     * Validates: Requirements 9.4
     */
    it('Property 27: Products with custom IVA rates should use those rates', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 1000 }), // Product price
          fc.float({ min: 0, max: 30 }), // Custom IVA rate
          (price, customIvaRate) => {
            const product: Product = {
              id: '1',
              name: 'Test Product',
              sku: 'TEST-001',
              sale_price: price,
              cost_price: price * 0.5,
              stock_quantity: 100,
              is_active: true,
              iva_rate: customIvaRate,
              iva_included: false,
            } as Product;

            const cart: CartItem[] = [{
              product_id: '1',
              product_name: 'Test Product',
              quantity: 1,
              price: price,
              total: price,
            }];

            const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

            // Property: Tax should be calculated using custom rate
            const expectedTax = price * (customIvaRate / 100);
            const tolerance = 0.02;

            expect(Math.abs(result.taxAmount - expectedTax)).toBeLessThanOrEqual(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateCartWithIva - Discount Properties', () => {
    /**
     * Feature: pos-audit, Property 11: Percentage discounts are bounded
     * Validates: Requirements 4.1
     */
    it('Property 11: Percentage discount should never exceed 100%', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 5 }),
          fc.float({ min: 0, max: 100 }), // Valid percentage
          (products, discountPercent) => {
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const result = calculateCartWithIva(cart, products, discountPercent, 'PERCENTAGE');

            // Property: Discount amount should not exceed subtotal with IVA
            expect(result.discountAmount).toBeLessThanOrEqual(result.subtotalWithIva + 0.01);

            // Property: Total should never be negative
            expect(result.total).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: pos-audit, Property 12: Fixed discounts don't exceed subtotal
     * Validates: Requirements 4.2
     */
    it('Property 12: Fixed discount should not make total negative', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 5 }),
          fc.float({ min: 0, max: 10000 }), // Any discount amount
          (products, discountAmount) => {
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const result = calculateCartWithIva(cart, products, discountAmount, 'FIXED_AMOUNT');

            // Property: Total should never be negative (clamped to 0)
            expect(result.total).toBeGreaterThanOrEqual(0);

            // Property: If discount exceeds subtotal, total should be 0
            if (discountAmount > result.subtotalWithIva) {
              expect(result.total).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateCartWithIva - Invariant Properties', () => {
    it('Property: Subtotal with IVA should always be >= subtotal without IVA', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT');

            // Property: Adding tax should never decrease the subtotal
            expect(result.subtotalWithIva).toBeGreaterThanOrEqual(result.subtotal - 0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Item count should equal sum of quantities', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            const cart: CartItem[] = products.map((p, i) => ({
              product_id: p.id,
              product_name: p.name,
              quantity: i + 1, // Different quantities
              price: p.sale_price,
              total: p.sale_price * (i + 1),
            }));

            const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT');

            // Property: Item count should be sum of all quantities
            const expectedCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            expect(result.itemCount).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Empty cart should have zero totals', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100 }), // Any discount
          (discount) => {
            const result = calculateCartWithIva([], [], discount, 'PERCENTAGE');

            // Property: All totals should be zero for empty cart
            expect(result.subtotal).toBe(0);
            expect(result.subtotalWithIva).toBe(0);
            expect(result.discountAmount).toBe(0);
            expect(result.taxAmount).toBe(0);
            expect(result.total).toBe(0);
            expect(result.itemCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Rounding should be consistent (2 decimal places)', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 5 }),
          (products) => {
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT');

            // Property: All monetary values should have at most 2 decimal places
            const checkDecimals = (value: number) => {
              const decimals = (value.toString().split('.')[1] || '').length;
              return decimals <= 2;
            };

            expect(checkDecimals(result.subtotal)).toBe(true);
            expect(checkDecimals(result.subtotalWithIva)).toBe(true);
            expect(checkDecimals(result.discountAmount)).toBe(true);
            expect(checkDecimals(result.taxAmount)).toBe(true);
            expect(checkDecimals(result.total)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateCartWithIva - Tax Disabled Properties', () => {
    it('Property: When tax is disabled, subtotal should equal subtotal with IVA', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            const cart: CartItem[] = products.map(p => ({
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              price: p.sale_price,
              total: p.sale_price,
            }));

            const config = {
              storeSettings: {
                taxEnabled: false, // Tax disabled
                taxRate: 0.10,
                taxIncludedInPrices: false,
              },
            };

            const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT', config);

            // Property: When tax is disabled, no tax should be applied
            expect(result.taxAmount).toBe(0);
            expect(result.subtotal).toBe(result.subtotalWithIva);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Non-taxable products should not have tax applied', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 1000 }),
          (price) => {
            const product: Product = {
              id: '1',
              name: 'Non-taxable Product',
              sku: 'TEST-001',
              sale_price: price,
              cost_price: price * 0.5,
              stock_quantity: 100,
              is_active: true,
              is_taxable: false, // Not taxable
            } as Product;

            const cart: CartItem[] = [{
              product_id: '1',
              product_name: 'Non-taxable Product',
              quantity: 1,
              price: price,
              total: price,
            }];

            const result = calculateCartWithIva(cart, [product], 0, 'FIXED_AMOUNT');

            // Property: Non-taxable products should have zero tax
            expect(result.taxAmount).toBe(0);
            expect(result.subtotal).toBe(result.subtotalWithIva);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
