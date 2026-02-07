import { describe, it, expect } from 'vitest';
import { calculateCartWithIva } from '../calculations';
import type { CartItem } from '@/hooks/useCart';
import type { Product } from '@/types';

describe('calculateCartWithIva', () => {
  const mockCartItems: CartItem[] = [
    {
      product_id: '1',
      product_name: 'Product 1',
      price: 100,
      quantity: 2,
      total: 200,
    },
    {
      product_id: '2',
      product_name: 'Product 2',
      price: 50,
      quantity: 1,
      total: 50,
    },
  ];

  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Product 1',
      sale_price: 100,
      iva_rate: 10,
      iva_included: false,
    } as Product,
    {
      id: '2',
      name: 'Product 2',
      sale_price: 50,
      iva_rate: 10,
      iva_included: false,
    } as Product,
  ];

  it('calculates subtotal correctly', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      0,
      'FIXED_AMOUNT'
    );

    expect(result.subtotal).toBe(250); // 200 + 50
  });

  it('calculates IVA correctly', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      0,
      'FIXED_AMOUNT'
    );

    expect(result.taxAmount).toBe(25); // 10% of 250
  });

  it('applies percentage discount correctly', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      10, // 10% discount
      'PERCENTAGE'
    );

    expect(result.discountAmount).toBeCloseTo(27.5, 1); // 10% of (250 + 25)
  });

  it('applies fixed amount discount correctly', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      50, // $50 discount
      'FIXED_AMOUNT'
    );

    expect(result.discountAmount).toBe(50);
  });

  it('calculates final total correctly with discount', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      10,
      'PERCENTAGE'
    );

    const expectedTotal = 250 + 25 - result.discountAmount;
    expect(result.total).toBeCloseTo(expectedTotal, 1);
  });

  it('handles IVA included in price', () => {
    const productsWithIvaIncluded: Product[] = [
      {
        id: '1',
        name: 'Product 1',
        sale_price: 110, // Price includes IVA
        iva_rate: 10,
        iva_included: true,
      } as Product,
    ];

    const cartWithIvaIncluded: CartItem[] = [
      {
        product_id: '1',
        product_name: 'Product 1',
        price: 110,
        quantity: 1,
        total: 110,
      },
    ];

    const result = calculateCartWithIva(
      cartWithIvaIncluded,
      productsWithIvaIncluded,
      0,
      'FIXED_AMOUNT'
    );

    expect(result.subtotalWithIva).toBe(110);
    expect(result.subtotal).toBeCloseTo(100, 1); // 110 / 1.1
    expect(result.taxAmount).toBeCloseTo(10, 1);
  });

  it('handles non-taxable products', () => {
    const nonTaxableProducts: Product[] = [
      {
        id: '1',
        name: 'Product 1',
        sale_price: 100,
        is_taxable: false,
      } as Product,
    ];

    const result = calculateCartWithIva(
      [mockCartItems[0]],
      nonTaxableProducts,
      0,
      'FIXED_AMOUNT'
    );

    expect(result.taxAmount).toBe(0);
    expect(result.subtotal).toBe(200);
    expect(result.total).toBe(200);
  });

  it('clamps total to 0 if discount exceeds subtotal', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      1000, // Discount larger than total
      'FIXED_AMOUNT'
    );

    expect(result.total).toBe(0);
  });

  it('counts items correctly', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      0,
      'FIXED_AMOUNT'
    );

    expect(result.itemCount).toBe(3); // 2 + 1
  });

  it('rounds values to 2 decimal places', () => {
    const result = calculateCartWithIva(
      mockCartItems,
      mockProducts,
      33.333,
      'FIXED_AMOUNT'
    );

    // All values should be rounded to 2 decimals
    expect(result.subtotal % 0.01).toBeCloseTo(0, 10);
    expect(result.taxAmount % 0.01).toBeCloseTo(0, 10);
    expect(result.total % 0.01).toBeCloseTo(0, 10);
  });
});
