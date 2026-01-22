"use client";
import React from 'react';
import POSHeaderBar, { type DBStatus } from '@/components/pos/POSHeaderBar';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';

interface POSHeaderProps {
  dbStatus: DBStatus;
  error?: unknown;
  isWholesaleMode: boolean;
  cartCount: number;
  totalAmount: number;
  stats: any; // using any to avoid tight coupling here
  onShowShortcuts: () => void;
  onRefresh: () => void;
  loading?: boolean;
  performanceMode?: boolean;
  actions?: React.ReactNode;
  realtime?: {
    isConnected: boolean;
    lastUpdate: Date | null;
    newSalesCount: number;
    notificationsEnabled?: boolean;
    onRefresh: () => void;
    onMarkAsViewed: () => void;
    onToggleNotifications?: () => void;
    isRefreshing?: boolean;
    isMarkingViewed?: boolean;
    dataSource?: 'supabase' | 'backend' | 'mock' | 'unknown';
  };
}

export default function POSHeader(props: POSHeaderProps) {
  const {
    dbStatus,
    error,
    isWholesaleMode,
    cartCount,
    totalAmount,
    stats,
    onShowShortcuts,
    onRefresh,
    loading,
    performanceMode,
    actions,
  } = props;

  return (
    <section aria-label="Encabezado del POS" className="sticky top-0 z-50">
      <POSHeaderBar
        dbStatus={dbStatus}
        error={error}
        isWholesaleMode={isWholesaleMode}
        cartCount={cartCount}
        totalAmount={totalAmount}
        stats={stats}
        onShowShortcuts={onShowShortcuts}
        onRefresh={onRefresh}
        loading={loading}
        performanceMode={performanceMode}
        actions={actions}
      />

      <div className="bg-background border-b border-border">
        <div className="px-4 sm:px-5 py-2 flex flex-col gap-2">
          {/* Global connection indicator */}
          <div className="flex items-center justify-between">
            <ConnectionIndicator showDetails={false} size="sm" />
          </div>

          
        </div>
      </div>
    </section>
  );
}
