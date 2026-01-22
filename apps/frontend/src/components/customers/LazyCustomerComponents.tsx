'use client';

import { withLazyLoading } from '@/components/ui/lazy-loading';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton components for customer-specific loading states
export const CustomerAnalyticsSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export const CustomerTagManagerSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-24" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  </div>
);

export const LoyaltyProgramSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
    <Skeleton className="h-80 w-full" />
  </div>
);

// Lazy loaded customer components
export const LazyCustomerAnalytics = withLazyLoading(
  () => import('./CustomerAnalytics'),
  CustomerAnalyticsSkeleton
);

export const LazyCustomerTagManager = withLazyLoading(
  () => import('./CustomerTagManager'),
  CustomerTagManagerSkeleton
);

export const LazyLoyaltyProgram = withLazyLoading(
  () => import('./LoyaltyProgram'),
  LoyaltyProgramSkeleton
);

export const LazyAdvancedSegmentation = withLazyLoading(
  () => import('./AdvancedSegmentation'),
  () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
);

export const LazyCommunicationCenter = withLazyLoading(
  () => import('./CommunicationCenter'),
  () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
);

export const LazyAdvancedSearch = withLazyLoading(
  () => import('./AdvancedSearch'),
  () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
);

export const LazyCustomerHistory = withLazyLoading(
  () => import('./CustomerHistory'),
  () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
);