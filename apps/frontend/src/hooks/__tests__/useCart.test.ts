import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../useCart';
import type { Product } from '@/types';

// Mock toast
vi.mock('@/lib/toast', () => ({
  toast: {
    show: vi.fn(),
  },
}));

// Mock stock config
vi.mock('@/lib/pos/stock-config', () => ({
  useStockConfig: () => ({
    config: {
      preventNegativeStock: true,
      warningThreshold: 5,
      autoBlockLowStock: false,
      notificationEnabled: true,
    },
  }),
  validateStockAvailability: (stock: number, quantity: number) => {
    if (stock < quantity) {
      return { valid: false, message: 'Stock insuficiente' };
    }
    return { valid: true };
  },
}));

describe('useCart', () => {
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Product 1',
      sale_price: 100,
      stock_quantity: 10,
      wholesale_price: 80,
      min_wholesale_quantity: 5,
    } as Product,
    {
      id: '2',
      name: 'Product 2',
      sale_price: 50,
      stock_quantity: 5,
    } as Product,
  ];

  const defaultOptions = {
    products: mockProducts,
    selectedCustomer: null,
    isWholesaleMode: false,
    discount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    expect(result.current.cart).toEqual([]);
    expect(result.current.cartTotals.total).toBe(0);
  });

  it('adds product to cart', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    act(() => {
      result.current.addToCart(mockProducts[0], 2);
    });
    
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cart[0].product_id).toBe('1');
  });

  it('updates quantity of existing item', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    act(() => {
      result.current.addToCart(mockProducts[0], 2);
    });
    
    act(() => {
      result.current.updateQuantity('1', 5);
    });
    
    expect(result.current.cart[0].quantity).toBe(5);
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    act(() => {
      result.current.addToCart(mockProducts[0], 2);
    });
    
    act(() => {
      result.current.removeFromCart('1');
    });
    
    expect(result.current.cart).toHaveLength(0);
  });

  it('clears entire cart', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    act(() => {
      result.current.addToCart(mockProducts[0], 2);
      result.current.addToCart(mockProducts[1], 1);
    });
    
    expect(result.current.cart).toHaveLength(2);
    
    act(() => {
      result.current.clearCart();
    });
    
    expect(result.current.cart).toHaveLength(0);
  });

  it('calculates cart totals correctly', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    act(() => {
      result.current.addToCart(mockProducts[0], 2); // 2 * 100 = 200
      result.current.addToCart(mockProducts[1], 1); // 1 * 50 = 50
    });
    
    expect(result.current.cartTotals.subtotal).toBeGreaterThan(0);
    expect(result.current.cartTotals.itemCount).toBe(3);
  });

  it('applies wholesale price when in wholesale mode', () => {
    const { result } = renderHook(() =>
      useCart({ ...defaultOptions, isWholesaleMode: true })
    );
    
    act(() => {
      result.current.addToCart(mockProducts[0], 5); // Meets min wholesale quantity
    });
    
    // Wholesale price should be applied (80 instead of 100)
    expect(result.current.cart[0].price).toBe(80);
  });

  it('prevents adding more than available stock', () => {
    const { result } = renderHook(() => useCart(defaultOptions));
    
    act(() => {
      result.current.addToCart(mockProducts[1], 10); // Only 5 available
    });
    
    // Should not add to cart due to insufficient stock
    expect(result.current.cart).toHaveLength(0);
  });

  it('applies discount to cart total', () => {
    const { result } = renderHook(() =>
      useCart({ ...defaultOptions, discount: 10 })
    );
    
    act(() => {
      result.current.addToCart(mockProducts[0], 1); // 100
    });
    
    expect(result.current.cartTotals.discountAmount).toBeGreaterThan(0);
  });
});
