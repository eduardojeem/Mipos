/**
 * Property-Based Tests for Cart Management
 * 
 * These tests verify universal properties of cart operations using fast-check.
 * Each test runs 100+ iterations with randomly generated inputs to ensure
 * correctness across all possible scenarios.
 * 
 * @see .kiro/specs/pos-audit/design.md - Cart Management Properties
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../useCart';
import type { Product, Customer } from '@/types';

// Mock toast
jest.mock('@/lib/toast', () => ({
  toast: {
    show: jest.fn(),
  },
}));

// Mock stock config
jest.mock('@/lib/pos/stock-config', () => ({
  useStockConfig: () => ({
    config: {
      allowNegativeStock: false,
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
    },
  }),
  validateStockAvailability: (stock: number, quantity: number) => ({
    valid: stock >= quantity,
    message: stock < quantity ? `Solo hay ${stock} unidades disponibles` : '',
  }),
}));

// Arbitraries for generating test data
const productArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  sku: fc.string({ minLength: 1, maxLength: 20 }),
  sale_price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  wholesale_price: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(9000), noNaN: true }), { nil: null }),
  stock_quantity: fc.integer({ min: 0, max: 1000 }),
  min_stock: fc.integer({ min: 0, max: 50 }),
  is_active: fc.constant(true),
  category_id: fc.uuid(),
  cost_price: fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }),
  created_at: fc.constant(new Date().toISOString()),
  updated_at: fc.constant(new Date().toISOString()),
});

const customerArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  customer_type: fc.constantFrom('RETAIL' as const, 'WHOLESALE' as const),
  email: fc.option(fc.emailAddress(), { nil: null }),
  phone: fc.option(fc.string({ minLength: 8, maxLength: 15 }), { nil: null }),
});

describe('Cart Management - Property-Based Tests', () => {
  describe('Property 1: Adding products increases cart size', () => {
    /**
     * Feature: pos-audit
     * Property: Adding a product should increase cart size by 1 (or increase quantity if exists)
     * Validates: Requirements 1.1
     */
    it('should increase cart size when adding new products', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            // Ensure all products have sufficient stock
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            const initialLength = result.current.cart.length;

            // Add first product
            act(() => {
              result.current.addToCart(productsWithStock[0], 1);
            });

            const newLength = result.current.cart.length;

            // Cart size should increase by 1
            expect(newLength).toBe(initialLength + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increase quantity when adding existing product', () => {
      fc.assert(
        fc.property(
          productArbitrary,
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (product, firstQuantity, secondQuantity) => {
            const productWithStock = {
              ...product,
              stock_quantity: 100,
            };

            const { result } = renderHook(() =>
              useCart({
                products: [productWithStock],
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add product first time
            act(() => {
              result.current.addToCart(productWithStock, firstQuantity);
            });

            const cartLengthAfterFirst = result.current.cart.length;

            // Add same product again
            act(() => {
              result.current.addToCart(productWithStock, secondQuantity);
            });

            const cartLengthAfterSecond = result.current.cart.length;
            const item = result.current.cart.find(i => i.product_id === product.id);

            // Cart length should remain the same
            expect(cartLengthAfterSecond).toBe(cartLengthAfterFirst);

            // Quantity should be sum of both additions
            expect(item?.quantity).toBe(firstQuantity + secondQuantity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Quantity updates respect stock limits', () => {
    /**
     * Feature: pos-audit
     * Property: Updating quantity should not exceed available stock
     * Validates: Requirements 1.2
     */
    it('should prevent quantity updates that exceed stock', () => {
      fc.assert(
        fc.property(
          fc.record({
            product: productArbitrary,
            requestedQuantity: fc.integer({ min: 1, max: 200 }),
          }),
          ({ product, requestedQuantity }) => {
            const stockQuantity = fc.sample(fc.integer({ min: 1, max: 100 }), 1)[0];
            const productWithStock = {
              ...product,
              stock_quantity: stockQuantity,
            };

            const { result } = renderHook(() =>
              useCart({
                products: [productWithStock],
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add product to cart first
            act(() => {
              result.current.addToCart(productWithStock, 1);
            });

            const initialQuantity = result.current.cart[0]?.quantity || 0;

            // Try to update quantity
            act(() => {
              result.current.updateQuantity(product.id, requestedQuantity);
            });

            const finalQuantity = result.current.cart[0]?.quantity || 0;

            // If requested quantity exceeds stock, quantity should not change
            if (requestedQuantity > stockQuantity) {
              expect(finalQuantity).toBe(initialQuantity);
            } else {
              expect(finalQuantity).toBe(requestedQuantity);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove item when quantity is set to 0 or negative', () => {
      fc.assert(
        fc.property(
          productArbitrary,
          fc.integer({ min: -10, max: 0 }),
          (product, zeroOrNegative) => {
            const productWithStock = {
              ...product,
              stock_quantity: 100,
            };

            const { result } = renderHook(() =>
              useCart({
                products: [productWithStock],
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add product to cart
            act(() => {
              result.current.addToCart(productWithStock, 5);
            });

            expect(result.current.cart.length).toBe(1);

            // Update to 0 or negative
            act(() => {
              result.current.updateQuantity(product.id, zeroOrNegative);
            });

            // Item should be removed
            expect(result.current.cart.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Removing products decreases cart size', () => {
    /**
     * Feature: pos-audit
     * Property: Removing a product should decrease cart size and recalculate totals
     * Validates: Requirements 1.3
     */
    it('should decrease cart size when removing products', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 2, maxLength: 10 }),
          (products) => {
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add all products to cart
            act(() => {
              productsWithStock.forEach(p => {
                result.current.addToCart(p, 1);
              });
            });

            const initialLength = result.current.cart.length;
            const productToRemove = productsWithStock[0];

            // Remove first product
            act(() => {
              result.current.removeFromCart(productToRemove.id);
            });

            const newLength = result.current.cart.length;

            // Cart size should decrease by 1
            expect(newLength).toBe(initialLength - 1);

            // Product should not exist in cart
            const removedItem = result.current.cart.find(
              item => item.product_id === productToRemove.id
            );
            expect(removedItem).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate totals after removing product', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 2, maxLength: 5 }),
          (products) => {
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add all products
            act(() => {
              productsWithStock.forEach(p => {
                result.current.addToCart(p, 2);
              });
            });

            const totalBeforeRemoval = result.current.cartTotals.subtotal;
            const productToRemove = productsWithStock[0];
            const expectedReduction = productToRemove.sale_price * 2;

            // Remove first product
            act(() => {
              result.current.removeFromCart(productToRemove.id);
            });

            const totalAfterRemoval = result.current.cartTotals.subtotal;

            // Total should decrease by removed product's total
            const actualReduction = totalBeforeRemoval - totalAfterRemoval;
            expect(Math.abs(actualReduction - expectedReduction)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Clearing cart removes all items', () => {
    /**
     * Feature: pos-audit
     * Property: Clearing cart should remove all items and reset totals to 0
     * Validates: Requirements 1.5
     */
    it('should remove all items when clearing cart', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 20 }),
          (products) => {
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add all products to cart
            act(() => {
              productsWithStock.forEach(p => {
                result.current.addToCart(p, fc.sample(fc.integer({ min: 1, max: 5 }), 1)[0]);
              });
            });

            // Verify cart has items
            expect(result.current.cart.length).toBeGreaterThan(0);

            // Clear cart
            act(() => {
              result.current.clearCart();
            });

            // Cart should be empty
            expect(result.current.cart.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset all totals to 0 when clearing cart', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add products
            act(() => {
              productsWithStock.forEach(p => {
                result.current.addToCart(p, 2);
              });
            });

            // Verify totals are not 0
            expect(result.current.cartTotals.subtotal).toBeGreaterThan(0);
            expect(result.current.cartTotals.total).toBeGreaterThan(0);

            // Clear cart
            act(() => {
              result.current.clearCart();
            });

            // All totals should be 0
            expect(result.current.cartTotals.subtotal).toBe(0);
            expect(result.current.cartTotals.discountAmount).toBe(0);
            expect(result.current.cartTotals.taxAmount).toBe(0);
            expect(result.current.cartTotals.total).toBe(0);
            expect(result.current.cartTotals.itemCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - clearing empty cart should remain empty', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 5 }),
          (products) => {
            const { result } = renderHook(() =>
              useCart({
                products,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Clear empty cart
            act(() => {
              result.current.clearCart();
            });

            expect(result.current.cart.length).toBe(0);

            // Clear again
            act(() => {
              result.current.clearCart();
            });

            // Should still be empty
            expect(result.current.cart.length).toBe(0);
            expect(result.current.cartTotals.total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Additional Cart Properties', () => {
    it('cart operations should maintain data integrity', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add products
            act(() => {
              productsWithStock.forEach(p => {
                result.current.addToCart(p, 3);
              });
            });

            // Verify each cart item has required fields
            result.current.cart.forEach(item => {
              expect(item.product_id).toBeDefined();
              expect(item.product_name).toBeDefined();
              expect(item.price).toBeGreaterThan(0);
              expect(item.quantity).toBeGreaterThan(0);
              expect(item.total).toBeGreaterThan(0);
              expect(item.product).toBeDefined();

              // Total should equal price * quantity (with rounding tolerance)
              const expectedTotal = item.price * item.quantity;
              expect(Math.abs(item.total - expectedTotal)).toBeLessThan(0.01);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('cart should not contain duplicate product IDs', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
          (products) => {
            const productsWithStock = products.map(p => ({
              ...p,
              stock_quantity: 100,
            }));

            const { result } = renderHook(() =>
              useCart({
                products: productsWithStock,
                selectedCustomer: null,
                isWholesaleMode: false,
                discount: 0,
              })
            );

            // Add products multiple times
            act(() => {
              productsWithStock.forEach(p => {
                result.current.addToCart(p, 1);
                result.current.addToCart(p, 1); // Add again
              });
            });

            // Extract all product IDs
            const productIds = result.current.cart.map(item => item.product_id);

            // Check for duplicates
            const uniqueIds = new Set(productIds);
            expect(uniqueIds.size).toBe(productIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
