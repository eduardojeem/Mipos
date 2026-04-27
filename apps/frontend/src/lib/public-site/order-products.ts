import 'server-only';

import type { createAdminClient } from '@/lib/supabase/server';

const ORDER_PRODUCT_SELECT = 'id,name,sale_price,offer_price,stock_quantity,is_active';
const ORDER_PRODUCT_SELECT_FALLBACK = 'id,name,sale_price,stock_quantity,is_active';

export interface OrderProductRow {
  id: string;
  name: string;
  sale_price: number;
  offer_price: number | null;
  stock_quantity: number;
  is_active: boolean;
}

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

export function isSchemaMissingError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('relation') && message.includes('does not exist')) ||
    message.includes('could not find the table')
  );
}

export function getEffectiveOrderProductPrice(product: Pick<OrderProductRow, 'sale_price' | 'offer_price'>): number {
  const salePrice = Number(product.sale_price ?? 0);
  const offerPrice = Number(product.offer_price ?? NaN);

  return Number.isFinite(offerPrice) && offerPrice > 0 && (salePrice <= 0 || offerPrice < salePrice)
    ? offerPrice
    : salePrice;
}

export async function fetchOrderProductsForOrganization(
  client: AdminClient,
  organizationId: string,
  productIds: string[]
): Promise<OrderProductRow[]> {
  const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueProductIds.length === 0) {
    return [];
  }

  let result = await client
    .from('products')
    .select(ORDER_PRODUCT_SELECT)
    .eq('organization_id', organizationId)
    .in('id', uniqueProductIds);

  if (result.error && isSchemaMissingError(result.error)) {
    result = await client
      .from('products')
      .select(ORDER_PRODUCT_SELECT_FALLBACK)
      .eq('organization_id', organizationId)
      .in('id', uniqueProductIds);
  }

  if (result.error) {
    throw result.error;
  }

  return (result.data || []).map((product: {
    id: unknown; name: unknown; sale_price: unknown;
    offer_price?: unknown; stock_quantity: unknown; is_active: unknown;
  }) => ({
    id: String(product.id),
    name: String(product.name || 'Producto'),
    sale_price: Number(product.sale_price ?? 0),
    offer_price:
      typeof product.offer_price === 'number' && Number.isFinite(product.offer_price)
        ? product.offer_price
        : null,
    stock_quantity: Number(product.stock_quantity ?? 0),
    is_active: Boolean(product.is_active),
  }));
}
