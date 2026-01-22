/**
 * Price calculation utilities for home page
 * Wrapper functions around centralized calculations for convenience
 */

import { calculateOfferPrice, type Promotion, type OfferCalculation } from '@/lib/offers/calculations';

/**
 * Calculates percentage discount
 * 
 * @param basePrice - Original price
 * @param discountPercent - Discount percentage (0-100)
 * @returns Offer price after discount
 */
export function calculatePercentageDiscount(
  basePrice: number,
  discountPercent: number
): number {
  const promotion: Promotion = {
    id: 'temp',
    name: 'Percentage Discount',
    discountType: 'PERCENTAGE',
    discountValue: discountPercent,
    isActive: true,
  };
  
  const result = calculateOfferPrice(basePrice, promotion);
  return result.offerPrice;
}

/**
 * Calculates fixed amount discount
 * 
 * @param basePrice - Original price
 * @param discountAmount - Fixed discount amount
 * @returns Offer price after discount (never negative)
 */
export function calculateFixedDiscount(
  basePrice: number,
  discountAmount: number
): number {
  const promotion: Promotion = {
    id: 'temp',
    name: 'Fixed Discount',
    discountType: 'FIXED_AMOUNT',
    discountValue: discountAmount,
    isActive: true,
  };
  
  const result = calculateOfferPrice(basePrice, promotion);
  return result.offerPrice;
}

/**
 * Calculates discount percentage from base and offer prices
 * 
 * @param basePrice - Original price
 * @param offerPrice - Discounted price
 * @returns Discount percentage (0-100)
 */
export function calculateDiscountPercent(
  basePrice: number,
  offerPrice: number
): number {
  if (basePrice <= 0) return 0;
  
  const savings = basePrice - offerPrice;
  const percent = (savings / basePrice) * 100;
  
  // Clamp to valid range
  return Math.max(0, Math.min(100, Math.round(percent * 10) / 10));
}

/**
 * Calculates savings amount
 * 
 * @param basePrice - Original price
 * @param offerPrice - Discounted price
 * @returns Savings amount (always >= 0)
 */
export function calculateSavings(
  basePrice: number,
  offerPrice: number
): number {
  const savings = basePrice - offerPrice;
  return Math.max(0, Math.round(savings * 100) / 100);
}

/**
 * Filters active promotions based on current date
 * 
 * @param promotions - Array of promotions
 * @param currentDate - Reference date (default: now)
 * @returns Array of active promotions
 */
export function filterActivePromotions(
  promotions: Promotion[],
  currentDate: Date = new Date()
): Promotion[] {
  const now = currentDate.getTime();
  
  return promotions.filter(promo => {
    // Must be marked as active
    if (!promo.isActive) return false;
    
    // Check start date
    if (promo.startDate) {
      const startDate = new Date(promo.startDate).getTime();
      if (startDate > now) return false;
    }
    
    // Check end date
    if (promo.endDate) {
      const endDate = new Date(promo.endDate).getTime();
      if (endDate < now) return false;
    }
    
    return true;
  });
}

/**
 * Checks if an offer should show urgency indicator
 * 
 * @param endDate - Promotion end date
 * @param currentDate - Reference date (default: now)
 * @param thresholdDays - Days threshold for urgency (default: 3)
 * @returns true if offer is ending soon
 */
export function shouldShowUrgency(
  endDate: string | Date | null | undefined,
  currentDate: Date = new Date(),
  thresholdDays: number = 3
): boolean {
  if (!endDate) return false;
  
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = currentDate;
  
  const diffMs = end.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return diffDays > 0 && diffDays < thresholdDays;
}

/**
 * Gets valid image URL with fallback
 * 
 * @param imageUrl - Image URL or null/undefined
 * @param fallback - Fallback URL
 * @returns Valid image URL
 */
export function getValidImageUrl(
  imageUrl: string | null | undefined,
  fallback: string = '/api/placeholder/400/200'
): string {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
    return fallback;
  }
  
  return imageUrl;
}

/**
 * Complete offer calculation with all details
 * Convenience wrapper around calculateOfferPrice
 * 
 * @param basePrice - Original price
 * @param promotion - Promotion data
 * @returns Complete calculation result
 */
export function calculateCompleteOffer(
  basePrice: number,
  promotion: Promotion | null
): OfferCalculation {
  return calculateOfferPrice(basePrice, promotion);
}
