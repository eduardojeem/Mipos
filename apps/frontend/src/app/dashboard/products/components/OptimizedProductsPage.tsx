'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useOptimizedProducts, useProductStats } from '@/hooks/useOptimizedProducts';
import { createClient } from '@/lib/supabase/client';
import { SimpleProductList } from '@/components/products/SimpleProductList';
import { ProductsTableView } from '@/components/products/ProductsTableView';
import { BulkActions } from '@/components/products/BulkActions';
import { ProductDetailsModal } from '@/components/products/ProductDetailsModal';
import { ProductEditModal } from '@/components/products/ProductEditModal';
import { Pagination, PaginationInfo, PageSizeSelector } from '@/components/ui/Pagination';
import { ProductsFilters } from '@/components/products/ProductsFilters';
import { ProductsStats } from '@/components/products/ProductsStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  RefreshCw,
  Plus,
  Download,
  LayoutGrid,
  List,
  Settings
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import type { Product } from '@/types';

interface OptimizedProductsPageProps {
  className?: string;
}

export function OptimizedProductsPage({ className = '' }: OptimizedProductsPageProps) {
  // Supabase client
  const supabase = createClient();



  // Authentication and permissions
  const { user, canManageProducts, hasPermission } = useAuth();
  const canCreateProduct = canManageProducts();
  const canExportProducts = hasPermission('products.read');

  // Local state
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    page: 1,
    limit: 25,
    sortBy: 'updated_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data hooks
  const {
    products,
    loading,
    error,
    total,
    hasMore,
    refetch,
    loadMore,
    currentPage,
    totalPages,
    itemsPerPage
  } = useOptimizedProducts(filters);

  const { stats, loading: statsLoading } = useProductStats();

  // Memoized categories from products
  const categories = useMemo(() => {
    const categoryMap = new Map();
    products.forEach(product => {
      if (product.category && typeof product.category === 'object') {
        categoryMap.set(product.category.id, product.category);
      }
    });
    return Array.from(categoryMap.values());
  }, [products]);

  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Modal state
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });

  const [editModal, setEditModal] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });

  // Login modal state
  const [loginModal, setLoginModal] = useState(false);

  // Event handlers
  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1 // Reset page when filters change
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy: field, sortOrder: order, page: 1 }));
  }, []);

  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((productIds: string[]) => {
    setSelectedProducts(new Set(productIds));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Array.from(selectedProducts);
    console.log('Bulk delete:', selectedIds);
    toast.info(`Eliminando ${selectedIds.length} productos`);
    // TODO: Implement bulk delete
    handleClearSelection();
  }, [selectedProducts, handleClearSelection]);

  const handleBulkEdit = useCallback(() => {
    const selectedIds = Array.from(selectedProducts);
    console.log('Bulk edit:', selectedIds);
    toast.info(`Editando ${selectedIds.length} productos`);
    // TODO: Open bulk edit modal
  }, [selectedProducts]);

  const handleBulkExport = useCallback(() => {
    const selectedIds = Array.from(selectedProducts);
    const selectedProductsData = products.filter(p => selectedIds.includes(p.id));
    console.log('Bulk export:', selectedProductsData);
    toast.info(`Exportando ${selectedIds.length} productos`);
    // TODO: Implement bulk export
  }, [selectedProducts, products]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast.success('Productos actualizados');
    } catch (err) {
      toast.error('Error al actualizar productos');
    }
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loading) {
      try {
        await loadMore();
      } catch (err) {
        toast.error('Error al cargar más productos');
      }
    }
  }, [hasMore, loading, loadMore]);

  const handleProductEdit = useCallback((product: Product) => {
    setEditModal({ open: true, product });
  }, []);

  const handleProductDelete = useCallback(async (productId: string) => {
    // TODO: Implement delete with confirmation
    console.log('Delete product:', productId);
    toast.info(`Eliminando producto: ${productId}`);
  }, []);

  const handleProductView = useCallback((product: Product) => {
    setDetailsModal({ open: true, product });
  }, []);

  const handleCreateProduct = useCallback(() => {
    if (!user) {
      setLoginModal(true);
      return;
    }

    if (!canCreateProduct) {
      toast.error('No tienes permisos para crear productos. Contacta al administrador.');
      return;
    }

    setEditModal({ open: true, product: null });
  }, [user, canCreateProduct]);

  // Modal handlers
  const handleSaveProduct = useCallback(async (productData: Partial<Product>) => {
    try {
      console.log('Saving product:', productData);

      if (editModal.product) {
        // Update existing product - TODO: Implement update API
        console.log('Updating product with data:', productData);

        const response = await fetch(`/api/products/${editModal.product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar producto');
        }

        const result = await response.json();
        console.log('Product updated successfully:', result);
      } else {
        // Create new product using API route
        console.log('Creating product with data:', productData);

        // Check authentication first
        if (!user) {
          throw new Error('Usuario no autenticado. Por favor inicia sesión.');
        }

        // Check permissions
        if (!canCreateProduct) {
          throw new Error('No tienes permisos para crear productos. Contacta al administrador.');
        }

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          let errorData: any = {};
          let errorMessage = 'Error al crear producto';

          try {
            const text = await response.text();
            console.error('API Response Text:', text);

            if (text) {
              errorData = JSON.parse(text);
              console.error('API Error Data:', errorData);
            }
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            errorMessage = `Error del servidor (${response.status}): No se pudo procesar la respuesta`;
            throw new Error(errorMessage);
          }

          // Construir mensaje de error detallado
          errorMessage = errorData.error || errorMessage;

          // Si hay detalles adicionales, agregarlos
          if (errorData.details) {
            if (Array.isArray(errorData.details)) {
              // Errores de validación de Zod
              const validationErrors = errorData.details.map((err: any) =>
                `${err.path?.join('.') || 'campo'}: ${err.message}`
              ).join(', ');
              errorMessage = `${errorMessage}: ${validationErrors}`;
            } else if (typeof errorData.details === 'string') {
              errorMessage = `${errorMessage}: ${errorData.details}`;
            }
          }

          if (response.status === 401) {
            throw new Error('Usuario no autenticado. Por favor inicia sesión nuevamente.');
          } else if (response.status === 403) {
            throw new Error('No tienes permisos para crear productos. Contacta al administrador.');
          } else {
            throw new Error(errorMessage);
          }
        }

        const result = await response.json();
        console.log('Product created successfully:', result);
      }

      // Refresh products list
      await refetch();

    } catch (error) {
      console.error('Error saving product:', error);
      throw error; // Re-throw to let modal handle the error
    }
  }, [editModal.product, refetch, user, canCreateProduct]);

  const handleDeleteFromModal = useCallback(async (productId: string) => {
    try {
      console.log('Deleting product:', productId);

      // Delete product from Supabase
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        throw new Error(`Error al eliminar producto: ${error.message}`);
      }

      // Refresh products list
      await refetch();

      toast.success('Producto eliminado');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  }, [refetch, supabase]);

  const handleExportProducts = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export products');
    toast.info('Exportando productos');
  }, []);

  // Error state
  if (error && products.length === 0) {
    return (
      <div className={`container mx-auto p-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Error al cargar productos: {error}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`container mx-auto p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 dark:from-violet-500/20 dark:via-fuchsia-500/20 dark:to-pink-500/20 border border-violet-200/50 dark:border-violet-800/50 p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">Productos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu inventario de productos de belleza
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-violet-200/50 dark:border-violet-800/50 rounded-lg p-1 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 p-0 ${viewMode === 'grid'
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md'
                    : 'hover:bg-violet-100 dark:hover:bg-violet-900/30'
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 w-8 p-0 ${viewMode === 'list'
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md'
                    : 'hover:bg-violet-100 dark:hover:bg-violet-900/30'
                  }`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Export Button */}
            {canExportProducts && (
              <Button
                variant="outline"
                onClick={handleExportProducts}
                className="gap-2 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            )}

            {/* Create Button */}
            {canCreateProduct && (
              <Button
                onClick={handleCreateProduct}
                className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Producto</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <ProductsStats
        products={products}
        total={total}
        loading={statsLoading}
      />

      {/* Filters */}
      <ProductsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        categories={categories}
        loading={loading}
      />

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedProducts.size}
        onBulkDelete={handleBulkDelete}
        onBulkEdit={handleBulkEdit}
        onBulkExport={handleBulkExport}
        onClearSelection={handleClearSelection}
      />

      {/* Results Summary and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={total}
          />
          {filters.search && (
            <Badge variant="secondary" className="gap-1 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
              Búsqueda: "{filters.search}"
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="gap-1 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
              Categoría: {categories.find(c => c.id === filters.categoryId)?.name}
            </Badge>
          )}
          {selectedProducts.size > 0 && (
            <Badge variant="outline" className="gap-1 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-400 dark:border-violet-600 font-semibold">
              {selectedProducts.size} seleccionados
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {error && products.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Error parcial
            </Badge>
          )}
          <PageSizeSelector
            pageSize={itemsPerPage}
            onPageSizeChange={handlePageSizeChange}
            options={[10, 25, 50, 100]}
          />
        </div>
      </div>

      {/* Products List */}
      <Card className="border-violet-200/50 dark:border-violet-800/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
        <CardContent className="p-0">
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Cargando productos...</span>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center p-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filters.search || filters.categoryId
                  ? 'No se encontraron productos con los filtros aplicados'
                  : 'Comienza agregando tu primer producto'
                }
              </p>
              {canCreateProduct && !filters.search && !filters.categoryId && (
                <Button onClick={handleCreateProduct} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primer Producto
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <SimpleProductList
                  products={products}
                  onEdit={handleProductEdit}
                  onDelete={handleProductDelete}
                  onView={handleProductView}
                  loading={loading}
                />
              ) : (
                <ProductsTableView
                  products={products}
                  onEdit={handleProductEdit}
                  onDelete={handleProductDelete}
                  onView={handleProductView}
                  onSort={handleSort}
                  sortField={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  loading={loading}
                  selectedIds={selectedProducts}
                  onSelectProduct={handleSelectProduct}
                  onSelectAll={handleSelectAll}
                />
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/40">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    maxVisiblePages={5}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Performance Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Performance Info (Dev Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>Products rendered: {products.length}</div>
            <div>Total products: {total}</div>
            <div>Has more: {hasMore ? 'Yes' : 'No'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>View mode: {viewMode}</div>
          </CardContent>
        </Card>
      )}

      {/* Product Details Modal */}
      <ProductDetailsModal
        product={detailsModal.product}
        open={detailsModal.open}
        onOpenChange={(open) => setDetailsModal({ open, product: open ? detailsModal.product : null })}
        onEdit={handleProductEdit}
        onDelete={handleDeleteFromModal}
      />

      {/* Product Edit Modal */}
      <ProductEditModal
        product={editModal.product}
        open={editModal.open}
        onOpenChange={(open) => setEditModal({ open, product: open ? editModal.product : null })}
        onSave={handleSaveProduct}
      />

      {/* Login Modal */}
      <LoginModal
        open={loginModal}
        onOpenChange={setLoginModal}
      />
    </div>
  );
}