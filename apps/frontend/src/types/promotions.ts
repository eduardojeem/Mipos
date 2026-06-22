export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromotionTargetType = 'PRODUCT' | 'SERVICE';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  targetType?: PromotionTargetType;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  applicableProducts?: ApplicableProduct[];
  applicableServices?: ApplicableService[];
  organization_id?: string;
  created_at?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalComment?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ApplicableProduct {
  id: string;
  name?: string;
  category?: string;
}

export interface ApplicableService {
  id: string;
  name?: string;
  category?: string | null;
  price?: number | null;
  duration_min?: number | null;
}

export interface PromotionCreateInput {
  name: string;
  description?: string;
  targetType?: PromotionTargetType;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  applicableProductIds?: string[];
  applicableServiceIds?: string[];
}

export interface PromotionUpdateInput extends Partial<PromotionCreateInput> {
  isActive?: boolean;
}
