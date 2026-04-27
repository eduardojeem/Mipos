'use client';

import { useCallback, useState } from 'react';
import api from '@/lib/api';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleLookup {
  id: string;
  customerName?: string;
  customerId?: string;
  totalAmount: number;
  createdAt: string;
  items: SaleItem[];
}

type RawSaleItem = {
  id?: string;
  sale_item_id?: string;
  product_id?: string;
  productId?: string;
  productName?: string;
  name?: string;
  product?: { id?: string; name?: string; sku?: string } | null;
  products?: { id?: string; name?: string; sku?: string } | null;
  sku?: string;
  quantity?: number | string;
  unit_price?: number | string;
  unitPrice?: number | string;
  total_price?: number | string;
  totalPrice?: number | string;
};

function mapSaleItem(rawItem: RawSaleItem): SaleItem {
  const product = rawItem.product || rawItem.products;
  const quantity = Number(rawItem.quantity || 0);
  const unitPrice = Number(rawItem.unit_price ?? rawItem.unitPrice ?? 0);

  return {
    id: rawItem.id ?? rawItem.sale_item_id ?? rawItem.product_id ?? rawItem.productId ?? '',
    productId: rawItem.product_id ?? rawItem.productId ?? product?.id ?? '',
    productName: product?.name ?? rawItem.productName ?? rawItem.name ?? 'Producto',
    sku: product?.sku ?? rawItem.sku ?? '',
    quantity,
    unitPrice,
    totalPrice: Number(rawItem.total_price ?? rawItem.totalPrice ?? quantity * unitPrice),
  };
}

function mapSaleLookup(raw: any): SaleLookup {
  const itemsSource = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.sale_items)
      ? raw.sale_items
      : [];

  return {
    id: raw.id,
    customerId: raw.customer_id ?? raw.customerId ?? raw.customer?.id ?? undefined,
    customerName: raw.customer?.name ?? raw.customer?.full_name ?? raw.customerName ?? '',
    totalAmount: Number(raw.total_amount ?? raw.total ?? 0),
    createdAt: raw.created_at ?? raw.createdAt ?? raw.date ?? '',
    items: itemsSource.map(mapSaleItem),
  };
}

function getLookupErrorMessage(error: unknown) {
  const typedError = error as {
    response?: { data?: { error?: string; details?: string } };
    message?: string;
  };

  return (
    typedError.response?.data?.error ||
    typedError.response?.data?.details ||
    typedError.message ||
    'Error al buscar la venta.'
  );
}

export function useSaleLookup() {
  const [sale, setSale] = useState<SaleLookup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupSale = useCallback(async (saleId: string): Promise<SaleLookup | null> => {
    const normalizedSaleId = saleId.trim();
    if (!normalizedSaleId) {
      return null;
    }

    setIsLoading(true);
    setError(null);
    setSale(null);

    try {
      const response = await api.get(`/sales/${normalizedSaleId}`, {
        params: { include: 'items,product' },
      });

      const data = response.data;
      const raw = data?.sale ?? data?.data?.sale ?? data?.data ?? data ?? null;

      if (!raw?.id) {
        setError('No se encontro ninguna venta con ese ID.');
        return null;
      }

      const mappedSale = mapSaleLookup(raw);
      setSale(mappedSale);
      return mappedSale;
    } catch (err) {
      setError(getLookupErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSale(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { sale, isLoading, error, lookupSale, reset };
}
