'use client';

import React, { useState } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import { useHasPermission } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, List, Filter, Download, RefreshCw } from 'lucide-react';
import { SmartSearchInput } from '../components/SmartSearchInput';
import { ProductsErrorBoundary } from '../components/ProductsErrorBoundary';
import { EnhancedProductsFilters } from '../components/EnhancedProductsFilters';
import dynamic from 'next/dynamic';
import { ExportService } from '../services/ExportService';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load heavy components
const ProductTable = dynamic(() => import('@/components/tables/LazyTableComponents').then(m => m.LazyProductTable), { ssr: false });
const EnhancedProductGrid = dynamic(() => import('@/components/products/EnhancedProductGrid').then(m => ({ default: m.EnhancedProductGrid })), { ssr: false });
const EnhancedProductCatalog = dynamic(() => import('@/components/catalog/EnhancedProductCatalog'), { ssr: false });
const BulkOperationsBar = dynamic(() => import('../components/BulkOperationsBar'), { ssr: false });

export default function ProductsListTab() {
  const { 
    products, 
    categories, 
    loading, 
    error,
    filters, 
    pagination, 
    selectedProducts,
    actions,
    computed,
    isMockMode,
    canRetrySupabase
  } = useProducts();
  
  const { hasPermission: canWriteProduct } = useHasPermission('products', 'write');
  const { hasPermission: canExportProduct } = useHasPermission('products', 'export');
  const { config } = useBusinessConfig();
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const getDomainProductById = (id: string) => products.find((dp) => dp.id === id);

  // Map products to expected format
  const mappedProducts = React.useMemo(() => products.map(p => ({
    id: p.id,
    name: p.name,
    code: p.sku || '',
    description: p.description,
    stock: p.stock_quantity || 0,
    minStock: p.min_stock || 0,
    price: p.sale_price || 0,
    costPrice: p.cost_price || 0,
    categoryId: p.category_id || '',
    category: p.category ? {
      id: p.category.id,
      name: p.category.name
    } : undefined,
    discount_percentage: p.discount_percentage,
    image: p.image_url,
    images: p.images || [],
    supplier: p.supplier ? {
      name: p.supplier.name
    } : undefined,
    createdAt: new Date(p.created_at || Date.now()),
    updatedAt: new Date(p.updated_at || Date.now())
  })), [products]);

  const handleExport = async (format: string) => {
    const f = format === 'excel' ? 'excel' : format === 'pdf' ? 'pdf' : 'csv';
    await ExportService.exportProducts(products as any[], f as any, {
      includeTotals: true,
      applyAutoFilter: true,
      title: 'Productos',
      branding: {
        name: config.businessName,
        logoDataUrl: config.branding?.logo,
        address: `${config.address.street}, ${config.address.city}`,
        phone: config.contact.phone,
      },
    });
  };

  return (
    <ProductsErrorBoundary
      error={error}
      isLoading={loading}
      onRetry={actions.switchToSupabase}
      onUseMockData={actions.switchToMockData}
    >
      <div className="space-y-6">
        {/* Mode indicator */}
        <AnimatePresence>
          {isMockMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Modo de Prueba - Usando datos de ejemplo
                  </span>
                </div>
                {canRetrySupabase && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.switchToSupabase}
                    className="text-yellow-800 border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Conectar a Supabase
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Filters and Controls */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Search and Quick Actions */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <SmartSearchInput
                    products={products}
                    categories={categories}
                    onSearchChange={(term) => actions.updateFilters({ search: term })}
                    onProductSelect={(productId) => actions.viewProduct(productId)}
                    placeholder="Buscar productos por nombre, SKU, categoría o proveedor..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={actions.refetch}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                  {canExportProduct && (
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel')}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Exportar
                    </Button>
                  )}
                </div>
              </div>

              {/* Enhanced Filters */}
              <EnhancedProductsFilters />

              {/* View Controls and Stats */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border/40 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="flex items-center gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Grilla
                  </Button>
                  
                  {computed.hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      <Filter className="w-3 h-3 mr-1" />
                      Filtros activos
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Mostrando {computed.filteredProducts.length} de {pagination.total} productos
                  </span>
                  {computed.selectedCount > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {computed.selectedCount} seleccionados
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk operations bar */}
        <AnimatePresence>
          {computed.selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BulkOperationsBar
                selectedCount={computed.selectedCount}
                onBulkDelete={() => actions.bulkDelete(selectedProducts)}
                onBulkUpdate={(updates) => actions.bulkUpdate(selectedProducts, updates)}
                onClearSelection={actions.clearSelection}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product catalog wrapper */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardContent className="p-0">
            <EnhancedProductCatalog
        products={mappedProducts}
        categories={categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          productCount: c.productCount || products.filter(p => p.category_id === c.id).length
        }))}
        isLoading={loading}
        onEdit={(product) => { const original = getDomainProductById(product.id); if (original) actions.editProduct(original as any); }}
        onView={(product) => actions.viewProduct(product.id)}
        onDelete={(productId) => actions.deleteProduct(productId, mappedProducts.find(m => m.id === productId)?.name || '')}
        onRefresh={actions.refetch}
        onExport={handleExport}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canEdit={canWriteProduct}
        canDelete={canWriteProduct}
        canExport={canExportProduct}
      >
        {/* Render the appropriate view based on viewMode */}
        {viewMode === 'list' ? (
          <ProductTable
            products={mappedProducts as any}
            isLoading={loading}
            onEdit={(product: any) => { const original = getDomainProductById(product.id); if (original) actions.editProduct(original as any); }}
            onDelete={(product: any) => actions.deleteProduct(product.id, product.name)}
            onView={(product: any) => actions.viewProduct(product.id)}
            onBulkAction={(action: string, ids: string[]) => {
              if (action === 'delete') {
                actions.bulkDelete(ids);
              }
            }}
            currentPage={pagination.page}
            itemsPerPage={pagination.limit}
            onPageChange={actions.setPage}
            onItemsPerPageChange={actions.setItemsPerPage}
            totalItems={pagination.total}
            hasMore={computed.hasMore}
            enableVirtualization={true}
            virtualizationHeight={720}
            onLoadMore={actions.loadMore}
            visibleColumns={{
              image: true,
              name: true,
              code: true,
              category: true,
              supplier: true,
              stock: true,
              price: true,
              offer: true,
              status: true
            }}
            searchValue={filters.search || ''}
            onSearchChange={(search: string) => actions.updateFilters({ search })}
            imageFilterValue={'all'}
            onImageFilterChange={() => {}}
            sortBy={filters.sortBy as any}
            sortOrder={filters.sortOrder || 'asc'}
            onSortChange={(field: string, order: 'asc' | 'desc') => {
              actions.updateFilters({ sortBy: field, sortOrder: order });
            }}
            canEdit={canWriteProduct}
            canDelete={canWriteProduct}
          />
        ) : (
          <EnhancedProductGrid
            products={mappedProducts as any}
            isLoading={loading}
            onEdit={(product) => { const original = getDomainProductById(product.id); if (original) actions.editProduct(original as any); }}
            onDelete={(productId) => actions.deleteProduct(productId, mappedProducts.find(m => m.id === productId)?.name || '')}
            onView={(product) => actions.viewProduct(product.id)}
            currentPage={pagination.page}
            itemsPerPage={pagination.limit}
            onPageChange={actions.setPage}
            onItemsPerPageChange={actions.setItemsPerPage}
            totalItems={pagination.total}
            canEdit={canWriteProduct}
            canDelete={canWriteProduct}
          />
        )}
            </EnhancedProductCatalog>
          </CardContent>
        </Card>
      </div>
    </ProductsErrorBoundary>
  );
}
