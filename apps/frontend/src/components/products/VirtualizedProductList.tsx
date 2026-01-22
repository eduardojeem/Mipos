'use client';

import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { OptimizedProductCard } from './OptimizedProductCard';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import type { Product } from '@/types';

interface VirtualizedProductListProps {
  products: Product[];
  height?: number;
  itemHeight?: number;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  loading?: boolean;
  className?: string;
}

interface ProductRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    products: Product[];
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    onView?: (product: Product) => void;
    itemsPerRow: number;
  };
}

const ProductRow = memo(function ProductRow({ index, style, data }: ProductRowProps) {
  const { products, onEdit, onDelete, onView, itemsPerRow } = data;
  const startIndex = index * itemsPerRow;
  const endIndex = Math.min(startIndex + itemsPerRow, products.length);
  const rowProducts = products.slice(startIndex, endIndex);
  
  return (
    <div style={style} className="flex gap-4 px-4">
      {rowProducts.map((product) => (
        <div key={product.id} className="flex-1 min-w-0">
          <OptimizedProductCard
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        </div>
      ))}
      {/* Fill empty slots in the last row */}
      {rowProducts.length < itemsPerRow && (
        <>
          {Array.from({ length: itemsPerRow - rowProducts.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 min-w-0" />
          ))}
        </>
      )}
    </div>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div className="space-y-4 p-4" style={{ height }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <Card key={j} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center p-6">
      <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
      <p className="text-sm text-muted-foreground">
        Intenta ajustar los filtros o crea un nuevo producto
      </p>
    </div>
  );
});

export const VirtualizedProductList = memo(function VirtualizedProductList({
  products,
  height = 600,
  itemHeight = 140,
  onEdit,
  onDelete,
  onView,
  loading = false,
  className = ''
}: VirtualizedProductListProps) {
  
  // Función auxiliar para calcular items por fila
  const calculateItemsPerRow = (width: number) => {
    if (width < 640) return 1;
    if (width < 1024) return 2;
    if (width < 1280) return 3;
    return 4;
  };

  const [itemsPerRow, setItemsPerRow] = React.useState(() => 
    typeof window !== 'undefined' ? calculateItemsPerRow(window.innerWidth) : 4
  );
  
  // Update items per row on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setItemsPerRow(calculateItemsPerRow(window.innerWidth));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Show loading state
  if (loading && products.length === 0) {
    return <LoadingSkeleton height={height} />;
  }
  
  // Show empty state
  if (products.length === 0) {
    return <EmptyState />;
  }
  
  // Calculate number of rows needed
  const rowCount = Math.ceil(products.length / itemsPerRow);
  
  // Prepare data for virtual list
  const listData = {
    products,
    onEdit,
    onDelete,
    onView,
    itemsPerRow
  };
  
  return (
    <div className={`w-full ${className}`}>
      <AutoSizer disableHeight>
        {({ width }) => (
          <List
            height={height}
            width={width}
            itemCount={rowCount}
            itemSize={itemHeight}
            itemData={listData}
            overscanCount={2} // Pre-render 2 rows above/below viewport for smooth scrolling
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {ProductRow}
          </List>
        )}
      </AutoSizer>
      
      {loading && products.length > 0 && (
        <div className="flex items-center justify-center p-4 border-t">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Cargando más productos...</span>
          </div>
        </div>
      )}
    </div>
  );
});

// Hook for infinite scrolling with virtualization
export function useVirtualizedInfiniteScroll(
  hasMore: boolean,
  loadMore: () => Promise<void>,
  threshold = 0.8
) {
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  
  const handleScroll = useCallback(async (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage >= threshold && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        await loadMore();
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [hasMore, loadMore, threshold, isLoadingMore]);
  
  return {
    isLoadingMore,
    handleScroll
  };
}