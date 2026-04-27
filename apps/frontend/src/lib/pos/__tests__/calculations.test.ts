import { describe, it, expect } from 'vitest';
import { calculateCartWithIva, type ExtendedProduct } from '../calculations';
import type { CartItem } from '@/hooks/useCart';

describe('calculateCartWithIva', () => {
  describe('IVA incluido en precio', () => {
    it('debe calcular correctamente con IVA incluido al 10%', () => {
      const cart: CartItem[] = [
        { product_id: '1', product_name: 'Product 1', quantity: 1, price: 110, total: 110 }
      ];
      const products: ExtendedProduct[] = [
        { id: '1', name: 'Product 1', sku: 'P1', cost_price: 50, sale_price: 110, category_id: 'c1', is_active: true, created_at: '', updated_at: '', iva_rate: 10, iva_included: true, is_taxable: true } as any
      ];

      const config = { storeSettings: { currency: 'USD' } } as any;
      const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT', config);

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(10);
      expect(result.subtotalWithIva).toBe(110);
      expect(result.total).toBe(110);
    });
  });

  describe('IVA NO incluido en precio', () => {
    it('debe calcular correctamente con IVA NO incluido al 10%', () => {
      const cart: CartItem[] = [
        { product_id: '1', product_name: 'Product 1', quantity: 1, price: 100, total: 100 }
      ];
      const products: ExtendedProduct[] = [
        { id: '1', name: 'Product 1', sku: 'P1', cost_price: 50, sale_price: 100, category_id: 'c1', is_active: true, created_at: '', updated_at: '', iva_rate: 10, iva_included: false, is_taxable: true } as any
      ];

      const config = { storeSettings: { currency: 'USD' } } as any;
      const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT', config);

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(10);
      expect(result.subtotalWithIva).toBe(110);
      expect(result.total).toBe(110);
    });
  });

  describe('Descuentos Proporcionales (Bug Fix)', () => {
    it('debe reducir el IVA proporcionalmente cuando hay IVA incluido y un descuento del 10%', () => {
      const cart: CartItem[] = [
        { product_id: '1', product_name: 'Product 1', quantity: 1, price: 110, total: 110 }
      ];
      const products: ExtendedProduct[] = [
        { id: '1', name: 'Product 1', sku: 'P1', cost_price: 50, sale_price: 110, category_id: 'c1', is_active: true, created_at: '', updated_at: '', iva_rate: 10, iva_included: true, is_taxable: true } as any
      ];

      const config = { storeSettings: { currency: 'USD' } } as any;
      const result = calculateCartWithIva(cart, products, 10, 'PERCENTAGE', config);

      // 110 original -> 10% descuento = 99 final
      // 99 final / 1.1 = 90 base, 9 IVA
      expect(result.total).toBe(99);
      expect(result.taxAmount).toBe(9);
      expect(result.subtotal).toBe(90);
      expect(result.discountAmount).toBe(11); // 110 - 99 = 11
    });

    it('debe reducir el IVA proporcionalmente cuando hay IVA NO incluido y un descuento fijo', () => {
      const cart: CartItem[] = [
        { product_id: '1', product_name: 'Product 1', quantity: 1, price: 100, total: 100 }
      ];
      const products: ExtendedProduct[] = [
        { id: '1', name: 'Product 1', sku: 'P1', cost_price: 50, sale_price: 100, category_id: 'c1', is_active: true, created_at: '', updated_at: '', iva_rate: 10, iva_included: false, is_taxable: true } as any
      ];

      // Base 100, IVA 10, Total 110
      // Aplicamos descuento fijo de 11 sobre el total
      const config = { storeSettings: { currency: 'USD' } } as any;
      const result = calculateCartWithIva(cart, products, 11, 'FIXED_AMOUNT', config);

      // Final 110 - 11 = 99
      // 99 final / 1.1 = 90 base, 9 IVA
      expect(result.total).toBe(99);
      expect(result.taxAmount).toBe(9);
      expect(result.subtotal).toBe(90);
      expect(result.discountAmount).toBe(11);
    });
  });

  describe('Redondeo PYG', () => {
    it('debe redondear al múltiplo de 50 más cercano para PYG', () => {
      const cart: CartItem[] = [
        { product_id: '1', product_name: 'Product 1', quantity: 1, price: 1024, total: 1024 }
      ];
      const products: ExtendedProduct[] = [
        { id: '1', name: 'Product 1', sku: 'P1', cost_price: 500, sale_price: 1024, category_id: 'c1', is_active: true, created_at: '', updated_at: '', iva_rate: 10, iva_included: true, is_taxable: true } as any
      ];

      const config = { storeSettings: { currency: 'PYG' } } as any;
      const result = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT', config);

      // 1024 redondeado a 50 -> 1000
      expect(result.total).toBe(1000);
      
      const result2 = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT', { storeSettings: { currency: 'PYG' } } as any);
      expect(result2.total).toBe(1000); 
      
      // 1026 -> 1050
      const cart2: CartItem[] = [
        { product_id: '1', product_name: 'Product 1', quantity: 1, price: 1026, total: 1026 }
      ];
      const result3 = calculateCartWithIva(cart2, products, 0, 'FIXED_AMOUNT', { storeSettings: { currency: 'PYG' } } as any);
      expect(result3.total).toBe(1050);
    });
  });
});
