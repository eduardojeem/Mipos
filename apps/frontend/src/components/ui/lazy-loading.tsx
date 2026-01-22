'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Componente de loading genérico
export const LazyLoadingSkeleton = ({ 
  height = 'h-64', 
  className = '' 
}: { 
  height?: string; 
  className?: string; 
}) => (
  <div className={`space-y-4 ${className}`}>
    <Skeleton className={`w-full ${height}`} />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// HOC para lazy loading con skeleton personalizado
export function withLazyLoading<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(importFunc);
  
  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    const FallbackComponent = fallback || LazyLoadingSkeleton;
    
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Skeleton específico para productos
export const ProductSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-48 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-1/4" />
    </div>
  </div>
);

// Skeleton específico para dashboard
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
    <Skeleton className="h-96 w-full rounded-lg" />
  </div>
);

// Skeleton específico para tablas
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-4">
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-6 w-full" />
        ))}
      </div>
    ))}
  </div>
);

// Skeleton específico para formularios
export const FormSkeleton = ({ fields = 6 }: { fields?: number }) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Skeleton específico para modales
export const ModalSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-6 rounded" />
    </div>
    <Skeleton className="h-px w-full" />
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
    <div className="flex justify-end space-x-2 pt-4">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Skeleton específico para gráficos
export const ChartSkeleton = ({ type = 'bar' }: { type?: 'bar' | 'line' | 'pie' | 'donut' }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    {type === 'pie' || type === 'donut' ? (
      <div className="flex justify-center">
        <Skeleton className="h-64 w-64 rounded-full" />
      </div>
    ) : (
      <Skeleton className="h-64 w-full rounded-lg" />
    )}
    <div className="flex justify-center space-x-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton específico para listas
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

// Skeleton específico para cards
export const CardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3 p-4 border rounded-lg">
        <div className="flex justify-between items-start">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-20 w-full rounded" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    ))}
  </div>
);

// Hook para lazy loading con intersection observer
export const useLazyLoading = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
};

// Hook para lazy loading con delay
export const useLazyLoadingWithDelay = (delay = 100) => {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const { ref, isVisible } = useLazyLoading();

  React.useEffect(() => {
    if (isVisible && !shouldLoad) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldLoad, delay]);

  return { ref, shouldLoad };
};

// Componente para lazy loading condicional
export const ConditionalLazyLoad: React.FC<{
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ComponentType;
  delay?: number;
}> = ({ condition, children, fallback: Fallback = LazyLoadingSkeleton, delay = 0 }) => {
  const [shouldRender, setShouldRender] = React.useState(!condition);

  React.useEffect(() => {
    if (condition && !shouldRender) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [condition, shouldRender, delay]);

  if (!shouldRender) {
    return <Fallback />;
  }

  return <>{children}</>;
};

export default withLazyLoading;