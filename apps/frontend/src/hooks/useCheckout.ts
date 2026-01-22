import { useCallback, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { type Product, type Customer } from '@/types';
import type { CartItem } from '@/hooks/useCart';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { useStore } from '@/store';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

export interface CheckoutResult {
  subtotalWithoutIva: number;
  totalIva: number;
  subtotalWithIva: number;
  discountAmount: number;
  finalTotal: number;
}

interface UseCheckoutParams {
  products: Product[];
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  notes: string;
  selectedCustomer: Customer | null;
}

export function useCheckout({ products, discount, discountType, paymentMethod, notes, selectedCustomer }: UseCheckoutParams) {
  const [processing, setProcessing] = useState(false);
  const { config } = useBusinessConfig();

  const processSale = useCallback(async (cart: CartItem[]): Promise<CheckoutResult | null> => {
    if (!cart || cart.length === 0) {
      toast.show({
        title: 'Carrito vacío',
        description: 'Agrega productos al carrito antes de procesar la venta',
        variant: 'destructive',
      });
      return null;
    }

    setProcessing(true);
    try {
      // Calcular totales con IVA por producto (utilidad centralizada)
      const totals = calculateCartWithIva(cart, products, discount, discountType, config);

      const { couponCode, couponDiscountType } = useStore.getState();

      const saleData: any = {
        customer_id: selectedCustomer?.id ?? null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: 0,
        })),
        payment_method: paymentMethod,
        discount_amount: totals.discountAmount,
        discount_type: discountType,
        tax_amount: totals.taxAmount,
        notes: couponCode ? `${notes || ''}`.trim() : notes,
      };

      // Adjuntar metadata de cupón para el backend/futuro
      if (couponCode) {
        saleData.coupon_code = couponCode;
        if (couponDiscountType) {
          saleData.coupon_discount_type = couponDiscountType;
        }
      }

      await api.post('/sales', saleData, {
        // Limitar reintentos a 2 para operación crítica de venta
        _maxRetries: 2,
        headers: { 'X-Request-Name': 'create-sale' },
      } as any);

      return {
        subtotalWithoutIva: totals.subtotal,
        totalIva: totals.taxAmount,
        subtotalWithIva: totals.subtotalWithIva,
        discountAmount: totals.discountAmount,
        finalTotal: totals.total,
      };
    } catch (error: any) {
      console.error('Error processing sale:', error);
      // Mensaje enriquecido según origen del error
      const getMsg = (await import('@/lib/api')).getErrorMessage;
      const message = getMsg(error);
      toast.show({
        title: 'Error al procesar la venta',
        description: message || 'Ocurrió un problema procesando la venta',
        variant: 'destructive',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  }, [products, discount, discountType, paymentMethod, notes, selectedCustomer, config]);

  // Nuevo: procesar venta con descuentos/Tipo proporcionados (evita carrera de estado)
  const processSaleWithOverrides = useCallback(async (
    cart: CartItem[],
    overrideDiscount: number,
    overrideType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  ): Promise<CheckoutResult | null> => {
    if (!cart || cart.length === 0) {
      toast.show({
        title: 'Carrito vacío',
        description: 'Agrega productos al carrito antes de procesar la venta',
        variant: 'destructive',
      });
      return null;
    }

    setProcessing(true);
    try {
      const totals = calculateCartWithIva(cart, products, overrideDiscount, overrideType, config);

      const { couponCode, couponDiscountType } = useStore.getState();

      const saleData: any = {
        customer_id: selectedCustomer?.id ?? null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: 0,
        })),
        payment_method: paymentMethod,
        discount_amount: totals.discountAmount,
        discount_type: overrideType,
        tax_amount: totals.taxAmount,
        notes: couponCode ? `${notes || ''}`.trim() : notes,
      };

      if (couponCode) {
        saleData.coupon_code = couponCode;
        if (couponDiscountType) {
          saleData.coupon_discount_type = couponDiscountType;
        }
      }

      await api.post('/sales', saleData, {
        _maxRetries: 2,
        headers: { 'X-Request-Name': 'create-sale' },
      } as any);

      return {
        subtotalWithoutIva: totals.subtotal,
        totalIva: totals.taxAmount,
        subtotalWithIva: totals.subtotalWithIva,
        discountAmount: totals.discountAmount,
        finalTotal: totals.total,
      };
    } catch (error: any) {
      console.error('Error processing sale:', error);
      const getMsg = (await import('@/lib/api')).getErrorMessage;
      const message = getMsg(error);
      toast.show({
        title: 'Error al procesar la venta',
        description: message || 'Ocurrió un problema procesando la venta',
        variant: 'destructive',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  }, [products, paymentMethod, notes, selectedCustomer, config]);

  return { processing, processSale, processSaleWithOverrides };
}
