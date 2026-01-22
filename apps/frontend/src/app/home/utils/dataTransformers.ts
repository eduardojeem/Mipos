/**
 * Data transformation utilities for home page
 * Transforms API responses to typed interfaces with validation
 */

import { validateNumber, validateString, validateArray, validateImageUrl } from './validators';
import { calculateOfferPrice, type Promotion } from '@/lib/offers/calculations';

/**
 * Special offer interface
 */
export interface SpecialOffer {
  title: string;
  description: string;
  validUntil: string;
  image: string;
}

/**
 * Public offer interface
 */
export interface PublicOffer {
  product: {
    id: string;
    name: string;
    images?: Array<{ url: string }>;
    image?: string;
  };
  basePrice: number;
  offerPrice: number;
  discountPercent: number;
  promotion: {
    id: string;
    name: string;
    discountType: string;
    discountValue?: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
  } | null;
}

/**
 * Featured product interface
 */
export interface FeaturedProduct {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  discount: number;
  category: string;
  stock?: number;
}

/**
 * Transforms API offer response to SpecialOffer format
 * 
 * @param apiOffer - Raw API offer data
 * @param formatCurrency - Currency formatting function
 * @returns Transformed SpecialOffer
 */
export function transformApiOfferToSpecialOffer(
  apiOffer: any,
  formatCurrency: (n: number) => string
): SpecialOffer {
  const title = validateString(apiOffer?.name, 'Producto en oferta');
  const salePrice = validateNumber(apiOffer?.salePrice, 0);
  const offerPrice = apiOffer?.offerPrice != null ? validateNumber(apiOffer.offerPrice, salePrice) : null;
  const promoName = validateString(apiOffer?.promotion?.name, '');
  
  // Build description
  let description = '';
  if (offerPrice !== null && offerPrice < salePrice) {
    description = `Antes ${formatCurrency(salePrice)}, ahora ${formatCurrency(offerPrice)}`;
  } else {
    description = `Precio ${formatCurrency(salePrice)}`;
  }
  
  if (promoName) {
    description = `${description} — ${promoName}`;
  }
  
  // Get valid until date
  const endDate = apiOffer?.promotion?.endDate;
  const validUntil = endDate ? String(endDate).split('T')[0] : '';
  
  // Get image with fallback
  const image = validateImageUrl(apiOffer?.image, '/api/placeholder/400/200');
  
  return {
    title,
    description,
    validUntil,
    image,
  };
}

/**
 * Transforms Supabase row to PublicOffer format
 * Uses centralized calculation utility for consistency
 * 
 * @param row - Raw Supabase row data
 * @returns Transformed PublicOffer
 */
export function transformSupabaseRowToPublicOffer(row: any): PublicOffer {
  const product = row?.product || {};
  const promotions = row?.promotions || null;
  
  const basePrice = validateNumber(product?.sale_price, 0);
  
  // Build promotion object
  let promotion: PublicOffer['promotion'] = null;
  let promotionForCalculation: Promotion | null = null;
  
  if (promotions && promotions.is_active) {
    promotion = {
      id: validateString(promotions.id, ''),
      name: validateString(promotions.name, ''),
      discountType: validateString(promotions.discount_type, 'PERCENTAGE'),
      discountValue: promotions.discount_value != null ? validateNumber(promotions.discount_value, 0) : undefined,
      startDate: promotions.start_date || undefined,
      endDate: promotions.end_date || undefined,
      isActive: Boolean(promotions.is_active),
    };
    
    // Prepare promotion for calculation utility
    promotionForCalculation = {
      id: promotion.id,
      name: promotion.name,
      discountType: promotion.discountType as any,
      discountValue: promotion.discountValue,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      isActive: promotion.isActive,
    };
  }
  
  // Use centralized calculation utility
  const calculation = calculateOfferPrice(basePrice, promotionForCalculation);
  
  return {
    product: {
      id: validateString(product?.id, ''),
      name: validateString(product?.name, 'Producto'),
      images: validateArray(product?.images),
      image: product?.image_url || undefined,
    },
    basePrice: calculation.basePrice,
    offerPrice: calculation.offerPrice,
    discountPercent: calculation.discountPercent,
    promotion,
  };
}

/**
 * Transforms product data to FeaturedProduct format
 * 
 * @param product - Raw product data
 * @returns Transformed FeaturedProduct
 */
export function transformProductToFeaturedProduct(product: any): FeaturedProduct {
  const basePrice = validateNumber(product?.sale_price, 0);
  const offerPrice = product?.offer_price != null ? validateNumber(product.offer_price, basePrice) : undefined;
  
  // Calculate discount percentage
  let discountPercent = 0;
  if (offerPrice !== undefined && offerPrice < basePrice && basePrice > 0) {
    discountPercent = Math.round(((basePrice - offerPrice) / basePrice) * 100);
  }
  
  // Get valid image URL
  const image = getValidImageUrl(
    product?.images,
    product?.image_url,
    '/api/placeholder/300/300'
  );
  
  return {
    id: validateNumber(product?.id, 0),
    name: validateString(product?.name, 'Producto'),
    price: offerPrice ?? basePrice,
    originalPrice: basePrice,
    image,
    rating: validateNumber(product?.rating, 4.5),
    reviews: validateNumber(product?.reviews, 0),
    discount: Math.max(0, Math.min(100, discountPercent)),
    category: validateString(product?.category, 'General'),
    stock: product?.stock_quantity != null ? validateNumber(product.stock_quantity, 999) : undefined,
  };
}

/**
 * Gets a valid image URL from various sources
 * Checks images array first, then imageUrl, then fallback
 * 
 * @param images - Array of image objects with url property
 * @param imageUrl - Direct image URL string
 * @param fallback - Fallback placeholder URL
 * @returns Valid image URL
 */
export function getValidImageUrl(
  images?: Array<{ url: string }>,
  imageUrl?: string,
  fallback: string = '/api/placeholder/300/300'
): string {
  // Try images array first
  if (Array.isArray(images) && images.length > 0 && images[0]?.url) {
    return validateImageUrl(images[0].url, fallback);
  }
  
  // Try direct image URL
  if (imageUrl) {
    return validateImageUrl(imageUrl, fallback);
  }
  
  // Return fallback
  return fallback;
}
