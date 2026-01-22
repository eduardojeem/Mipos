/**
 * Unit Tests for Cart Management
 * 
 * These tests verify specific scenarios and edge cases for cart operations.
 * 
 * @see .kiro/specs/pos-audit/design.md - Cart Management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
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

describe('Cart Management - Unit Tests', () => {
  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Shampoo Test',
    sku: 'SHP-001',
    sale_price: 100,
    wholesale_price: 80,
    stock_quantity: 50,
    min_stock: 10,
    is_active: true,
    category_id: 'cat-1',
    cost_price: 50,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const mockProducts: Product[] = [
    mockProduct,
    {
      ...mockProduct,
      id: 'prod-2',
      name: 'Conditioner Test',
      sku: 'CND-001',
      sale_price: 120,
      stock_quantity: 30,
    },
  ];

  describe('addToCart', () => {
    it('should add a new product to empty cart', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      expect(result.current.cart.length).toBe(1);
      expect(result.current.cart[0].product_id).toBe('prod-1');
      expect(result.current.cart[0].quantity).toBe(1);
      expect(result.current.cart[0].price).toBe(100);
    });

    it('should add product with custom quantity', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 5);
      });

      expect(result.current.cart[0].quantity).toBe(5);
      expect(result.current.cart[0].total).toBe(500);
    });

    it('should increase quantity when adding duplicate product', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      act(() => {
        result.current.addToCart(mockProduct, 3);
      });

      expect(result.current.cart.length).toBe(1);
      expect(result.current.cart[0].quantity).toBe(5);
      expect(result.current.cart[0].total).toBe(500);
    });

    it('should prevent adding product with insufficient stock', () => {
      const lowStockProduct: Product = {
        ...mockProduct,
        stock_quantity: 2,
      };

      const { result } = renderHook(() =>
        useCart({
          products: [lowStockProduct],
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(lowStockProduct, 5);
      });

      // Cart should remain empty
      expect(result.current.cart.length).toBe(0);
    });

    it('should prevent adding more when cart quantity would exceed stock', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      // Add 45 units (stock is 50)
      act(() => {
        result.current.addToCart(mockProduct, 45);
      });

      expect(result.current.cart[0].quantity).toBe(45);

      // Try to add 10 more (would exceed stock of 50)
      act(() => {
        result.current.addToCart(mockProduct, 10);
      });

      // Quantity should remain 45
      expect(result.current.cart[0].quantity).toBe(45);
    });

    it('should add multiple different products', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
        result.current.addToCart(mockProducts[1], 3);
      });

      expect(result.current.cart.length).toBe(2);
      expect(result.current.cart[0].product_id).toBe('prod-1');
      expect(result.current.cart[1].product_id).toBe('prod-2');
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity of existing product', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      act(() => {
        result.current.updateQuantity('prod-1', 5);
      });

      expect(result.current.cart[0].quantity).toBe(5);
      expect(result.current.cart[0].total).toBe(500);
    });

    it('should remove product when quantity is set to 0', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      act(() => {
        result.current.updateQuantity('prod-1', 0);
      });

      expect(result.current.cart.length).toBe(0);
    });

    it('should remove product when quantity is negative', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      act(() => {
        result.current.updateQuantity('prod-1', -5);
      });

      expect(result.current.cart.length).toBe(0);
    });

    it('should prevent updating quantity beyond stock', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 10);
      });

      // Try to update to quantity exceeding stock (50)
      act(() => {
        result.current.updateQuantity('prod-1', 100);
      });

      // Quantity should remain unchanged
      expect(result.current.cart[0].quantity).toBe(10);
    });

    it('should handle updating non-existent product gracefully', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      // Try to update non-existent product
      act(() => {
        result.current.updateQuantity('non-existent-id', 5);
      });

      // Cart should remain unchanged
      expect(result.current.cart.length).toBe(1);
      expect(result.current.cart[0].product_id).toBe('prod-1');
    });
  });

  describe('removeFromCart', () => {
    it('should remove product from cart', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      act(() => {
        result.current.removeFromCart('prod-1');
      });

      expect(result.current.cart.length).toBe(0);
    });

    it('should remove only specified product when multiple products exist', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
        result.current.addToCart(mockProducts[1], 3);
      });

      act(() => {
        result.current.removeFromCart('prod-1');
      });

      expect(result.current.cart.length).toBe(1);
      expect(result.current.cart[0].product_id).toBe('prod-2');
    });

    it('should handle removing non-existent product gracefully', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      // Try to remove non-existent product
      act(() => {
        result.current.removeFromCart('non-existent-id');
      });

      // Cart should remain unchanged
      expect(result.current.cart.length).toBe(1);
      expect(result.current.cart[0].product_id).toBe('prod-1');
    });
  });

  describe('clearCart', () => {
    it('should remove all products from cart', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
        result.current.addToCart(mockProducts[1], 3);
      });

      expect(result.current.cart.length).toBe(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart.length).toBe(0);
    });

    it('should reset all totals to 0', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
        result.current.addToCart(mockProducts[1], 3);
      });

      expect(result.current.cartTotals.subtotal).toBeGreaterThan(0);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cartTotals.subtotal).toBe(0);
      expect(result.current.cartTotals.discountAmount).toBe(0);
      expect(result.current.cartTotals.taxAmount).toBe(0);
      expect(result.current.cartTotals.total).toBe(0);
      expect(result.current.cartTotals.itemCount).toBe(0);
    });

    it('should handle clearing empty cart', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
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
      expect(result.current.cartTotals.total).toBe(0);
    });
  });

  describe('cartTotals', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2); // 100 * 2 = 200
        result.current.addToCart(mockProducts[1], 3); // 120 * 3 = 360
      });

      expect(result.current.cartTotals.subtotal).toBe(560);
    });

    it('should calculate tax correctly', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 1); // 100
      });

      // Assuming IVA_RATE is 0.16 (16%)
      const expectedTax = 100 * 0.16;
      expect(result.current.cartTotals.taxAmount).toBeCloseTo(expectedTax, 2);
    });

    it('should calculate total with tax', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 1); // 100
      });

      // Assuming IVA_RATE is 0.16 (16%)
      const expectedTotal = 100 + (100 * 0.16);
      expect(result.current.cartTotals.total).toBeCloseTo(expectedTotal, 2);
    });

    it('should count total items correctly', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProducts[0], 2);
        result.current.addToCart(mockProducts[1], 3);
      });

      expect(result.current.cartTotals.itemCount).toBe(5);
    });
  });

  describe('Wholesale Mode', () => {
    it('should use wholesale price when wholesale mode is active', () => {
      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: null,
          isWholesaleMode: true,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      // Should use wholesale_price (80) instead of sale_price (100)
      expect(result.current.cart[0].price).toBe(80);
    });

    it('should use regular price when product has no wholesale price', () => {
      const productWithoutWholesale: Product = {
        ...mockProduct,
        wholesale_price: null,
      };

      const { result } = renderHook(() =>
        useCart({
          products: [productWithoutWholesale],
          selectedCustomer: null,
          isWholesaleMode: true,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(productWithoutWholesale, 1);
      });

      // Should use sale_price (100) since no wholesale price
      expect(result.current.cart[0].price).toBe(100);
    });
  });

  describe('Customer Selection', () => {
    it('should apply wholesale customer discount', () => {
      const wholesaleCustomer: Customer = {
        id: 'cust-1',
        name: 'Wholesale Customer',
        customer_type: 'WHOLESALE',
        wholesale_discount: 10, // 10% discount
      };

      const { result } = renderHook(() =>
        useCart({
          products: mockProducts,
          selectedCustomer: wholesaleCustomer,
          isWholesaleMode: false,
          discount: 0,
        })
      );

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      // Price should be 100 - 10% = 90
      expect(result.current.cart[0].price).toBe(90);
      expect(result.current.cart[0].discount).toBe(10);
    });
  });
});
