import type { Product } from '@/types';

type ProductPricingInput = Pick<
  Product,
  'sale_price' | 'offer_price' | 'regular_price' | 'discount_percentage'
>;

export interface ProductPricing {
  basePrice: number;
  displayPrice: number;
  compareAtPrice: number | null;
  savings: number;
  discountPercent: number;
  hasDiscount: boolean;
}

function normalizePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getProductPricing(product: ProductPricingInput): ProductPricing {
  const salePrice = normalizePositiveNumber(product.sale_price) || 0;
  const offerPrice = normalizePositiveNumber(product.offer_price);
  const regularPrice = normalizePositiveNumber(product.regular_price);

  const displayPrice =
    offerPrice && (salePrice <= 0 || offerPrice < salePrice) ? offerPrice : salePrice;

  const compareCandidates = [salePrice, regularPrice].filter(
    (value): value is number => value !== null && Number.isFinite(value) && value > displayPrice
  );
  const compareAtPrice =
    compareCandidates.length > 0 ? Math.max(...compareCandidates) : null;

  const savings = compareAtPrice ? Math.max(compareAtPrice - displayPrice, 0) : 0;
  const calculatedDiscount =
    compareAtPrice && compareAtPrice > 0
      ? Math.round((savings / compareAtPrice) * 100)
      : 0;
  const configuredDiscount = Math.max(0, Math.round(Number(product.discount_percentage || 0)));
  const discountPercent = calculatedDiscount || configuredDiscount;

  return {
    basePrice: salePrice,
    displayPrice,
    compareAtPrice,
    savings,
    discountPercent,
    hasDiscount: discountPercent > 0 && savings > 0,
  };
}
