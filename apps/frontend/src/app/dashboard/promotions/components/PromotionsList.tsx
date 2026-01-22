'use client';

import { PromotionCard } from './PromotionCard';
import { PromotionListItem } from './PromotionListItem';

interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount?: number;
  usageLimit?: number;
}

interface PromotionsListProps {
  promotions: Promotion[];
  viewMode: 'grid' | 'list';
  onRefresh: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  productCounts?: Record<string, number>; // ✅ Nueva prop
  loadingCounts?: boolean; // ✅ Nueva prop
}

export function PromotionsList({ 
  promotions, 
  viewMode, 
  onRefresh,
  selectedIds = new Set(),
  onToggleSelect,
  productCounts = {}, // ✅ Default value
  loadingCounts = false, // ✅ Default value
}: PromotionsListProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={promotion}
            productCount={productCounts[promotion.id] || 0} // ✅ Pasar count
            onRefresh={onRefresh}
            isSelected={selectedIds.has(promotion.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {promotions.map((promotion) => (
        <PromotionListItem
          key={promotion.id}
          promotion={promotion}
          productCount={productCounts[promotion.id] || 0} // ✅ Pasar count
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
