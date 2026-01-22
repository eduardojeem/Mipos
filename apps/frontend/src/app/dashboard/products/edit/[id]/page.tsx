'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductForm from '@/components/products/ProductForm';
import productService from '@/services/productService';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LayoutDashboard } from 'lucide-react';
import { useStore } from '@/store';

import { Category } from '@/types/supabase'

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = (params?.id ?? '') as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any | undefined>(undefined);

  const setFormDataStore = useStore(s => s.setFormData);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [p, cats] = await Promise.all([
          productService.getProductById(productId),
          productService.getCategories()
        ]);

        setCategories(Array.isArray(cats) ? cats : []);

        const mapped = {
          id: p.id,
          name: p.name,
          code: p.sku,
          description: p.description || '',
          categoryId: (p as any).category_id ?? (p as any).categoryId ?? '',
          price: (p as any).sale_price ?? (p as any).salePrice ?? 0,
          costPrice: (p as any).cost_price ?? (p as any).costPrice ?? 0,
          wholesalePrice: Number((p as any).wholesale_price ?? (p as any).sale_price ?? 0),
          offerPrice: (p as any).offer_price ?? 0,
          stock: (p as any).stock_quantity ?? (p as any).stockQuantity ?? 0,
          minStock: (p as any).min_stock ?? (p as any).minStock ?? 0,
          image_url: (p as any).image_url || undefined,
          iva_rate: (p as any).iva_rate ?? undefined,
          iva_included: (p as any).iva_included ?? undefined,
        };
        setProduct(mapped);

        setFormDataStore({
          name: mapped.name,
          code: mapped.code,
          description: mapped.description || '',
          categoryId: mapped.categoryId,
          price: mapped.price,
          costPrice: mapped.costPrice,
          wholesalePrice: mapped.wholesalePrice,
          offerPrice: mapped.offerPrice,
          offerActive: !!(mapped.offerPrice && mapped.offerPrice > 0),
          stock: mapped.stock,
          minStock: mapped.minStock,
          images: mapped.image_url ? [mapped.image_url] : [],
          ivaRate: typeof mapped.iva_rate === 'number' ? Number(mapped.iva_rate) : undefined,
          ivaIncluded: !!mapped.iva_included,
          brand: (p as any).brand || '',
          shade: (p as any).shade,
          skin_type: (p as any).skin_type,
          ingredients: (p as any).ingredients,
          volume: (p as any).volume,
          spf: (p as any).spf,
          finish: (p as any).finish,
          coverage: (p as any).coverage,
          waterproof: (p as any).waterproof,
          vegan: (p as any).vegan,
          cruelty_free: (p as any).cruelty_free,
          expiration_date: (p as any).expiration_date,
        });
      } catch (error) {
        console.error('Error cargando datos de edición:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) loadData();
  }, [productId, setFormDataStore]);

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
