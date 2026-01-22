import type { Product } from '@/types'
import type { BusinessConfig } from '@/types/business-config'
import type { CartItem } from '@/hooks/useCart'
import { DEFAULT_IVA_RATE_PARAGUAY } from './constants'

/**
 * Type of discount that can be applied to a cart
 * - PERCENTAGE: Discount as a percentage (0-100)
 * - FIXED_AMOUNT: Discount as a fixed monetary amount
 */
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

/**
 * Result of cart calculations including all totals and tax information
 */
export interface CartTotals {
  /** Subtotal without IVA (base price) */
  subtotal: number
  /** Subtotal with IVA included */
  subtotalWithIva: number
  /** Amount of discount applied */
  discountAmount: number
  /** Total tax (IVA) amount */
  taxAmount: number
  /** Final total after discount (clamped to 0 if negative) */
  total: number
  /** Total number of items in cart (sum of quantities) */
  itemCount: number
  /** Cart items with detailed IVA breakdown */
  itemsWithIva: Array<
    CartItem & {
      subtotal_without_iva: number
      iva_amount: number
      iva_rate: number
    }
  >
}

/**
 * Rounds a number to 2 decimal places
 * Uses Number.EPSILON to handle floating point precision issues
 * @param n - Number to round
 * @returns Number rounded to 2 decimal places
 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Calculates cart totals with IVA (tax) and discounts
 * 
 * This function handles complex tax calculations including:
 * - Products with IVA included vs not included in price
 * - Custom IVA rates per product
 * - Global tax enable/disable
 * - Non-taxable products
 * - Percentage and fixed amount discounts
 * - Proper rounding to 2 decimal places
 * 
 * @param cart - Array of cart items with quantities and prices
 * @param products - Array of product details for tax rate lookup
 * @param discount - Discount value (percentage 0-100 or fixed amount)
 * @param discountType - Type of discount (PERCENTAGE or FIXED_AMOUNT)
 * @param config - Optional business configuration for tax settings
 * 
 * @returns CartTotals object with all calculated values
 * 
 * @example
 * ```typescript
 * const cart = [{ product_id: '1', quantity: 2, price: 100, total: 200 }];
 * const products = [{ id: '1', iva_rate: 10, iva_included: false }];
 * const totals = calculateCartWithIva(cart, products, 10, 'PERCENTAGE');
 * // totals.subtotal = 200
 * // totals.taxAmount = 20 (10% of 200)
 * // totals.subtotalWithIva = 220
 * // totals.discountAmount = 22 (10% of 220)
 * // totals.total = 198
 * ```
 * 
 * @remarks
 * - Discount is applied to subtotal WITH IVA
 * - Total is clamped to 0 if discount exceeds subtotal
 * - Default IVA rate is 10% (Paraguay)
 * - All monetary values are rounded to 2 decimal places
 * 
 * @see {@link DiscountType} for discount type options
 * @see {@link CartTotals} for return value structure
 */
export function calculateCartWithIva(
  cart: CartItem[],
  products: Product[],
  discount: number,
  discountType: DiscountType,
  config?: BusinessConfig
): CartTotals {
  // Check if tax is globally enabled
  const taxEnabled = config?.storeSettings?.taxEnabled ?? true;
  const globalTaxRate = config?.storeSettings?.taxRate ?? (DEFAULT_IVA_RATE_PARAGUAY / 100);
  const taxIncludedInPrices = config?.storeSettings?.taxIncludedInPrices ?? false;

  let subtotalWithoutIva = 0
  let totalIva = 0
  let subtotalWithIva = 0

  const itemsWithIva: CartTotals['itemsWithIva'] = []

  for (const item of cart) {
    const product = products.find(p => p.id === item.product_id)

    // Check if this product is taxable (default to true if not specified)
    const isProductTaxable = (product as any)?.is_taxable ?? true;

    // If tax is disabled globally OR product is not taxable, don't apply tax
    const shouldApplyTax = taxEnabled && isProductTaxable;

    const ivaRate = shouldApplyTax
      ? ((product as any)?.iva_rate ?? (globalTaxRate * 100))
      : 0;

    const ivaIncluded = (product as any)?.iva_included ?? taxIncludedInPrices

    let itemSubtotalWithoutIva: number
    let itemIvaAmount: number
    let itemSubtotalWithIva: number

    if (shouldApplyTax && ivaIncluded) {
      itemSubtotalWithIva = item.total
      itemSubtotalWithoutIva = itemSubtotalWithIva / (1 + (ivaRate / 100))
      itemIvaAmount = itemSubtotalWithIva - itemSubtotalWithoutIva
    } else if (shouldApplyTax && !ivaIncluded) {
      itemSubtotalWithoutIva = item.total
      itemIvaAmount = itemSubtotalWithoutIva * (ivaRate / 100)
      itemSubtotalWithIva = itemSubtotalWithoutIva + itemIvaAmount
    } else {
      // No tax applied
      itemSubtotalWithoutIva = item.total
      itemIvaAmount = 0
      itemSubtotalWithIva = item.total
    }

    subtotalWithoutIva += itemSubtotalWithoutIva
    totalIva += itemIvaAmount
    subtotalWithIva += itemSubtotalWithIva

    itemsWithIva.push({
      ...item,
      subtotal_without_iva: itemSubtotalWithoutIva,
      iva_amount: itemIvaAmount,
      iva_rate: ivaRate,
    })
  }

  const discountAmount = discountType === 'PERCENTAGE'
    ? (subtotalWithIva * discount) / 100
    : discount

  const total = Math.max(0, subtotalWithIva - discountAmount)

  return {
    subtotal: round2(subtotalWithoutIva),
    subtotalWithIva: round2(subtotalWithIva),
    discountAmount: round2(discountAmount),
    taxAmount: round2(totalIva),
    total: round2(total),
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    itemsWithIva,
  }
}

/**
 * Gets the free shipping threshold for a specific region
 * 
 * @param config - Business configuration containing shipping settings
 * @param region - Optional region ID or name to check for specific threshold
 * 
 * @returns The free shipping threshold amount, or 0 if disabled
 * 
 * @example
 * ```typescript
 * const threshold = getFreeShippingThreshold(config, 'asuncion');
 * if (cartTotal >= threshold) {
 *   // Free shipping applies
 * }
 * ```
 * 
 * @remarks
 * - Returns 0 if free shipping is disabled
 * - Checks region-specific thresholds first
 * - Falls back to base threshold if no region match
 * - Region matching is case-insensitive
 */
export function getFreeShippingThreshold(config: BusinessConfig | undefined, region?: string): number {
  const enabled = !!config?.storeSettings?.freeShippingEnabled;
  if (!enabled) return 0;
  const base = Number(config?.storeSettings?.freeShippingThreshold || 0);
  const list = config?.storeSettings?.freeShippingRegions || [];
  if (region) {
    const key = String(region).toLowerCase();
    const match = list.find((r) => {
      const a = String(r?.id || '').toLowerCase();
      const b = String(r?.name || '').toLowerCase();
      return a === key || b === key;
    });
    if (match && Number(match.threshold) > 0) return Number(match.threshold);
  }
  return base;
}
