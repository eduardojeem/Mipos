'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Package, 
  Save, 
  X, 
  Upload, 
  AlertCircle,
  DollarSign,
  Hash,
  Tag,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-auth';
import { temporaryLocks, useTemporaryLock } from '@/lib/sync/temporary-locks';
import { useEditingIndicators } from '@/lib/sync/user-editing-indicators';
import { syncLogger } from '@/lib/sync/sync-logging';
import { useBusinessConfigData } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/store';
import styles from './product-form.module.css';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { LazyImage } from '@/components/ui/optimized-components';
import { ChevronDown } from 'lucide-react';
import SearchWithAutocomplete from '@/components/pos/SearchWithAutocomplete';
import PriceInputs from './form/PriceInputs';
import StockInputs from './form/StockInputs';
import type { Product as SupabaseProduct, Category as SupabaseCategory } from '@/types/supabase';

// Esquema de validación actualizado para Supabase con campos de cosméticos
export const productSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  code: z.string().min(3, 'El código debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Debe seleccionar una categoría'),
  price: z.number().min(0.01, 'El precio debe ser mayor a 0'),
  costPrice: z.number().min(0, 'El precio de costo no puede ser negativo'),
  wholesalePrice: z.number().min(0.01, 'El precio mayorista debe ser mayor a 0'),
  offerPrice: z.number().min(0, 'El precio de oferta no puede ser negativo').optional(),
  offerActive: z.boolean().optional(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  minStock: z.number().int().min(0, 'El stock mínimo no puede ser negativo'),
  images: z.array(z.string()).optional(),
  ivaIncluded: z.boolean().optional(),
  ivaRate: z.number().min(0, 'La tasa de IVA no puede ser negativa').max(100, 'La tasa de IVA no puede exceder 100').optional(),
  // Campos específicos de cosméticos
  brand: z.string().optional(),
  shade: z.string().optional(),
  skin_type: z.string().optional(),
  ingredients: z.string().optional(),
  volume: z.string().optional(),
  spf: z.number().optional(),
  finish: z.string().optional(),
  coverage: z.string().optional(),
  waterproof: z.boolean().optional(),
  vegan: z.boolean().optional(),
  cruelty_free: z.boolean().optional(),
  expiration_date: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.offerActive) {
    const offer = data.offerPrice ?? 0;
    if (offer <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El precio de oferta debe ser mayor a 0', path: ['offerPrice'] });
    }
    if (offer >= data.price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El precio de oferta debe ser menor al precio de venta', path: ['offerPrice'] });
    }
  }
});

export type ProductFormData = z.infer<typeof productSchema>;

type Category = SupabaseCategory;

type Product = SupabaseProduct;

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export default function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create'
}: ProductFormProps) {
  const user = useUser();
  const clientId = typeof window !== 'undefined' ? (window.navigator?.userAgent || 'client') : 'client';
  const businessConfig = useBusinessConfigData();

  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image_url || null
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    product?.image_url ? [product.image_url] : []
  );
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [codeValidation, setCodeValidation] = useState<{ isValid?: boolean; isValidating: boolean; message?: string }>({
    isValidating: false
  });
  const [lockInitialized, setLockInitialized] = useState(false);
  const [lockDenied, setLockDenied] = useState(false);
  const originalCodeRef = useRef<string | undefined>(product?.sku);
  const supabase = createClient();
  const supabaseBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PRODUCTS || 'products';
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Presence & locks only in edit mode with a valid product id
  const entityType = 'products';
  const entityId = product?.id ? String(product.id) : undefined;
  const { lockInfo, isLocked, ownsLock, acquireLock, releaseLock } = useTemporaryLock(
    entityType,
    entityId || 'new'
  );
  const { editingUsers, editorCount, isBeingEdited, startEditing, stopEditing } = useEditingIndicators(
    entityType,
    entityId || 'new'
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
    setValue,
    watch,
    reset,
    trigger
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange', // Validación en tiempo real
    defaultValues: {
      name: product?.name || '',
      code: (product?.sku as any) || '',
      description: product?.description || '',
      categoryId: (product as any)?.category_id || '',
      price: (product as any)?.sale_price || 0,
      costPrice: (product as any)?.cost_price || 0,
      wholesalePrice: (product as any)?.wholesale_price || 0,
      offerPrice: (product as any)?.offer_price || 0,
      offerActive: !!((product as any)?.offer_price && (product as any).offer_price > 0),
      stock: (product as any)?.stock_quantity || 0,
      minStock: (product as any)?.min_stock || 5,
      images: (product as any)?.images ?? (product?.image_url ? [product.image_url] : []),
      ivaIncluded: !!(product as any)?.iva_included,
      ivaRate: typeof (product as any)?.iva_rate === 'number' ? Number((product as any)?.iva_rate) : 12,
    }
  });

  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();

  const watchedValues = watch();
  const watchedPrice = watch('price');
  const watchedCostPrice = watch('costPrice');
  const watchedStock = watch('stock');
  const watchedMinStock = watch('minStock');
  const watchedOfferActive = watch('offerActive');
  const watchedOfferPrice = watch('offerPrice');
  const watchedIvaIncluded = watch('ivaIncluded');
  const watchedIvaRate = watch('ivaRate');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadTickerRef = useRef<NodeJS.Timeout | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const handleAddImageUrl = () => {
    if (!imageUrlInput) return;
    
    // Basic URL validation
    try {
      new URL(imageUrlInput);
    } catch {
      toast.error('URL inválida');
      return;
    }

    const limit = 8;
    if (galleryImages.length >= limit) {
      toast.error(`Límite de ${limit} imágenes alcanzado`);
      return;
    }

    const nextGallery = [...galleryImages, imageUrlInput];
    setGalleryImages(nextGallery);
    
    // Set as main image if it's the first one
    if (!imagePreview) {
      setImagePreview(imageUrlInput);
    }
    
    setValue('images', nextGallery, { shouldDirty: true, shouldValidate: true });
    setImageUrlInput('');
    toast.success('Imagen agregada correctamente');
  };

  const compressImage = async (file: File) => {
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1280;
      const maxSide = Math.max(bitmap.width, bitmap.height);
      const ratio = maxSide > maxDim ? maxDim / maxSide : 1;
      const w = Math.round(bitmap.width * ratio);
      const h = Math.round(bitmap.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.82));
      if (!blob) return file;
      const name = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    } catch {
      return file;
    }
  };

  const uploadWithRetry = async (bucket: string, path: string, file: File, attempts = 3) => {
    let lastError: any = null;
    for (let i = 0; i < attempts; i++) {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
      if (!error) return data;
      lastError = error;
      await new Promise(res => setTimeout(res, 300 * Math.pow(2, i)));
    }
    throw lastError;
  };

  const [offerDisplay, setOfferDisplay] = useState<string>('');
  const [categoryQuery, setCategoryQuery] = useState<string>('');
  const [recentCategories, setRecentCategories] = useState<string[]>([]);
  const categoriesForAutocomplete = useMemo(() => (
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: (c as any).description,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  ), [categories]);

  useEffect(() => {
    if (watchedOfferActive && typeof watchedOfferPrice === 'number') {
      setOfferDisplay(String(watchedOfferPrice));
    } else {
      setOfferDisplay('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('pos-recent-categories') : null;
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) setRecentCategories(arr);
      }
    } catch {}
    if ((product as any)?.category_id) {
      const selected = categoriesForAutocomplete.find(c => c.id === (product as any).category_id);
      if (selected) setCategoryQuery(selected.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computedIvaHints = useMemo(() => {
    const price = Number(watchedPrice) || 0;
    const rate = Math.max(0, Math.min(100, Number(watchedIvaRate) || 0));
    if (!price || !rate) return { priceWithIva: price, priceWithoutIva: price };
    if (watchedIvaIncluded) {
      const without = price / (1 + (rate / 100));
      return { priceWithIva: price, priceWithoutIva: without };
    } else {
      const withIva = price * (1 + (rate / 100));
      return { priceWithIva: withIva, priceWithoutIva: price };
    }
  }, [watchedPrice, watchedIvaIncluded, watchedIvaRate]);

  const currentProductId = product?.id ? String(product.id) : null;
  const setCurrentProductId = useStore(s => s.setCurrentProductId);
  const setFormDataStore = useStore(s => s.setFormData);
  const patchFormDataStore = useStore(s => s.patchFormData);
  const setIsEditingStore = useStore(s => s.setIsEditing);
  const externalFormData = useStore(s => s.formData);

  useEffect(() => {
    try {
      if (setCurrentProductId) setCurrentProductId(currentProductId);
      if (setFormDataStore) setFormDataStore(watchedValues);
      if (setIsEditingStore) setIsEditingStore(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPatched = useRef<string>('');
  const isApplyingExternal = useRef(false);
  useEffect(() => {
    try {
      const payload = JSON.stringify(watchedValues);
      const ext = externalFormData ? JSON.stringify(externalFormData) : '';
      if (isApplyingExternal.current) return;
      if (ext && payload === ext) return;
      if (lastPatched.current === payload) return;
      if (patchFormDataStore) patchFormDataStore(watchedValues);
      lastPatched.current = payload;
    } catch {}
  }, [watchedValues, patchFormDataStore, externalFormData]);

  useEffect(() => {
    if (!externalFormData) return;
    isApplyingExternal.current = true;
    const fields: (keyof ProductFormData)[] = [
      'name',
      'code',
      'description',
      'categoryId',
      'price',
      'costPrice',
      'wholesalePrice',
      'offerPrice',
      'offerActive',
      'stock',
      'minStock',
      'images',
    ];
    let hasDiff = false;
    for (const f of fields) {
      const cur = (watchedValues as any)[f];
      const ext = (externalFormData as any)[f];
      // Simple equality check; avoids resetting entire form
      const equal = JSON.stringify(cur) === JSON.stringify(ext);
      if (!equal) {
        setValue(f as any, ext as any, { shouldValidate: false, shouldDirty: false });
        hasDiff = true;
      }
    }
    if (!hasDiff) {
      // no-op when identical
    }
    isApplyingExternal.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalFormData]);

  // Calcular campos completados para el progreso
  const getCompletedFields = () => {
    const requiredFields = ['name', 'code', 'categoryId', 'price', 'costPrice'];
    return requiredFields.filter(field => {
      const value = watchedValues[field as keyof ProductFormData];
      return value !== '' && value !== 0 && value !== undefined;
    }).length;
  };

  // Calcular margen de ganancia
  useEffect(() => {
    if (watchedPrice && watchedCostPrice && watchedCostPrice > 0) {
      const margin = ((watchedPrice - watchedCostPrice) / watchedPrice) * 100;
      setProfitMargin(Math.round(margin * 100) / 100);
    } else {
      setProfitMargin(0);
    }
  }, [watchedPrice, watchedCostPrice]);

  useEffect(() => {
    if (!watchedOfferActive) {
      setValue('offerPrice', 0);
      setOfferDisplay('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedOfferActive]);

  const parseCurrencyRaw = (val: string): number => {
    if (!val) return 0;
    const decSep = businessConfig.config?.regional?.locale?.includes('es') ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    const normalized = val
      .replace(new RegExp(`\\${thouSep}`, 'g'), '')
      .replace(decSep, '.')
      .replace(/[^0-9.\-]/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrencyInteractive = (val: number): string => {
    try {
      return formatPrice(val, businessConfig.config);
    } catch {
      return String(val ?? '');
    }
  };

  // Initialize user context and attempt to acquire lock
  useEffect(() => {
    if (mode !== 'edit' || !entityId || lockInitialized) return;
    if (user?.id) {
      const userName = (user as any)?.fullName || (user as any)?.name || user.email || 'Usuario';
      try {
        temporaryLocks.setCurrentUser(user.id, userName, clientId);
      } catch (e) {
        // no-op
      }
    }
    const init = async () => {
      const timerId = syncLogger.startTimer('product_form_lock_acquire', { entityType, entityId });
      const result = await acquireLock('exclusive');
      syncLogger.endTimer(timerId, { status: result.status });
      if (result.status === 'denied') {
        setLockDenied(true);
        toast.error('Este producto está bloqueado por otro usuario', {
          description: result.reason || 'Inténtalo más tarde'
        });
        syncLogger.log('warn', 'Lock denegado en ProductForm', { entityType, entityId, reason: result.reason });
      } else {
        setLockDenied(false);
        syncLogger.log('info', 'Lock adquirido en ProductForm', { entityType, entityId });
      }
      setLockInitialized(true);
    };
    init();

    return () => {
      // Release lock on unmount
      if (entityId) {
        releaseLock().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entityId]);

  // Start/stop presence session
  useEffect(() => {
    if (mode !== 'edit' || !entityId || !user?.id) return;
    const userName = (user as any)?.fullName || (user as any)?.name || user.email || 'Usuario';
    startEditing({ userId: user.id, userName });
    syncLogger.log('info', 'Inicio de edición (presence) en ProductForm', { entityType, entityId, userId: user.id });
    return () => {
      stopEditing();
      syncLogger.log('info', 'Fin de edición (presence) en ProductForm', { entityType, entityId, userId: user?.id });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entityId, user?.id]);

  // Validación de código en tiempo real (SKU único en supabase)
  useEffect(() => {
    const code = watchedValues.code?.trim();
    if (!touchedFields.code) {
      setCodeValidation({ isValidating: false });
      return;
    }
    if (!code || code.length < 3) {
      setCodeValidation({ isValidating: false, isValid: undefined });
      return;
    }
    if (originalCodeRef.current && code === originalCodeRef.current) {
      setCodeValidation({ isValidating: false, isValid: true });
      return;
    }
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    validationTimerRef.current = setTimeout(async () => {
      try {
        setCodeValidation({ isValidating: true });
        const { data, error } = await supabase
          .from('products')
          .select('id, sku')
          .eq('sku', code)
          .eq('is_active', true)
          .limit(1);
        if (error) {
          setCodeValidation({ isValidating: false, isValid: undefined, message: 'Error validando código' } as any);
          return;
        }
        const exists = Array.isArray(data) && data.length > 0;
        const sameEntity = exists && entityId && String(data?.[0]?.id) === String(entityId);
        const isUnique = !exists || sameEntity;
        setCodeValidation({ isValidating: false, isValid: isUnique, message: isUnique ? undefined : 'Este código ya existe' } as any);
      } catch (err) {
        setCodeValidation({ isValidating: false, isValid: undefined, message: 'Error de validación' } as any);
      }
    }, 400);
    return () => { if (validationTimerRef.current) clearTimeout(validationTimerRef.current); };
  }, [watchedValues.code, touchedFields.code, entityId, supabase]);

  // Generar código automático
  const generateProductCode = () => {
    const prefix = 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const code = `${prefix}${timestamp}${randomNum}`;
    setValue('code', code);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const maxSize = 5 * 1024 * 1024;
    const limit = 8;
    const selectedFiles = Array.from(files).slice(0, limit - galleryImages.length);
    const allowed = selectedFiles.filter(f => f.size <= maxSize && f.type.startsWith('image/'));
    if (allowed.length < selectedFiles.length) {
      toast.error('Algunas imágenes fueron rechazadas por tamaño o tipo');
    }
    if (allowed.length === 0) return;
    try {
      setUploadingImage(true);
      setUploadProgress(0);
      if (uploadTickerRef.current) clearInterval(uploadTickerRef.current);
      uploadTickerRef.current = setInterval(() => {
        setUploadProgress(p => (p < 90 ? p + 5 : p));
      }, 250);
      const bucket = supabaseBucket;
      const urls: string[] = [];
      for (let i = 0; i < allowed.length; i++) {
        let file = allowed[i];
        if (file.size > 1024 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
          file = await compressImage(file);
        }
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const base = watchedValues.code || 'product';
        const path = `${base}-${Date.now()}-${i}.${ext}`;
        try {
          const data = await uploadWithRetry(bucket, path, file, 3);
          setUploadProgress(Math.min(90, Math.round(((i + 1) / allowed.length) * 90)));
          const pub = supabase.storage.from(bucket).getPublicUrl(data.path);
          const u = pub?.data?.publicUrl || '';
          if (u) urls.push(u);
        } catch {
          toast.error('Error subiendo imagen');
        }
      }
      const nextGallery = [...galleryImages, ...urls].slice(0, limit);
      setGalleryImages(nextGallery);
      const nextMain = imagePreview || nextGallery[0] || '';
      setImagePreview(nextMain || null);
      setValue('images', nextGallery);
      setUploadProgress(100);
    } finally {
      if (uploadTickerRef.current) clearInterval(uploadTickerRef.current);
      uploadTickerRef.current = null;
      setTimeout(() => { setUploadingImage(false); setUploadProgress(0); }, 600);
    }
  };

  const onFormSubmit = async (data: ProductFormData) => {
    try {
      if (mode === 'edit' && entityId && lockDenied) {
        toast.error('No puedes guardar mientras otro usuario tiene el bloqueo');
        return;
      }

      // Validaciones adicionales antes del envío
      if (data.price <= data.costPrice) {
        toast.error('El precio de venta debe ser mayor al precio de costo');
        return;
      }

      if (data.stock < data.minStock) {
        toast.warning('El stock actual es menor al stock mínimo configurado');
      }

      // Validar código único si es necesario
      if (codeValidation.isValid === false) {
        toast.error('El código del producto ya existe. Por favor, use uno diferente.');
        return;
      }

      if (mode === 'edit') {
        showConfirmation({
          title: 'Confirmar actualización',
          description: `Se guardarán los cambios en "${data.name}". ¿Deseas continuar?`,
          confirmText: 'Guardar cambios',
          cancelText: 'Cancelar',
          variant: 'info',
          onConfirm: async () => {
            await onSubmit(data);
            if (entityId) {
              await releaseLock().catch(() => {});
              stopEditing();
            }
            toast.success('Producto actualizado exitosamente', {
              description: `Los cambios en ${data.name} han sido guardados`
            });
            onCancel();
          }
        });
        return;
      }

      await onSubmit(data);

      if (mode === 'create') {
        reset();
        setImagePreview(null);
        toast.success('Producto creado exitosamente', {
          description: `${data.name} ha sido registrado en el inventario`
        });
      } else {
        toast.success('Producto actualizado exitosamente', {
          description: `Los cambios en ${data.name} han sido guardados`
        });
      }
    } catch (error: any) {
      console.error('Error en formulario de producto:', error);
      
      // Manejo específico de errores
      let errorMessage = mode === 'create' ? 'Error al crear el producto' : 'Error al actualizar el producto';
      let errorDescription = 'Por favor, intente nuevamente';

      if (error?.response?.status === 409) {
        errorMessage = 'Código de producto duplicado';
        errorDescription = 'Ya existe un producto con este código';
      } else if (error?.response?.status === 400) {
        errorMessage = 'Datos inválidos';
        errorDescription = 'Verifique que todos los campos estén correctos';
      } else if (error?.response?.status === 413) {
        errorMessage = 'Imagen muy grande';
        errorDescription = 'La imagen debe ser menor a 5MB';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Error del servidor';
        errorDescription = 'Problema temporal del sistema. Intente más tarde';
      } else if (error?.message) {
        errorDescription = error.message;
      }

      toast.error(errorMessage, {
        description: errorDescription
      });
    }
  };

  const handleCancel = React.useCallback(async () => {
    const hasChanges = Object.keys(dirtyFields || {}).length > 0;
    if (hasChanges) {
      const proceed = window.confirm('Hay cambios sin guardar. ¿Deseas salir sin guardar?');
      if (!proceed) return;
    }
    if (mode === 'edit' && entityId) {
      await releaseLock().catch(() => {});
      stopEditing();
    }
    onCancel();
  }, [dirtyFields, mode, entityId, releaseLock, stopEditing, onCancel]);

  // Atajos de teclado: Guardar (Ctrl+S) y Cancelar (Esc)
  useEffect(() => {
    const handler = (e: any) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        try { (document.getElementById('product-form-submit') as HTMLButtonElement)?.click(); } catch {}
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCancel]);

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProfitMarginIcon = (margin: number) => {
    if (margin >= 30) return <TrendingUp className="h-4 w-4" />;
    if (margin >= 15) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const suggestedPrice = useMemo(() => {
    const cost = Number(watchedCostPrice) || 0;
    const minMargin = (businessConfig?.config as any)?.pricing?.minMargin ?? 0.15;
    if (!cost || minMargin <= 0 || minMargin >= 0.95) return 0;
    const p = cost / (1 - minMargin);
    return Math.round(p * 100) / 100;
  }, [watchedCostPrice, businessConfig?.config]);

  const getStockStatus = () => {
    if (watchedStock <= watchedMinStock) {
      return { color: 'text-red-600', message: 'Stock crítico', icon: <AlertCircle className="h-4 w-4" /> };
    }
    if (watchedStock <= watchedMinStock * 2) {
      return { color: 'text-yellow-600', message: 'Stock bajo', icon: <AlertCircle className="h-4 w-4" /> };
    }
    return { color: 'text-green-600', message: 'Stock adecuado', icon: <CheckCircle className="h-4 w-4" /> };
  };

  const stockStatus = getStockStatus();

  return (
    <div className={styles.productForm}>
      <Card className="w-full max-w-4xl mx-auto rounded-[6px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 justify-center">
          <Package className="h-5 w-5" />
          <span
            className="inline-block text-center font-semibold text-[20px] px-[15px] py-[10px] mb-[15px] transition-all duration-300 hover:brightness-110 text-[#212529]"
          >
            {mode === 'create' ? 'Registrar Nuevo Producto' : 'Editar Producto'}
          </span>
        </CardTitle>
        {mode === 'edit' && entityId && (
          <div className="mt-2 flex items-center gap-2">
            {isLocked && !ownsLock ? (
              <Badge variant="destructive">Bloqueado por otro usuario</Badge>
            ) : (
              <Badge variant="default">Bloqueo activo</Badge>
            )}
            {isBeingEdited && (
              <Badge variant="outline">{editorCount} en edición</Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <FormProgress completedFields={getCompletedFields()} totalFields={5} />
        
        <TooltipProvider>
        <form 
          onSubmit={handleSubmit(onFormSubmit)} 
          className="space-y-6"
          role="form"
          aria-labelledby="product-form-title"
          aria-describedby="product-form-description"
        >
          <div className="sr-only">
            <h2 id="product-form-title">
              {product ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </h2>
            <p id="product-form-description">
              Complete los campos requeridos para {product ? 'actualizar' : 'crear'} el producto
            </p>
          </div>

          {/* Información básica */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Información Básica</h3>
            <fieldset className="grid gap-6 md:grid-cols-2">
            <legend className="sr-only">Información básica del producto</legend>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="name" className="flex items-center space-x-1">
                    <Tag className="h-4 w-4" aria-hidden="true" />
                    <span>Nombre del Producto *</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Ayuda nombre">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Nombre visible en el catálogo y punto de venta</TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Ej: Laptop Dell Inspiron 15"
                    className={cn(
                      "pr-8",
                      errors.name ? 'border-red-500' : 
                      touchedFields.name && !errors.name ? 'border-green-500' : ''
                    )}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : 'name-help'}
                  />
                  {touchedFields.name && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {errors.name ? (
                        <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                      )}
                    </div>
                  )}
                </div>
                <div id="name-help" className="sr-only">
                  Ingrese un nombre descriptivo para el producto
                </div>
                <ValidationIndicator 
                  isValid={touchedFields.name && !errors.name}
                  message={errors.name?.message}
                  fieldId="name-error"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="code" className="flex items-center space-x-1">
                    <Hash className="h-4 w-4" aria-hidden="true" />
                    <span>Código del Producto *</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Ayuda código">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Código único; use &quot;Generar&quot; para evitar duplicados</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="code"
                      {...register('code')}
                      placeholder="Ej: PRD001"
                      className={cn(
                        "pr-8",
                        errors.code ? 'border-red-500' : 
                        touchedFields.code && !errors.code && codeValidation.isValid ? 'border-green-500' : ''
                      )}
                      aria-required="true"
                      aria-invalid={!!errors.code || codeValidation.isValid === false}
                      aria-describedby={errors.code || codeValidation.message ? 'code-error' : 'code-help'}
                    />
                    {touchedFields.code && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        {codeValidation.isValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-hidden="true" />
                        ) : errors.code || codeValidation.isValid === false ? (
                          <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                        ) : codeValidation.isValid === true ? (
                          <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateProductCode}
                    className="whitespace-nowrap focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Generar código automático para el producto"
                  >
                    Generar
                  </Button>
                </div>
                <div id="code-help" className="sr-only">
                  Código único para identificar el producto. Use el botón generar para crear uno automáticamente
                </div>
                <ValidationIndicator 
                  isValid={codeValidation.isValid}
                  isValidating={codeValidation.isValidating}
                  message={errors.code?.message || codeValidation.message}
                  fieldId="code-error"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="categoryId" className="flex items-center space-x-1">
                    <Tag className="h-4 w-4" aria-hidden="true" />
                    <span>Categoría *</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Ayuda categoría">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Selecciona la categoría para organizar el catálogo</TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-2">
                  <SearchWithAutocomplete
                    products={[]}
                    categories={categoriesForAutocomplete}
                    value={categoryQuery}
                    onChange={setCategoryQuery}
                  onCategorySelect={(value) => {
                    setValue('categoryId', value);
                    trigger('categoryId');
                    const selected = categoriesForAutocomplete.find(c => c.id === value);
                    setCategoryQuery(selected ? selected.name : '');
                    try {
                      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('pos-recent-categories') : null;
                      const arr = saved ? JSON.parse(saved) : [];
                      const next = [value, ...arr.filter((x: string) => x !== value)].slice(0, 5);
                      setRecentCategories(next);
                      if (typeof window !== 'undefined') window.localStorage.setItem('pos-recent-categories', JSON.stringify(next));
                    } catch {}
                  }}
                  placeholder="Buscar categoría"
                  className="w-full"
                />
                {recentCategories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recentCategories.map((cid) => {
                      const c = categoriesForAutocomplete.find(cc => cc.id === cid);
                      if (!c) return null;
                      return (
                        <Button
                          key={cid}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setValue('categoryId', cid, { shouldDirty: true, shouldValidate: true });
                            setCategoryQuery(c.name);
                            trigger('categoryId');
                          }}
                        >
                          {c.name}
                        </Button>
                      );
                    })}
                  </div>
                )}
                </div>
                <Select
                  value={watchedValues.categoryId}
                  onValueChange={(value) => {
                    setValue('categoryId', value);
                    trigger('categoryId');
                  }}
                >
                  <SelectTrigger 
                    className={cn(
                      errors.categoryId ? 'border-red-500' : 
                      touchedFields.categoryId && !errors.categoryId ? 'border-green-500' : ''
                    )}
                    aria-required="true"
                    aria-invalid={!!errors.categoryId}
                    aria-describedby={errors.categoryId ? 'category-error' : 'category-help'}
                  >
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ValidationIndicator 
                  isValid={touchedFields.categoryId && !errors.categoryId}
                  message={errors.categoryId?.message}
                />
              </div>
            </div>

            {/* Imagen del producto */}
            <div className="space-y-4">
              <div>
                <Label className="flex items-center space-x-1">
                  <ImageIcon className="h-4 w-4" />
                  <span>Imagen del Producto</span>
                </Label>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Pegar URL de imagen (https://...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddImageUrl} variant="secondary">
                    Agregar URL
                  </Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors relative">
                  {imagePreview ? (
                    <div className="relative">
                      <LazyImage
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 rounded-lg"
                        placeholder="Cargando..."
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImagePreview(null);
                          setValue('images', []);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Haz clic para subir una imagen
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG hasta 5MB
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                {uploadingImage && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </div>

                {galleryImages.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Galería</span>
                      <span className="text-xs text-gray-400">{galleryImages.length}/8</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {galleryImages.map((img, idx) => (
                        <div key={idx} className={cn("relative rounded-md overflow-hidden border", imagePreview === img ? 'border-blue-500' : 'border-gray-200')}>
                          <LazyImage src={img} alt={`Imagen ${idx + 1}`} className="w-full h-20" placeholder="Cargando..." />
                          <div className="absolute inset-0 flex items-start justify-end p-1 gap-1">
                            <Button
                              type="button"
                              variant={imagePreview === img ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setImagePreview(img);
                          const reordered = [img, ...galleryImages.filter(g => g !== img)];
                          setValue('images', reordered);
                              }}
                              className={cn('h-6', imagePreview === img ? 'bg-[#4E73DF] hover:bg-[#405FCC] text-white' : '')}
                            >
                              Principal
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const next = galleryImages.filter(g => g !== img);
                                setGalleryImages(next);
                                if (imagePreview === img) {
                                  const nextMain = next[0] || null;
                                  setImagePreview(nextMain);
                                  setValue('images', nextMain ? [nextMain, ...next.filter(g => g !== nextMain)] : []);
                                } else {
                                  setValue('images', next);
                                }
                              }}
                              className="h-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </fieldset>
          </div>

          {/* Precios y márgenes */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Precios y Márgenes</h3>
            <PriceInputs register={register} errors={errors} touchedFields={touchedFields} />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="wholesalePrice" className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Precio Mayorista *</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Ayuda precio mayorista">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Precio para ventas por volumen</TooltipContent>
                  </Tooltip>
                </div>
              <div className="relative">
                <Input
                  id="wholesalePrice"
                  type="number"
                  step="0.01"
                  {...register('wholesalePrice', { valueAsNumber: true })}
                  placeholder="0.00"
                  className={cn(
                    "pr-8",
                    errors.wholesalePrice ? 'border-red-500' : 
                    touchedFields.wholesalePrice && !errors.wholesalePrice ? 'border-green-500' : ''
                  )}
                  aria-required="true"
                  aria-invalid={!!errors.wholesalePrice}
                />
                {touchedFields.wholesalePrice && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {errors.wholesalePrice ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}
              </div>
              <ValidationIndicator 
                isValid={touchedFields.wholesalePrice && !errors.wholesalePrice}
                message={errors.wholesalePrice?.message}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="offerActive" className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Activar oferta</span>
                </Label>
                <Switch
                  id="offerActive"
                  checked={!!watchedOfferActive}
                  onCheckedChange={(checked) => {
                    setValue('offerActive', !!checked, { shouldValidate: true, shouldDirty: true });
                    if (!checked) {
                      setValue('offerPrice', 0, { shouldValidate: true });
                      setOfferDisplay('');
                    }
                  }}
                  aria-label="Activar precio de oferta"
                />
              </div>
              <div className="mt-2">
                <Label htmlFor="offerPrice" className="text-sm text-muted-foreground">Precio de oferta</Label>
                <div className="relative">
                  <Input
                    id="offerPrice"
                    type="text"
                    inputMode="decimal"
                    disabled={!watchedOfferActive}
                    value={offerDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setOfferDisplay(raw);
                      const parsed = parseCurrencyRaw(raw);
                      setValue('offerPrice', parsed, { shouldValidate: true, shouldDirty: true });
                    }}
                    placeholder="0.00"
                    className={cn(
                      "pr-8",
                      errors.offerPrice ? 'border-red-500' : 
                      touchedFields.offerPrice && !errors.offerPrice ? 'border-green-500' : ''
                    )}
                  />
                  {watchedOfferActive && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {errors.offerPrice ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {watchedOfferActive && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatCurrencyInteractive(watchedOfferPrice || 0)}
                  </div>
                )}
                <ValidationIndicator 
                  isValid={watchedOfferActive && touchedFields.offerPrice && !errors.offerPrice}
                  message={errors.offerPrice?.message}
                />
              </div>
            </div>
            </div>

            <div className="grid gap-6 md:grid-cols-1">
            <div>
              <Label className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Margen de Ganancia</span>
              </Label>
              <div className={cn(
                "flex items-center space-x-2 p-3 rounded-lg border",
                profitMargin >= 30 ? 'bg-green-50 border-green-200' :
                profitMargin >= 15 ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              )}>
                <div className={getProfitMarginColor(profitMargin)}>
                  {getProfitMarginIcon(profitMargin)}
                </div>
                <span className={cn("font-semibold", getProfitMarginColor(profitMargin))}>
                  {profitMargin.toFixed(2)}%
                </span>
                {!!suggestedPrice && profitMargin < 15 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue('price', suggestedPrice, { shouldDirty: true, shouldValidate: true });
                      trigger('price');
                      toast.info('Precio sugerido aplicado');
                    }}
                  >
                    Aplicar precio sugerido
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {profitMargin >= 30 ? 'Excelente margen' :
                 profitMargin >= 15 ? 'Margen aceptable' :
                 'Margen bajo'}
              </p>
              {!!suggestedPrice && profitMargin < 15 && (
                <p className="text-xs text-muted-foreground">Sugerido: {formatCurrencyInteractive(suggestedPrice)}</p>
              )}
            </div>
          </div>

            <div className="grid gap-6 md:grid-cols-3 mt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="ivaIncluded"
                  checked={!!watchedIvaIncluded}
                  onCheckedChange={(v) => setValue('ivaIncluded', v, { shouldDirty: true })}
                />
                <Label htmlFor="ivaIncluded">Precio incluye IVA</Label>
              </div>
              <div>
                <Label htmlFor="ivaRate">Tasa de IVA (%)</Label>
                <Input
                  id="ivaRate"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  {...register('ivaRate', { valueAsNumber: true })}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {watchedIvaIncluded ? (
                  <div>
                    <div>Sin IVA: <span className="font-semibold">{formatPrice(computedIvaHints.priceWithoutIva, businessConfig.config)}</span></div>
                    <div>Con IVA: <span className="font-semibold">{formatPrice(computedIvaHints.priceWithIva, businessConfig.config)}</span></div>
                  </div>
                ) : (
                  <div>
                    <div>Con IVA: <span className="font-semibold">{formatPrice(computedIvaHints.priceWithIva, businessConfig.config)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Inventario</h3>
            <StockInputs register={register} errors={errors} touchedFields={touchedFields} />
          </div>

          {/* Descripción */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Descripción</h3>
            <Label htmlFor="description" className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>Descripción</span>
              <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripción detallada del producto..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Campos específicos de cosméticos */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Información de Cosmético (Opcional)</h3>
            <fieldset className="space-y-4">
            <legend className="sr-only">Información de Cosmético</legend>
            
            <Collapsible defaultOpen={false}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ChevronDown className="h-4 w-4" />
                    <span>Mostrar campos opcionales</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-6 mt-4">
            {/* Marca y Tono */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="brand" className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>Marca</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Input
                  id="brand"
                  {...register('brand')}
                  placeholder="Ej: L'Oréal, Maybelline, MAC"
                />
              </div>
              
              <div>
                <Label htmlFor="shade" className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>Tono/Color</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Input
                  id="shade"
                  {...register('shade')}
                  placeholder="Ej: Nude, Beige, Coral"
                />
              </div>
            </div>

            {/* Tipo de piel y Volumen */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="skin_type" className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>Tipo de Piel</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Select
                  value={watchedValues.skin_type || ''}
                  onValueChange={(value) => setValue('skin_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de piel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grasa">Grasa</SelectItem>
                    <SelectItem value="seca">Seca</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                    <SelectItem value="sensible">Sensible</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="todo">Todo tipo de piel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="volume" className="flex items-center space-x-1">
                  <Package className="h-4 w-4" />
                  <span>Volumen/Tamaño</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Input
                  id="volume"
                  {...register('volume')}
                  placeholder="Ej: 30ml, 15g, 100ml"
                />
              </div>
            </div>

            {/* SPF y Acabado */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="spf" className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>Factor de Protección Solar (SPF)</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Input
                  id="spf"
                  type="number"
                  {...register('spf', { valueAsNumber: true })}
                  placeholder="Ej: 15, 30, 50"
                />
              </div>
              
              <div>
                <Label htmlFor="finish" className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>Acabado</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Select
                  value={watchedValues.finish || ''}
                  onValueChange={(value) => setValue('finish', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar acabado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mate">Mate</SelectItem>
                    <SelectItem value="satinado">Satinado</SelectItem>
                    <SelectItem value="brillante">Brillante</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="dewy">Dewy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cobertura y Fecha de Vencimiento */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="coverage" className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>Cobertura</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Select
                  value={watchedValues.coverage || ''}
                  onValueChange={(value) => setValue('coverage', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobertura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ligera">Ligera</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="completa">Completa</SelectItem>
                    <SelectItem value="buildable">Modulable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expiration_date" className="flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Fecha de Vencimiento</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <Input
                  id="expiration_date"
                  type="date"
                  {...register('expiration_date')}
                />
              </div>
            </div>

            {/* Características especiales — removido */}

            {/* Ingredientes */}
            <div>
              <Label htmlFor="ingredients" className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>Ingredientes Principales</span>
                <span className="ml-2 text-xs text-muted-foreground">(Opcional)</span>
              </Label>
            <Textarea
              id="ingredients"
              {...register('ingredients')}
              placeholder="Ej: Ácido hialurónico, Vitamina C, Retinol..."
              rows={2}
              className="resize-none"
            />
          </div>
          </CollapsibleContent>
          </Collapsible>
          </fieldset>
          </div>

          {/* Alertas de validación global */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor, corrige los errores antes de continuar.
              </AlertDescription>
            </Alert>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting || isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || Object.keys(errors).length > 0 || (mode === 'edit' && lockDenied)}
              className="min-w-[120px]"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creando...' : 'Actualizando...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Crear Producto' : 'Actualizar Producto'}
                </>
              )}
            </Button>
          </div>
          </form>
          </TooltipProvider>
          </CardContent>
          </Card>
          <ConfirmationDialog />
    </div>
  );
}

// Componente para indicador de validación en tiempo real
export const ValidationIndicator = ({ isValid, isValidating, message, fieldId }: { 
  isValid?: boolean; 
  isValidating?: boolean; 
  message?: string;
  fieldId?: string;
}) => {
  if (isValidating) {
    return (
      <div 
        className="flex items-center space-x-1 text-blue-500"
        id={fieldId ? `${fieldId}-validation` : undefined}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        <span className="text-xs">Validando...</span>
      </div>
    );
  }
  
  if (isValid === true) {
    return (
      <div 
        className="flex items-center space-x-1 text-green-500"
        id={fieldId ? `${fieldId}-validation` : undefined}
        role="status"
        aria-live="polite"
      >
        <CheckCircle className="h-3 w-3" aria-hidden="true" />
        <span className="text-xs">Válido</span>
      </div>
    );
  }
  
  if (isValid === false && message) {
    return (
      <div 
        className="flex items-center space-x-1 text-red-500"
        id={fieldId ? `${fieldId}-validation` : undefined}
        role="alert"
        aria-live="assertive"
      >
        <XCircle className="h-3 w-3" aria-hidden="true" />
        <span className="text-xs">{message}</span>
      </div>
    );
  }
  
  return null;
};

// Componente para mostrar el progreso del formulario
const FormProgress = ({ completedFields, totalFields }: { completedFields: number; totalFields: number }) => {
  const progress = (completedFields / totalFields) * 100;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Progreso del formulario</span>
        <span className="text-sm text-gray-500">{completedFields}/{totalFields} campos</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};
