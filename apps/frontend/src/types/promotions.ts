export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
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

export interface PromotionCreateInput {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  applicableProductIds?: string[];
}

export interface PromotionUpdateInput extends Partial<PromotionCreateInput> {
  isActive?: boolean;
}
