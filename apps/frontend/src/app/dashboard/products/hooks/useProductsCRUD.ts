import { useCallback } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { validateProduct } from '@/lib/validation/product-schemas';
import { addCSRFHeader } from '@/lib/security/csrf';

interface UseProductsCRUDOptions {
  updateProduct: (id: string, data: any) => Promise<any>;
  createProduct: (data: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useProductsCRUD({
  updateProduct,
  createProduct,
  deleteProduct,
  refetch
}: UseProductsCRUDOptions) {
  const router = useRouter();

  const getErrorMessage = useCallback((error: any, context: string = 'operación'): string => {
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
      if (context === 'crear' || context === 'guardar') {
        return 'Ya existe un producto con ese código SKU. Usa un código diferente.';
      }
      return 'Este registro ya existe en el sistema.';
    }
    
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('NetworkError')) {
      return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    }
    
    if (errorMsg.includes('permission') || errorMsg.includes('unauthorized') || errorMsg.includes('403')) {
      return 'No tienes permisos para realizar esta acción. Contacta al administrador.';
    }
    
    if (errorMsg.includes('validation') || errorMsg.includes('invalid') || errorMsg.includes('required')) {
      return 'Datos inválidos. Verifica todos los campos e intenta de nuevo.';
    }
    
    if (errorMsg.includes('not found') || errorMsg.includes('404')) {
      return 'El producto no fue encontrado. Puede haber sido eliminado.';
    }
    
    if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
      return 'La operación tardó demasiado. Intenta de nuevo.';
    }
    
    if (errorMsg && errorMsg.length > 0 && errorMsg !== '[object Object]') {
      return `Error: ${errorMsg}`;
    }
    
    return `Error al ${context}. Si el problema persiste, contacta al soporte.`;
  }, []);

  const retry = useCallback(async (fn: () => Promise<any>, attempts = 3) => {
    let lastError: any = null;
    for (let i = 0; i < attempts; i++) {
      try { 
        return await fn(); 
      } catch (e) { 
        lastError = e; 
        await new Promise(res => setTimeout(res, 300 * Math.pow(2, i))); 
      }
    }
    throw lastError;
  }, []);

  const toSupabasePayload = useCallback((productData: any) => {
    const r1000 = (n: any) => {
      const v = Number(n);
      if (!Number.isFinite(v) || v <= 0) return undefined;
      return Math.round(v / 1000) * 1000;
    };
    
    return {
      name: productData.name,
      sku: productData.code,
      description: productData.description,
      cost_price: r1000(productData.costPrice),
      sale_price: r1000(productData.price),
      wholesale_price: r1000(productData.wholesalePrice),
      offer_price: productData.offerActive ? r1000(productData.offerPrice) : undefined,
      stock_quantity: productData.stock,
      min_stock: productData.minStock,
      category_id: productData.categoryId,
      image_url: Array.isArray(productData.images) 
        ? (productData.images[0] || undefined) 
        : (productData.images || undefined),
      brand: productData.brand,
      shade: productData.shade,
      volume: productData.volume,
      spf: productData.spf,
      finish: productData.finish,
      coverage: productData.coverage,
      waterproof: productData.waterproof,
      vegan: productData.vegan,
      cruelty_free: productData.cruelty_free,
      expiration_date: productData.expiration_date,
      iva_rate: productData.ivaRate,
      iva_included: productData.ivaIncluded
    };
  }, []);

  const handleSaveProduct = useCallback(async (productData: any, editingProduct: any) => {
    // Validar datos con Zod
    const validation = validateProduct(productData, !!editingProduct);
    
    if (!validation.success) {
      const firstError = validation.errors
        ? (Object.values(validation.errors as Record<string, string[]>)[0]?.[0] as string | undefined)
        : undefined;
      toast.error(firstError || 'Datos inválidos. Verifica todos los campos.');
      return false;
    }

    try {
      if (editingProduct) {
        const prevStock = Number(editingProduct.stock_quantity || editingProduct.stock || 0);
        const nextStock = Number(productData.stock || 0);
        
        await retry(() => updateProduct(
          String(editingProduct.id), 
          toSupabasePayload(productData)
        ), 3);
        
        if (prevStock !== nextStock) {
          try { 
            const { inventoryAPI } = await import('@/lib/api'); 
            const delta = nextStock - prevStock; 
            if (delta !== 0) {
              await retry(() => inventoryAPI.adjustStock(
                String(editingProduct.id), 
                delta, 
                'Ajuste por edición de producto'
              ), 3); 
            }
          } catch { 
            toast.warning('No se pudo registrar movimiento de inventario'); 
          }
        }
        
        toast.success('Producto actualizado exitosamente');
      } else {
        const base = toSupabasePayload(productData) as any;
        await retry(() => createProduct({ ...base, is_active: true } as any), 3);
        toast.success('Producto creado exitosamente');
      }
      
      await refetch();
      return true;
    } catch (error) {
      console.error('Error guardando producto:', error);
      const context = editingProduct ? 'actualizar el producto' : 'crear el producto';
      toast.error(getErrorMessage(error, context));
      return false;
    }
  }, [retry, updateProduct, toSupabasePayload, createProduct, refetch, getErrorMessage]);

  const handleDeleteProduct = useCallback(async (productId: string, productName: string) => {
    try {
      const success = await deleteProduct(productId);
      if (success) {
        toast.success(`Producto "${productName}" eliminado correctamente`);
        await refetch();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(getErrorMessage(error, 'eliminar el producto'));
      return false;
    }
  }, [deleteProduct, refetch, getErrorMessage]);

  const handleViewProduct = useCallback((productId: string) => {
    router.push(`/dashboard/products/view/${productId}`);
  }, [router]);

  return {
    handleSaveProduct,
    handleDeleteProduct,
    handleViewProduct,
    getErrorMessage
  };
}
