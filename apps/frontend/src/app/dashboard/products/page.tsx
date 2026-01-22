// --- OPTIMIZED VERSION ---
// This version uses simplified architecture for better performance:
// - Direct hooks instead of complex context layers
// - Virtualized components for large lists
// - Optimized cache with intelligent TTL
// - Reduced from 10+ abstraction layers to 3

'use client';

import React, { Suspense } from 'react';
import { PermissionProvider } from '@/components/ui/permission-guard';
import { OptimizedProductsPage } from './components/OptimizedProductsPage';
import { ProductsLoadingSkeleton } from './components/ProductsLoadingSkeleton';

// Fallback component for the optimized page
function ProductsPageFallback() {
  return <ProductsLoadingSkeleton />;
}

export default function ProductsPage() {
  return (
    <PermissionProvider>
      <Suspense fallback={<ProductsPageFallback />}>
        <OptimizedProductsPage />
      </Suspense>
    </PermissionProvider>
  );
}