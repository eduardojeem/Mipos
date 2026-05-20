'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductForm } from '@/components/products';
import productService from '@/services/productService';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LayoutDashboard } from 'lucide-react';
import { Category } from '@/types/supabase'

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = (params?.id ?? '') as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any | undefined>(undefined);
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [p, cats] = await Promise.all([
          productService.getProductById(productId),
          productService.getCategories()
        ]);

        setCategories(Array.isArray(cats) ? cats : []);
        setProduct(p);
      } catch (error) {
        console.error('Error cargando datos de edición:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) loadData();
  }, [productId]);

  const handleUpdate = async (data: any) => {
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
      image_url: Array.isArray(data.images) ? (data.images[0] || undefined) : (data.images || undefined),
      images: Array.isArray(data.images) ? data.images : (data.images ? [data.images] : undefined),
      iva_included: !!data.ivaIncluded,
      iva_rate: typeof data.ivaRate === 'number' ? Number(data.ivaRate) : undefined,
      brand: data.brand,
      shade: data.shade,
      skin_type: data.skin_type,
      ingredients: data.ingredients,
      volume: data.volume,
      spf: data.spf,
      finish: data.finish,
      coverage: data.coverage,
      waterproof: data.waterproof,
      vegan: data.vegan,
      cruelty_free: data.cruelty_free,
      expiration_date: data.expiration_date,
    };

    await productService.updateProduct(productId, payload);
    router.push('/dashboard/products');
  };

  const handleCancel = () => {
    router.push('/dashboard/products');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/', icon: LayoutDashboard },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Productos', href: '/dashboard/products' },
          { label: 'Editar Producto', href: `/dashboard/products/edit/${productId}` }
        ]}
      />

      <ProductForm
        product={product}
        categories={categories}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}

