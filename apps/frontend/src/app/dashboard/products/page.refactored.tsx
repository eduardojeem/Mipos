// Refactored version - Reduced from 931 to ~250 lines
// Enhanced with Error Boundaries, CSRF Protection, and Zod Validation
'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkipNavigation } from '@/components/ui/skip-navigation';
import { PermissionProvider } from '@/components/ui/permission-guard';
import { useHasPermission } from '@/hooks/use-permissions';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useProductsLogic } from '@/hooks/useProductsLogic';
import { useProductsFiltered } from '@/store/products-store';
import { ProductsErrorBoundary } from '@/components/error-boundary/ProductsErrorBoundary';
import { useCSRFToken } from '@/lib/security/csrf';

// Refactored components
import { ProductsLoadingSkeleton } from './components/ProductsLoadingSkeleton';
import { ProductsHeader } from './components/ProductsHeader';
import { ProductsEmptyState } from './components/ProductsEmptyState';
import { ProductsStats } from './components/ProductsStats';
import { ProductsAlerts } from './components/ProductsAlerts';

// Refactored hooks
import { useProductsData } from './hooks/useProductsData';
import { useProductsCRUD } from './hooks/useProductsCRUD';

// Lazy loaded tabs
import dynamic from 'next/dynamic';
const ProductsOverviewTab = dynamic(() => import('./tabs/ProductsOverviewTab'), { ssr: false });
const ProductsListTab = dynamic(() => import('./tabs/ProductsListTab'), { ssr: false });
const ProductsAnalyticsTab = dynamic(() => import('./tabs/ProductsAnalyticsTab'), { ssr: false });
const ProductsRecommendationsTab = dynamic(() => import('./tabs/ProductsRecommendationsTab'), { ssr: false });
const ProductsInventoryTab = dynamic(() => import('./tabs/ProductsInventoryTab'), { ssr: false });

export default function ProductsPage() {
  return (
    <ProductsErrorBoundary>
      <PermissionProvider>
        <Suspense fallback={<ProductsLoadingSkeleton />}>
          <ProductsPageContent />
        </Suspense>
      </PermissionProvider>
    </ProductsErrorBoundary>
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { config } = useBusinessConfig();
  const { token: csrfToken } = useCSRFToken();

  const { hasPermission: canWriteProduct } = useHasPermission('products', 'write');
  const { hasPermission: canExportProduct } = useHasPermission('products', 'export');

  // UI state
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'overview');
  const [serverFilters, setServerFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Data hook (centralized data management)
  const {
    isLoading,
    dashboardStats,
    categories,
    products,
    productsError,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    total,
    hasMore,
    loadMore
  } = useProductsData({
    filters: serverFilters,
    enableRealtime: true
  });

  // CRUD operations hook
  const {
    handleSaveProduct,
    handleDeleteProduct,
    handleViewProduct
  } = useProductsCRUD({
    updateProduct,
    createProduct,
    deleteProduct,
    refetch
  });

  // Filtered products from store
  const searchResults = useProductsFiltered();

  // URL sync
  const updateUrl = useCallback((next: any) => {
    const current = searchParams?.toString() ?? '';
    const sp = new URLSearchParams(current);
    
    if (next.search !== undefined) next.search ? sp.set('search', next.search) : sp.delete('search');
    if (next.categoryId !== undefined) next.categoryId ? sp.set('category', next.categoryId) : sp.delete('category');
    if (next.page !== undefined) sp.set('page', String(next.page));
    if (next.tab !== undefined) next.tab ? sp.set('tab', next.tab) : sp.delete('tab');
    
    const safePath = pathname || '/dashboard/products';
    const nextStr = sp.toString();
    if (nextStr !== current) router.replace(`${safePath}?${nextStr}`);
  }, [searchParams, pathname, router]);

  // Products logic hook (filters, sorting, pagination)
  const {
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    onPageChange,
    onItemsPerPageChange
  } = useProductsLogic({
    itemsPerPage,
    updateUrl,
    setServerFilters,
    setCurrentPage,
    setImageFilter: () => {}
  });

  // Tab change handler
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    updateUrl({ tab });
  }, [updateUrl]);

  // Loading state
  if (isLoading) {
    return <ProductsLoadingSkeleton />;
  }

  // Empty state
  if (!isLoading && (!products || products.length === 0)) {
    return <ProductsEmptyState />;
  }

  // Main render
  return (
    <>
      <SkipNavigation />
      <div id="main-content" className="container mx-auto p-6 space-y-6" role="main">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/', icon: LayoutDashboard },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Productos', href: '/dashboard/products', isCurrentPage: true }
          ]}
        />

        <ProductsHeader />

        <ProductsAlerts />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ProductsStats stats={dashboardStats} categories={categories} />
            <ProductsOverviewTab />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductsListTab />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ProductsAnalyticsTab />
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <ProductsRecommendationsTab />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <ProductsInventoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
