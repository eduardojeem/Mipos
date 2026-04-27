export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BOGO' | 'FREE_SHIPPING';

export interface OfferProduct {
  id: string;
  name: string;
  sale_price?: number;
  retail_price?: number;
  price?: number;
  stock_quantity?: number;
  category_id?: string;
  categoryName?: string;
  sku?: string;
  description?: string;
  brand?: string;
  images?: { url: string }[];
  image?: string;
}

export interface OfferPromotion {
  id: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount?: number;
}

export interface OfferItem {
  product: OfferProduct;
  promotion: OfferPromotion;
  basePrice: number;
  offerPrice: number;
  discountPercent: number;
  savings: number;
}

export interface OfferCategory {
  id: string;
  name: string;
}

export interface OfferPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
