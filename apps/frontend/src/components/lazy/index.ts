// Lazy loaded components for better performance
import { 
  withLazyLoading, 
  ProductSkeleton, 
  DashboardSkeleton, 
  FormSkeleton, 
  ModalSkeleton, 
  ChartSkeleton,
  TableSkeleton,
  ListSkeleton,
  CardSkeleton
} from '@/components/ui/lazy-loading';

// Dashboard components
export const LazyOptimizedDashboard = withLazyLoading(
  () => import('@/components/dashboard/OptimizedDashboard'),
  DashboardSkeleton
);

export const LazyRealtimeCharts = withLazyLoading(
  () => import('@/components/dashboard/RealtimeCharts').then(module => ({ default: module.RealtimeCharts })),
  ChartSkeleton
);

// Product components - all have default exports
export const LazyProductForm = withLazyLoading(
  () => import('@/components/products/ProductForm'),
  FormSkeleton
);

export const LazyProductTable = withLazyLoading(
  () => import('@/components/products/ProductTable'),
  TableSkeleton
);

export const LazyInventoryReports = withLazyLoading(
  () => import('@/components/products/InventoryReports'),
  ChartSkeleton
);

// Catalog components - all have default exports
export const LazyEnhancedProductCatalog = withLazyLoading(
  () => import('@/components/catalog/EnhancedProductCatalog'),
  ProductSkeleton
);

export const LazyCategoryNavigation = withLazyLoading(
  () => import('@/components/catalog/CategoryNavigation'),
  ListSkeleton
);

export const LazyAdvancedSearch = withLazyLoading(
  () => import('@/components/catalog/AdvancedSearch'),
  FormSkeleton
);

export const LazyProductDetailModal = withLazyLoading(
  () => import('@/components/catalog/ProductDetailModal'),
  ModalSkeleton
);

export const LazyProductCardComponent = withLazyLoading(
  () => import('@/components/catalog/ProductCardComponent'),
  CardSkeleton
);

// POS components - only include existing ones
export const LazyProductCatalog = withLazyLoading(
  () => import('@/components/pos/OptimizedProductCatalog'),
  ProductSkeleton
);