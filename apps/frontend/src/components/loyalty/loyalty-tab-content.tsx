'use client';

import { useCustomerLoyalty } from '@/hooks/use-loyalty';
import { CustomerLoyaltyCard } from './customer-loyalty-card';
import { PointsHistory } from './points-history';

interface LoyaltyTabContentProps {
  customerId: string;
}

export function LoyaltyTabContent({ customerId }: LoyaltyTabContentProps) {
  const { data: customerLoyalty, isLoading } = useCustomerLoyalty(customerId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Loyalty Card */}
      <CustomerLoyaltyCard 
        customerId={customerId}
        compact={false}
        showActions={true}
      />
      
      {/* Points History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Historial de Puntos</h3>
        <PointsHistory customerId={customerId} />
      </div>
    </div>
  );
}