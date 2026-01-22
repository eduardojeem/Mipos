"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LayoutDashboard } from 'lucide-react';
import ProductForm from '@/components/products/ProductForm';
import productService from '@/services/productService';

import { Category } from '@/types/supabase'

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleCreate = async (data: any) => {
    setIsLoading(true);
    try {
      const payload: any = {
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
        image_url: data.images || undefined,
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

      <ProductForm
        categories={categories}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}