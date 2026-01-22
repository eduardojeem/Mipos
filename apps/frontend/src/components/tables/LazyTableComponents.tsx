'use client';

import { withLazyLoading } from '@/components/ui/lazy-loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Skeleton components for table loading states
export const TableSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-48" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Table header */}
        <div className="flex space-x-4 pb-2 border-b">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex space-x-4 py-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const DataTableSkeleton = () => (
  <div className="space-y-4">
    {/* Filters and search */}
    <div className="flex justify-between items-center">
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
    
    {/* Table */}
    <div className="border rounded-lg">
      {/* Header */}
      <div className="flex items-center space-x-4 p-4 border-b bg-gray-50">
        <Skeleton className="h-4 w-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border-b">
          <Skeleton className="h-4 w-4" />
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="flex-1">
              {j === 0 ? (
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : j === 1 ? (
                <Skeleton className="h-6 w-16 rounded-full" />
              ) : (
                <Skeleton className="h-4 w-full" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
    
    {/* Pagination */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-32" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

export const VirtualizedTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-24" />
    </div>
    
    <div className="border rounded-lg overflow-hidden">
      {/* Fixed header */}
      <div className="flex items-center space-x-4 p-3 bg-gray-50 border-b">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Virtual rows */}
      <div className="h-96 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 border-b">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
    
    <div className="flex justify-center">
      <Skeleton className="h-4 w-40" />
    </div>
  </div>
);

// Lazy loaded table components
export const LazyDataTable = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  DataTableSkeleton
);

export const LazyVirtualizedTable = withLazyLoading(
  () => import('@/components/ui/virtualized-table') as any,
  VirtualizedTableSkeleton
);

export const LazyProductTable = withLazyLoading(
  () => import('@/components/products/ProductTable') as any,
  DataTableSkeleton
);

export const LazyCustomerTable = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  DataTableSkeleton
);

export const LazySalesTable = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  DataTableSkeleton
);

export const LazyInventoryTable = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  DataTableSkeleton
);

// Advanced table components with virtual scrolling
export const LazyAdvancedDataTable = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  VirtualizedTableSkeleton
);

export const LazyReportsTable = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  DataTableSkeleton
);

// Table utilities and hooks
export const LazyTableFilters = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  () => (
    <div className="flex space-x-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-24" />
    </div>
  )
);

export const LazyTablePagination = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  () => (
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-32" />
      <div className="flex space-x-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
    </div>
  )
);

export const LazyTableExport = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  () => (
    <div className="flex space-x-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  )
);

// Bulk operations components
export const LazyBulkOperations = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  () => (
    <div className="flex items-center space-x-2 p-3 bg-blue-50 border rounded-lg">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
      <div className="flex space-x-2 ml-auto">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
);

// Table context providers
export const LazyTableProvider = withLazyLoading(
  () => Promise.resolve({ default: () => null }) as any,
  () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full" />
      <DataTableSkeleton />
    </div>
  )
);

export default {
  LazyDataTable,
  LazyVirtualizedTable,
  LazyProductTable,
  LazyCustomerTable,
  LazySalesTable,
  LazyInventoryTable,
  LazyAdvancedDataTable,
  LazyReportsTable,
  LazyTableFilters,
  LazyTablePagination,
  LazyTableExport,
  LazyBulkOperations,
  LazyTableProvider
};