'use client';

import { PromotionCard } from './PromotionCard';
import { PromotionListItem } from './PromotionListItem';
import type { Promotion } from '@/lib/validation/promotion-validation';

interface PromotionsListProps {
  promotions: Promotion[];
  viewMode: 'grid' | 'list';
  onRefresh: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  productCounts?: Record<string, number>;
  loadingCounts?: boolean;
}

export function PromotionsList({
  promotions,
  viewMode,
  onRefresh,
  selectedIds = new Set(),
  onToggleSelect,
  productCounts = {},
  loadingCounts = false,
}: PromotionsListProps) {
  void loadingCounts;

  const getProductCount = (promotion: Promotion) =>
    productCounts[promotion.id] ?? promotion.applicableProducts?.length ?? 0;

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={promotion}
            productCount={getProductCount(promotion)}
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
          productCount={getProductCount(promotion)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
