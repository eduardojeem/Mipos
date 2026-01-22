'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Package,
  Eye,
  MoreHorizontal,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination } from '@/components/catalog/Pagination';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useDebounce } from '@/hooks/useDebounce';
import ProductForm from './ProductForm';
import type { Category } from '@/types/supabase';

interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  discount_percentage?: number;
  image?: string;
  images?: string[];
  category?: Category;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductManagerProps {
  categories: Category[];
  enableRealtime?: boolean;
  showNotifications?: boolean;
  filters?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  };
}

export default function ProductManager({
  categories,
  enableRealtime = true,
  showNotifications = true,
  filters = { page: 1, limit: 100 }
}: ProductManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(filters.page || 1);
  const [itemsPerPage, setItemsPerPage] = useState(filters.limit || 100);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Usar el hook de productos en tiempo real
  const {
    products,
    loading,
    error,
    total,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    isConnected,
    hasMore
  } = useRealtimeProducts({
    enableRealtime,
    showNotifications,
    filters: {
      ...filters,
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      categoryId: selectedCategory
    }
  });

  // Use products directly from the hook as they are already filtered by the server
  const filteredProducts = products;

  const handleCreateProduct = async (data: any) => {
    try {
      await createProduct({
        name: data.name,
        sku: data.code,
        description: data.description,
        cost_price: data.costPrice,
        sale_price: data.price,
        stock_quantity: data.stock,
        min_stock: data.minStock,
        category_id: data.categoryId,
        image_url: Array.isArray(data.images) ? (data.images[0] || undefined) : (data.images || undefined),
        images: Array.isArray(data.images) ? data.images : (data.images ? [data.images] : []),
        iva_included: !!data.ivaIncluded,
        iva_rate: typeof data.ivaRate === 'number' ? Number(data.ivaRate) : undefined,
        is_active: true
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error creating product:', error);

      // Mostrar notificación de error al usuario
      toast.error('Error al crear producto', {
        description: error instanceof Error ? error.message : 'Intente nuevamente',
      });
    }
  };

  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct) return;

    try {
      await updateProduct(editingProduct.id, {
        name: data.name,
        sku: data.code,
        description: data.description,
        cost_price: data.costPrice,
        sale_price: data.price,
        stock_quantity: data.stock,
        min_stock: data.minStock,
        category_id: data.categoryId,
        image_url: Array.isArray(data.images) ? (data.images[0] || undefined) : (data.images || undefined),
        images: Array.isArray(data.images) ? data.images : (data.images ? [data.images] : []),
        iva_included: !!data.ivaIncluded,
        iva_rate: typeof data.ivaRate === 'number' ? Number(data.ivaRate) : undefined,
        is_active: editingProduct.is_active !== undefined ? editingProduct.is_active : true
      });
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);

      // Mostrar notificación de error al usuario
      toast.error('Error al actualizar producto', {
        description: error instanceof Error ? error.message : 'Intente nuevamente',
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch (error) {
      console.error('Error deleting product:', error);

      // Mostrar notificación de error al usuario
      toast.error('Error al eliminar producto', {
        description: error instanceof Error ? error.message : 'Intente nuevamente',
      });
    }
  };

  const openEditForm = (product: any) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const viewProduct = (product: any) => {
    setSelectedProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleDeleteConfirm = async (product: any) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${product.name}"?`)) {
      await handleDeleteProduct(product.id);
    }
  };

  const getStockStatus = (product: any) => {
    if (product.stock_quantity === 0) {
      return { label: 'Sin stock', variant: 'destructive' as const };
    } else if (product.stock_quantity <= product.min_stock) {
      return { label: 'Stock bajo', variant: 'secondary' as const };
    } else {
      return { label: 'En stock', variant: 'default' as const };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const lowStockProducts = filteredProducts.filter(p => p.stock_quantity <= p.min_stock && p.stock_quantity > 0);
  const outOfStockProducts = filteredProducts.filter(p => p.stock_quantity === 0);

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar productos: {error}
          </AlertDescription>
        </Alert>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de conexión en tiempo real */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Conectado en tiempo real</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Desconectado</span>
            </>
          )}
        </div>
        <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Alertas de stock */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="space-y-2">
          {outOfStockProducts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{outOfStockProducts.length}</strong> productos sin stock requieren reposición inmediata.
              </AlertDescription>
            </Alert>
          )}
          {lowStockProducts.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{lowStockProducts.length}</strong> productos tienen stock bajo.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Barra de herramientas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Gestión de Productos</span>
              <Badge variant="outline">{filteredProducts.length} de {total}</Badge>
            </CardTitle>
            <div className="flex space-x-2">
              <Button onClick={openCreateForm} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Nuevo Producto</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar productos por nombre, código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos */}
      {loading && filteredProducts.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Cargando productos...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Sin categoría';
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.sku}</p>
                      <Badge variant="outline" className="mt-1">
                        {categoryName}
                      </Badge>
                    </div>
                    {product.images && product.images.length > 0 && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden ml-3">
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Precio:</span>
                      <span className="font-semibold">{formatCurrency(product.sale_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Stock:</span>
                      <Badge variant={stockStatus.variant}>
                        {product.stock_quantity} - {stockStatus.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Costo:</span>
                      <span className="text-sm">{formatCurrency(product.cost_price)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewProduct(product)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditForm(product)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteConfirm(product)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {total > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(total / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={total}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            showInfo={true}
            showItemsPerPage={true}
          />
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategory
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primer producto'
              }
            </p>
            {!searchTerm && !selectedCategory && (
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Producto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct || undefined}
            categories={categories}
            onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
            onCancel={closeForm}
            mode={editingProduct ? 'edit' : 'create'}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para ver producto */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedProduct && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>{selectedProduct.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Código</label>
                    <p className="text-lg">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Categoría</label>
                    <p className="text-lg">{categories.find(c => c.id === selectedProduct.category_id)?.name || 'Sin categoría'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Precio de Venta</label>
                    <p className="text-lg font-semibold">{formatCurrency(selectedProduct.sale_price)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Precio de Costo</label>
                    <p className="text-lg">{formatCurrency(selectedProduct.cost_price)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedProduct.images && selectedProduct.images.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Imagen</label>
                      <div className="relative w-full h-48 rounded-lg overflow-hidden mt-2">
                        <Image
                          src={selectedProduct.images[0]}
                          alt={selectedProduct.name}
                          fill
                          sizes="100vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Stock Actual</label>
                  <p className="text-2xl font-bold">{selectedProduct.stock_quantity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stock Mínimo</label>
                  <p className="text-2xl font-bold">{selectedProduct.min_stock}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <Badge variant={getStockStatus(selectedProduct).variant} className="mt-1">
                    {getStockStatus(selectedProduct).label}
                  </Badge>
                </div>
              </div>

              {selectedProduct.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Descripción</label>
                  <p className="text-gray-700 mt-1">{selectedProduct.description}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  openEditForm(selectedProduct);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
