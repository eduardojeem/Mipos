"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AlertTriangle, LayoutDashboard } from 'lucide-react';
import { ProductForm } from '@/components/products';
import productService from '@/services/productService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePermissionsContext } from '@/hooks/use-unified-permissions';
import { canCreateProducts } from '../utils/product-permissions';

import type { Product } from '@/types';
import type { ProductFormData } from '@/components/products/types/productForm.types';
import type { Category } from '@/types/supabase';

export default function CreateProductPage() {
  const router = useRouter();
  const permissionsContext = usePermissionsContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const canCreateProduct = canCreateProducts({
    permissions: permissionsContext.permissions,
    roles: permissionsContext.roles,
    hasPermission: permissionsContext.hasPermission,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await productService.getCategories();
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleCreate = async (data: ProductFormData) => {
    if (!canCreateProduct) {
      throw new Error('No tienes permisos para crear productos.');
    }

    setIsLoading(true);
    try {
      const payload: Partial<Product> = {
        name: data.name,
        sku: data.code,
        description: data.description || undefined,
        cost_price: data.costPrice,
        sale_price: data.price,
        wholesale_price: data.wholesalePrice,
        offer_price: data.offerActive && data.offerPrice ? data.offerPrice : undefined,
        stock_quantity: data.stock,
        min_stock: data.minStock,
        category_id: data.categoryId,
        image_url: data.images?.[0] || undefined,
        images: Array.isArray(data.images) ? data.images : undefined,
        is_active: true,
      };

      const created = await productService.createProduct(payload);
      if (created?.id) {
        router.push('/dashboard/products');
      } else {
        throw new Error('No se pudo crear el producto');
      }
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/', icon: LayoutDashboard },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Productos', href: '/dashboard/products' },
          { label: 'Crear Producto', href: '/dashboard/products/create' }
        ]}
      />

      {permissionsContext.loading ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Verificando permisos...
        </div>
      ) : canCreateProduct ? (
        <ProductForm
          categories={categories}
          onSubmit={handleCreate}
          onCancel={handleCancel}
          isLoading={isLoading}
          mode="create"
        />
      ) : (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="flex flex-col gap-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>No tienes permisos para crear productos. Contacta al administrador.</span>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/products')}>
              Volver a productos
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
