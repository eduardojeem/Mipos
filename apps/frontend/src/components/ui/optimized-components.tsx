'use client';

import React, { memo, useMemo, useCallback, useState, useEffect, Suspense, lazy } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceMonitor, useRenderOptimization } from '@/hooks/use-performance';
import { cn } from '@/lib/utils';

// Optimized Card component with memoization
export const OptimizedCard = memo<{
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}>(({ title, description, children, className, loading = false }) => {
  const { startMeasure, endMeasure } = usePerformanceMonitor('OptimizedCard');
  
  useEffect(() => {
    startMeasure();
    return () => endMeasure();
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          {description && <Skeleton className="h-4 w-1/2" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
});

OptimizedCard.displayName = 'OptimizedCard';

// Virtualized list component for large datasets
export const VirtualizedList = memo<{
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
}>(({ items, renderItem, itemHeight, containerHeight, className }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const { startMeasure, endMeasure } = usePerformanceMonitor('VirtualizedList');

  const visibleItems = useMemo(() => {
    startMeasure();
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    const result = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
    
    endMeasure();
    return result;
  }, [items, scrollTop, itemHeight, containerHeight, startMeasure, endMeasure]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

// Optimized data table with memoization and virtualization
export const OptimizedDataTable = memo<{
  data: any[];
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    sortable?: boolean;
  }>;
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}>(({ data, columns, loading = false, onSort, className }) => {
  const { renderCount } = useRenderOptimization('OptimizedDataTable', { dataLength: data.length });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = useCallback((key: string) => {
    const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  }, [sortConfig, onSort]);

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'text-left p-3 font-medium',
                  column.sortable && 'cursor-pointer hover:bg-gray-50'
                )}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortConfig?.key === column.key && (
                    <span className="text-xs">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="p-3">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Renders: {renderCount}
        </div>
      )}
    </div>
  );
});

OptimizedDataTable.displayName = 'OptimizedDataTable';

// Lazy loaded image component with intersection observer
export const LazyImage = memo<{
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  placeholder?: string;
}>(({ src, alt, className, fallback, placeholder }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder || <span className="text-gray-400 text-sm">Loading...</span>}
        </div>
      )}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100%"
          className={cn(
            'object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError as any}
          unoptimized
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// Optimized search component with debouncing
export const OptimizedSearch = memo<{
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}>(({ onSearch, placeholder = 'Search...', debounceMs = 300, className }) => {
  const [query, setQuery] = useState('');
  const timeoutRef = React.useRef<number | null>(null);

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, debounceMs) as unknown as number;
  }, [onSearch, debounceMs]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as unknown as NodeJS.Timeout);
      }
    };
  }, []);

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]',
        className
      )}
    />
  );
});

OptimizedSearch.displayName = 'OptimizedSearch';

// Memoized badge component
export const OptimizedBadge = memo<{
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}>(({ children, variant = 'default', className }) => {
  return (
    <Badge variant={variant} className={className}>
      {children}
    </Badge>
  );
});

OptimizedBadge.displayName = 'OptimizedBadge';

// Optimized button with interaction tracking
export const OptimizedButton = memo<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}>(({ children, onClick, variant = 'default', size = 'default', disabled = false, loading = false, className }) => {
  const handleClick = useCallback(() => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  }, [disabled, loading, onClick]);

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={handleClick}
      className={className}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : (
        children
      )}
    </Button>
  );
});

OptimizedButton.displayName = 'OptimizedButton';

// Performance monitoring wrapper component
export const PerformanceWrapper = memo<{
  name: string;
  children: React.ReactNode;
  showMetrics?: boolean;
}>(({ name, children, showMetrics = false }) => {
  const { startMeasure, endMeasure, metrics } = usePerformanceMonitor(name);
  const { renderCount } = useRenderOptimization(name);

  useEffect(() => {
    startMeasure();
    return () => endMeasure();
  });

  const lastMetric = metrics[metrics.length - 1];

  return (
    <div>
      {children}
      {showMetrics && process.env.NODE_ENV === 'development' && lastMetric && (
        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
          <div>Component: {name}</div>
          <div>Last render: {lastMetric.renderTime.toFixed(2)}ms</div>
          <div>Total renders: {renderCount}</div>
          {lastMetric.memoryUsage && (
            <div>Memory: {lastMetric.memoryUsage.toFixed(2)}MB</div>
          )}
        </div>
      )}
    </div>
  );
});

PerformanceWrapper.displayName = 'PerformanceWrapper';
