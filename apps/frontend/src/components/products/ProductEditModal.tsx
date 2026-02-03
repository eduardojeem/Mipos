'use client';

import React, { memo, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Package, 
  Tag, 
  DollarSign, 
  Upload,
  Save,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Percent,
  Plus,
  Building2,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import NextImage from 'next/image';

interface ProductEditModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  categories?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
}

interface ProductFormData {
  name: string;
  sku: string;
  description?: string;
  sale_price: number;
  cost_price?: number;
  offer_price?: number;
  has_offer: boolean;
  wholesale_price?: number;
  stock_quantity: number;
  min_stock: number;
  max_stock?: number;
  category_id: string;
  supplier_id?: string;
  barcode?: string;
  is_active: boolean;
  image_url?: string;
}

export const ProductEditModal = memo(function ProductEditModal({
  product,
  open,
  onOpenChange,
  onSave,
  categories: propCategories = [],
  suppliers: propSuppliers = []
}: ProductEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>(propCategories);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>(propSuppliers);
  const [loadingData, setLoadingData] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const supabase = createClient() as SupabaseClient<Database>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    clearErrors,
    trigger
  } = useForm<ProductFormData>();

  const isActive = watch('is_active');
  const hasOffer = watch('has_offer');
  const categoryId = watch('category_id');
  const productName = watch('name');
  // Verificar autenticación
  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, [supabase]);

  // Cargar categorías y proveedores desde Supabase
  const loadCategoriesAndSuppliers = useCallback(async () => {
    if (!open) return;
    
    setLoadingData(true);
    try {
      // Verificar autenticación
      const user = await checkAuth();
      if (!user) {
        toast.error('Debes estar autenticado para acceder a esta funcionalidad');
        return;
      }

      let orgId: string | null = null;
      let orgIds: string[] = [];
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('selected_organization') : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            orgId = parsed?.id || parsed?.organization_id || null;
          } catch {
            orgId = raw;
          }
        }
        if (!orgId) {
          const { data: mem } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id);
          orgIds = ((mem ?? []) as Array<{ organization_id: string }>).map((m) => m.organization_id).filter(Boolean);
          if (orgIds.length === 1) orgId = orgIds[0];
        }
      } catch {}

      // Cargar categorías
      let catQuery = supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (orgId) catQuery = catQuery.eq('organization_id', orgId);
      else if (orgIds.length) catQuery = catQuery.in('organization_id', orgIds);
      const { data: categoriesData, error: categoriesError } = await catQuery;

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        if (categoriesError.message.includes('row-level security')) {
          toast.error('Sin permisos para ver categorías. Contacta al administrador.');
        } else {
          toast.error('Error al cargar categorías');
        }
      } else {
        setCategories(categoriesData || []);
      }

      // Cargar proveedores
      let supQuery = supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (orgId) supQuery = supQuery.eq('organization_id', orgId);
      else if (orgIds.length) supQuery = supQuery.in('organization_id', orgIds);
      const { data: suppliersData, error: suppliersError } = await supQuery;

      if (suppliersError) {
        console.error('Error loading suppliers:', suppliersError);
        if (suppliersError.message.includes('row-level security')) {
          toast.error('Sin permisos para ver proveedores. Contacta al administrador.');
        } else {
          toast.error('Error al cargar proveedores');
        }
      } else {
        setSuppliers(suppliersData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoadingData(false);
    }
  }, [supabase, open, checkAuth]);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadCategoriesAndSuppliers();
    }
  }, [open, loadCategoriesAndSuppliers]);

  // Limpiar estados cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setShowCreateCategory(false);
      setShowCreateSupplier(false);
      setNewCategoryName('');
      setNewSupplierName('');
      setAutoGenerateSku(true); // Resetear a automático
    }
  }, [open]);

  // Reset form when product changes
  useEffect(() => {
    if (product && open) {
      const formData: ProductFormData = {
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        sale_price: product.sale_price || 0,
        cost_price: product.cost_price || 0,
        offer_price: product.offer_price || 0,
        has_offer: Boolean(product.offer_price && product.offer_price > 0),
        wholesale_price: product.wholesale_price || 0,
        stock_quantity: product.stock_quantity || 0,
        min_stock: product.min_stock || 5,
        max_stock: product.max_stock || 0,
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || 'none',
        barcode: product.barcode || '',
        is_active: product.is_active ?? true,
        image_url: product.image_url || ''
      };
      
      reset(formData);
      setImagePreview(product.image_url || null);
      setAutoGenerateSku(false); // Desactivar auto-generación para productos existentes
    } else if (!product && open) {
      // New product
      reset({
        name: '',
        sku: '',
        description: '',
        sale_price: 0,
        cost_price: 0,
        offer_price: 0,
        has_offer: false,
        stock_quantity: 0,
        min_stock: 5,
        category_id: '',
        supplier_id: 'none',
        is_active: true
      });
      setImagePreview(null);
    }
  }, [product, open, reset]);

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    
    // Verificar si hay errores de validación antes de proceder
    const formErrors = Object.keys(errors);
    if (formErrors.length > 0) {
      toast.error('Por favor corrige los errores en el formulario antes de continuar');
      setLoading(false);
      return;
    }

    try {
      // Convertir a números para validaciones
      const costPrice = Number(data.cost_price) || 0;
      const salePrice = Number(data.sale_price) || 0;
      const offerPrice = Number(data.offer_price) || 0;
      const wholesalePrice = Number(data.wholesale_price) || 0;

      // Validaciones de lógica de negocio críticas
      if (salePrice <= 0) {
        toast.error('El precio de venta debe ser mayor a 0');
        return;
      }

      if (costPrice > 0 && costPrice >= salePrice) {
        toast.error('El precio de costo debe ser menor al precio de venta');
        return;
      }

      if (data.has_offer && offerPrice > 0) {
        if (offerPrice >= salePrice) {
          toast.error('El precio de oferta debe ser menor al precio de venta');
          return;
        }
        if (costPrice > 0 && offerPrice <= costPrice) {
          toast.error('El precio de oferta debe ser mayor al precio de costo');
          return;
        }
      }

      if (wholesalePrice > 0) {
        if (costPrice > 0 && wholesalePrice <= costPrice) {
          toast.error('El precio mayorista debe ser mayor al precio de costo');
          return;
        }
        if (wholesalePrice >= salePrice) {
          toast.error('El precio mayorista debe ser menor al precio de venta');
          return;
        }
      }

      // Validación adicional para SKU único (solo si no es auto-generado)
      if (!autoGenerateSku && data.sku) {
        let orgId: string | null = null;
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem('selected_organization') : null;
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              orgId = parsed?.id || parsed?.organization_id || null;
            } catch { orgId = raw; }
          }
        } catch {}
        let skuQuery = supabase
          .from('products')
          .select('id')
          .eq('sku', data.sku);
        if (orgId) skuQuery = skuQuery.eq('organization_id', orgId);
        const { data: existingProduct } = await skuQuery.single();
        const existingProductId = (existingProduct as { id: string } | null)?.id;
          
        if (existingProductId && existingProductId !== product?.id) {
          toast.error('Ya existe un producto con este SKU');
          return;
        }
      }

      // Preparar datos para envío
      console.log('Form data received:', data);
      
      const productData: Partial<Product> = {
        // Campos obligatorios
        name: data.name.trim(),
        sku: data.sku.trim(),
        sale_price: Number(data.sale_price),
        cost_price: Number(data.cost_price) || 0, // Default to 0 if not provided
        stock_quantity: Number(data.stock_quantity),
        min_stock: Number(data.min_stock),
        category_id: data.category_id,
        is_active: data.is_active,
        
        // Campos opcionales
        description: data.description?.trim() || undefined,
        offer_price: data.has_offer && data.offer_price ? Number(data.offer_price) : undefined,
        wholesale_price: data.wholesale_price ? Number(data.wholesale_price) : undefined,
        min_wholesale_quantity: data.wholesale_price && Number(data.wholesale_price) > 0 ? 10 : undefined,
        max_stock: data.max_stock ? Number(data.max_stock) : undefined,
        supplier_id: data.supplier_id === 'none' ? undefined : data.supplier_id,
        barcode: data.barcode?.trim() || undefined,
        image_url: data.image_url?.trim() || undefined
      };

      console.log('Prepared product data:', productData);

      await onSave(productData);
      toast.success(product ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Mostrar el mensaje de error específico
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al guardar el producto';
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

 

  // Función para optimizar imagen
  const optimizeImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones (máximo 800x800)
        const maxSize = 800;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Configurar canvas
        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Convertir a blob con compresión
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8 // Calidad 80%
        );
      };

      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }, []);



  // Función alternativa para cargar imagen como base64 (fallback)
  const handleImageAsBase64 = useCallback(async (file: File) => {
    try {
      // Optimizar imagen primero
      const optimizedFile = await optimizeImage(file);
      
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImagePreview(dataUrl);
        setValue('image_url', dataUrl);
        
        const originalSize = (file.size / 1024 / 1024).toFixed(2);
        const optimizedSize = (optimizedFile.size / 1024 / 1024).toFixed(2);
        const reduction = (((file.size - optimizedFile.size) / file.size) * 100).toFixed(1);
        
        toast.success(`Imagen optimizada localmente (${reduction}% reducción: ${originalSize}MB → ${optimizedSize}MB)`);
      };
      reader.readAsDataURL(optimizedFile);
    } catch (error) {
      console.error('Error processing image as base64:', error);
      toast.error('Error al procesar la imagen');
    }
  }, [optimizeImage, setValue]);

  // Función para generar SKU automáticamente
  const generateSku = useCallback(async (name: string, categoryId: string) => {
    if (!name || !categoryId) return '';

    try {
      // Obtener prefijo de la categoría
      const category = categories.find(c => c.id === categoryId);
      const categoryPrefix = category?.name
        ?.substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, '') || 'GEN';

      // Limpiar y procesar el nombre del producto
      const cleanName = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(' ')
        .filter(word => word.length > 0)
        .slice(0, 2) // Tomar máximo 2 palabras
        .map(word => word.substring(0, 3)) // Máximo 3 caracteres por palabra
        .join('');

      // Generar número secuencial único
      let counter = 1;
      const baseSku = `${categoryPrefix}-${cleanName}`;
      let finalSku = `${baseSku}-${counter.toString().padStart(3, '0')}`;

      // Verificar si el SKU ya existe en la base de datos
      while (true) {
        const { data: existingProduct, error } = await supabase
          .from('products')
          .select('id')
          .eq('sku', finalSku)
          .single();

        if (error && error.code === 'PGRST116') {
          // No existe, podemos usar este SKU
          break;
        } else {
          const existingProductId = (existingProduct as { id: string } | null)?.id;
          if (existingProductId && existingProductId !== product?.id) {
          // Existe y no es el producto actual, incrementar contador
          counter++;
          finalSku = `${baseSku}-${counter.toString().padStart(3, '0')}`;
          } else {
          // Es el producto actual o no hay error, podemos usar este SKU
          break;
          }
        }

        // Prevenir bucle infinito
        if (counter > 999) {
          finalSku = `${baseSku}-${Date.now().toString().slice(-3)}`;
          break;
        }
      }

      return finalSku;
    } catch (error) {
      console.error('Error generating SKU:', error);
      // Fallback: generar SKU simple con timestamp
      const timestamp = Date.now().toString().slice(-4);
      return `GEN-${timestamp}`;
    }
  }, [categories, supabase, product?.id]);

  // Función para generar SKU manualmente
  const handleGenerateSku = useCallback(async () => {
    if (!productName || !categoryId) {
      toast.error('Ingresa el nombre del producto y selecciona una categoría primero');
      return;
    }

    setGeneratingSku(true);
    try {
      const newSku = await generateSku(productName, categoryId);
      setValue('sku', newSku);
      toast.success('SKU generado automáticamente');
    } catch (error) {
      toast.error('Error al generar SKU');
    } finally {
      setGeneratingSku(false);
    }
  }, [productName, categoryId, generateSku, setValue]);

  // Generar SKU automáticamente cuando cambia el nombre o categoría
  useEffect(() => {
    if (autoGenerateSku && productName && categoryId && !product) {
      // Solo para productos nuevos
      const timeoutId = setTimeout(async () => {
        const newSku = await generateSku(productName, categoryId);
        if (newSku) {
          setValue('sku', newSku);
        }
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [productName, categoryId, autoGenerateSku, product, generateSku, setValue]);

  // Trigger validation when prices change to ensure cross-validation
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'cost_price' || name === 'sale_price') {
        // Re-validate both fields when either changes
        trigger(['cost_price', 'sale_price', 'offer_price', 'wholesale_price']);
      }
      if (name === 'offer_price' && hasOffer) {
        trigger(['offer_price']);
      }
      if (name === 'wholesale_price') {
        trigger(['wholesale_price']);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, trigger, hasOffer]);

  // Función para crear nueva categoría
  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      toast.error('Por favor ingresa un nombre para la categoría');
      return;
    }

    setCreatingCategory(true);
    try {
      let orgId: string | null = null;
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('selected_organization') : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            orgId = parsed?.id || parsed?.organization_id || null;
          } catch { orgId = raw; }
        }
      } catch {}
      if (!orgId) {
        toast.error('Selecciona una organización antes de crear categorías');
        setCreatingCategory(false);
        return;
      }
      const finalOrgId = orgId as string;
      const payload: Database['public']['Tables']['categories']['Insert'] = {
        name: newCategoryName.trim(),
        description: `Categoría creada desde productos: ${newCategoryName.trim()}`,
        is_active: true,
        organization_id: finalOrgId
      };
      const { data, error } = await supabase
        .from('categories')
        .insert(payload as unknown as never)
        .select('id, name')
        .single();

      if (error) {
        console.error('Error creating category:', error);
        
        // Manejo específico de errores RLS
        if (error.code === '42501' || error.message.includes('row-level security')) {
          toast.error('No tienes permisos para crear categorías. Contacta al administrador.');
        } else if (error.code === '23505' || error.message.includes('duplicate')) {
          toast.error('Ya existe una categoría con ese nombre');
        } else {
          toast.error('Error al crear la categoría: ' + error.message);
        }
        return;
      }

      // Agregar la nueva categoría a la lista
      const newCat = data as { id: string; name: string };
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Seleccionar la nueva categoría
      setValue('category_id', newCat.id);
      
      // Limpiar y cerrar el formulario
      setNewCategoryName('');
      setShowCreateCategory(false);
      
      toast.success('Categoría creada exitosamente');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Error inesperado al crear la categoría');
    } finally {
      setCreatingCategory(false);
    }
  }, [newCategoryName, supabase, setValue]);

  // Función para crear nuevo proveedor
  const handleCreateSupplier = useCallback(async () => {
    if (!newSupplierName.trim()) {
      toast.error('Por favor ingresa un nombre para el proveedor');
      return;
    }

    setCreatingSupplier(true);
    try {
      let orgId: string | null = null;
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('selected_organization') : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            orgId = parsed?.id || parsed?.organization_id || null;
          } catch { orgId = raw; }
        }
      } catch {}
      if (!orgId) {
        toast.error('Selecciona una organización antes de crear proveedores');
        setCreatingSupplier(false);
        return;
      }
      const finalOrgId = orgId as string;
      const payload: Database['public']['Tables']['suppliers']['Insert'] = {
        name: newSupplierName.trim(),
        is_active: true,
        organization_id: finalOrgId
      };
      const { data, error } = await supabase
        .from('suppliers')
        .insert(payload as unknown as never)
        .select('id, name')
        .single();

      if (error) {
        console.error('Error creating supplier:', error);
        
        // Manejo específico de errores RLS
        if (error.code === '42501' || error.message.includes('row-level security')) {
          toast.error('No tienes permisos para crear proveedores. Contacta al administrador.');
        } else if (error.code === '23505' || error.message.includes('duplicate')) {
          toast.error('Ya existe un proveedor con ese nombre');
        } else {
          toast.error('Error al crear el proveedor: ' + error.message);
        }
        return;
      }

      // Agregar el nuevo proveedor a la lista
      const newSupplier = data as { id: string; name: string };
      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Seleccionar el nuevo proveedor
      setValue('supplier_id', newSupplier.id);
      
      // Limpiar y cerrar el formulario
      setNewSupplierName('');
      setShowCreateSupplier(false);
      
      toast.success('Proveedor creado exitosamente');
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Error inesperado al crear el proveedor');
    } finally {
      setCreatingSupplier(false);
    }
  }, [newSupplierName, supabase, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{product ? 'Editar Producto' : 'Nuevo Producto'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Imagen del Producto */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Imagen del Producto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    {imagePreview ? (
                      <>
                        <NextImage
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Optimizada
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Package className="h-12 w-12 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Las imágenes se optimizan automáticamente
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Máximo 800x800px, formato JPEG
                        </p>
                      </div>
                    )}
                    
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="flex items-center space-x-2 text-white mb-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Optimizando y subiendo...</span>
                        </div>
                        <p className="text-xs text-white/80">
                          Redimensionando y comprimiendo imagen
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {/* Subir imagen local */}
                    <div className="space-y-2">
                      <Label>Subir Imagen</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              setUploadingImage(true);
                              handleImageAsBase64(file).finally(() => setUploadingImage(false));
                            }
                          };
                          input.click();
                        }}
                        disabled={uploadingImage}
                        className="gap-2 w-full"
                      >
                        <ImageIcon className="h-4 w-4" />
                        📁 Seleccionar Imagen Local
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Máximo 10MB. Se optimizará automáticamente a 800x800px y 80% calidad.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Formulario Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información Básica */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Información Básica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Producto *</Label>
                      <Input
                        id="name"
                        placeholder="Ej: Labial Rojo Intenso"
                        {...register('name', { 
                          required: 'El nombre es obligatorio',
                          minLength: { value: 2, message: 'Mínimo 2 caracteres' }
                        })}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sku">SKU *</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="auto_generate_sku"
                              checked={autoGenerateSku}
                              onCheckedChange={setAutoGenerateSku}
                              disabled={!!product} // Solo para productos nuevos
                            />
                            <Label htmlFor="auto_generate_sku" className="text-xs">
                              Auto
                            </Label>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerateSku}
                            disabled={generatingSku || !productName || !categoryId}
                            className="h-6 px-2 text-xs"
                          >
                            {generatingSku ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <Input
                        id="sku"
                        placeholder={autoGenerateSku ? "Se generará automáticamente..." : "Ej: LAB-001"}
                        {...register('sku', { 
                          required: 'El SKU es obligatorio',
                          minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                          pattern: {
                            value: /^[A-Z0-9\-]+$/,
                            message: 'Solo letras mayúsculas, números y guiones'
                          },
                          validate: () => {
                            if (autoGenerateSku && !categoryId) {
                              return 'Selecciona una categoría para generar el SKU automáticamente';
                            }
                            return true;
                          }
                        })}
                        readOnly={autoGenerateSku && !product}
                      />
                      
                      {errors.sku && (
                        <p className="text-sm text-destructive">{errors.sku.message}</p>
                      )}
                      
                      {autoGenerateSku && !product && (
                        <p className="text-xs text-muted-foreground">
                          El SKU se genera automáticamente: [CATEGORÍA]-[NOMBRE]-[NÚMERO]
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      placeholder="Descripción detallada del producto..."
                      rows={3}
                      {...register('description')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="category_id">Categoría *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateCategory(true)}
                          className="h-6 px-2 text-xs"
                          disabled={loadingData}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Nueva
                        </Button>
                      </div>
                      
                      {!showCreateCategory ? (
                        <>
                          <Select
                            value={watch('category_id')}
                            onValueChange={(value) => {
                              setValue('category_id', value);
                              clearErrors('category_id');
                            }}
                            disabled={loadingData}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingData ? "Cargando categorías..." : "Seleccionar categoría"} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <input
                            type="hidden"
                            {...register('category_id', {
                              required: 'La categoría es obligatoria'
                            })}
                          />
                          {errors.category_id && (
                            <p className="text-sm text-destructive">{errors.category_id.message}</p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                          <Label htmlFor="new_category_name">Nueva Categoría</Label>
                          <Input
                            id="new_category_name"
                            placeholder="Nombre de la categoría"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            disabled={creatingCategory}
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCreateCategory}
                              disabled={creatingCategory || !newCategoryName.trim()}
                              className="gap-1"
                            >
                              {creatingCategory ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Creando...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3" />
                                  Crear
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowCreateCategory(false);
                                setNewCategoryName('');
                              }}
                              disabled={creatingCategory}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="supplier_id">Proveedor</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateSupplier(true)}
                          className="h-6 px-2 text-xs"
                          disabled={loadingData}
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          Nuevo
                        </Button>
                      </div>
                      
                      {!showCreateSupplier ? (
                        <Select
                          value={watch('supplier_id') || 'none'}
                          onValueChange={(value) => setValue('supplier_id', value === 'none' ? undefined : value)}
                          disabled={loadingData}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingData ? "Cargando proveedores..." : "Seleccionar proveedor"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin proveedor</SelectItem>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                          <Label htmlFor="new_supplier_name">Nuevo Proveedor</Label>
                          <Input
                            id="new_supplier_name"
                            placeholder="Nombre del proveedor"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            disabled={creatingSupplier}
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCreateSupplier}
                              disabled={creatingSupplier || !newSupplierName.trim()}
                              className="gap-1"
                            >
                              {creatingSupplier ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Creando...
                                </>
                              ) : (
                                <>
                                  <Building2 className="h-3 w-3" />
                                  Crear
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowCreateSupplier(false);
                                setNewSupplierName('');
                              }}
                              disabled={creatingSupplier}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      placeholder="Ej: 1234567890123"
                      {...register('barcode')}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Precios */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Precios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sale_price">Precio de Venta *</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...register('sale_price', { 
                          required: 'El precio de venta es obligatorio',
                          min: { value: 0.01, message: 'Debe ser mayor a 0' },
                          validate: {
                            greaterThanCost: (value) => {
                              const costPrice = Number(watch('cost_price')) || 0;
                              const salePrice = Number(value) || 0;
                              if (costPrice > 0 && salePrice > 0 && costPrice >= salePrice) {
                                return 'El precio de venta debe ser mayor al precio de costo';
                              }
                              return true;
                            },
                            validNumber: (value) => {
                              const num = Number(value);
                              if (isNaN(num) || num <= 0) {
                                return 'Ingresa un precio válido mayor a 0';
                              }
                              return true;
                            }
                          }
                        })}
                      />
                      {errors.sale_price && (
                        <p className="text-sm text-destructive">{errors.sale_price.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Precio de Costo</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...register('cost_price', {
                          min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                          validate: {
                            lessThanSale: (value) => {
                              if (!value) return true; // Campo opcional
                              const costPrice = Number(value) || 0;
                              const salePrice = Number(watch('sale_price')) || 0;
                              if (costPrice > 0 && salePrice > 0 && costPrice >= salePrice) {
                                return 'El precio de costo debe ser menor al precio de venta';
                              }
                              return true;
                            },
                            validNumber: (value) => {
                              if (!value) return true; // Campo opcional
                              const num = Number(value);
                              if (isNaN(num) || num < 0) {
                                return 'Ingresa un precio válido mayor o igual a 0';
                              }
                              return true;
                            }
                          }
                        })}
                      />
                      {errors.cost_price && (
                        <p className="text-sm text-destructive">{errors.cost_price.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Precio de Oferta */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="has_offer"
                        checked={hasOffer}
                        onCheckedChange={(checked) => {
                          setValue('has_offer', checked);
                          if (!checked) {
                            setValue('offer_price', 0);
                          }
                        }}
                      />
                      <Label htmlFor="has_offer" className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Activar Precio de Oferta
                      </Label>
                    </div>
                    
                    {hasOffer && (
                      <div className="space-y-2">
                        <Label htmlFor="offer_price">Precio de Oferta *</Label>
                        <Input
                          id="offer_price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...register('offer_price', {
                            required: hasOffer ? 'El precio de oferta es obligatorio cuando está activado' : false,
                            min: { value: 0.01, message: 'Debe ser mayor a 0' },
                            validate: {
                              requiredWhenActive: (value) => {
                                if (hasOffer && (!value || Number(value) <= 0)) {
                                  return 'El precio de oferta es obligatorio cuando está activado';
                                }
                                return true;
                              },
                              lessThanSale: (value) => {
                                if (!hasOffer || !value) return true;
                                const offerPrice = Number(value) || 0;
                                const salePrice = Number(watch('sale_price')) || 0;
                                if (offerPrice > 0 && salePrice > 0 && offerPrice >= salePrice) {
                                  return 'El precio de oferta debe ser menor al precio de venta';
                                }
                                return true;
                              },
                              greaterThanCost: (value) => {
                                if (!hasOffer || !value) return true;
                                const offerPrice = Number(value) || 0;
                                const costPrice = Number(watch('cost_price')) || 0;
                                if (offerPrice > 0 && costPrice > 0 && offerPrice <= costPrice) {
                                  return 'El precio de oferta debe ser mayor al precio de costo';
                                }
                                return true;
                              },
                              validNumber: (value) => {
                                if (!hasOffer || !value) return true;
                                const num = Number(value);
                                if (isNaN(num) || num <= 0) {
                                  return 'Ingresa un precio de oferta válido mayor a 0';
                                }
                                return true;
                              }
                            }
                          })}
                        />
                        {errors.offer_price && (
                          <p className="text-sm text-destructive">{errors.offer_price.message}</p>
                        )}
                        {(() => {
                          const salePrice = Number(watch('sale_price')) || 0;
                          const offerPrice = Number(watch('offer_price')) || 0;
                          if (salePrice > 0 && offerPrice > 0) {
                            const discount = ((salePrice - offerPrice) / salePrice * 100).toFixed(1);
                            const savings = (salePrice - offerPrice).toFixed(2);
                            return (
                              <div className="text-xs space-y-1">
                                <p className="text-muted-foreground">
                                  Descuento: {discount}%
                                </p>
                                <p className="text-muted-foreground">
                                  Ahorro: ${savings}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wholesale_price">Precio Mayorista</Label>
                    <Input
                      id="wholesale_price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...register('wholesale_price', {
                        min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                        validate: {
                          greaterThanCost: (value) => {
                            if (!value) return true; // Campo opcional
                            const wholesalePrice = Number(value) || 0;
                            const costPrice = Number(watch('cost_price')) || 0;
                            if (wholesalePrice > 0 && costPrice > 0 && wholesalePrice <= costPrice) {
                              return 'El precio mayorista debe ser mayor al precio de costo';
                            }
                            return true;
                          },
                          lessThanSale: (value) => {
                            if (!value) return true; // Campo opcional
                            const wholesalePrice = Number(value) || 0;
                            const salePrice = Number(watch('sale_price')) || 0;
                            if (wholesalePrice > 0 && salePrice > 0 && wholesalePrice >= salePrice) {
                              return 'El precio mayorista debe ser menor al precio de venta';
                            }
                            return true;
                          },
                          validNumber: (value) => {
                            if (!value) return true; // Campo opcional
                            const num = Number(value);
                            if (isNaN(num) || num < 0) {
                              return 'Ingresa un precio mayorista válido mayor o igual a 0';
                            }
                            return true;
                          },
                          logicalRange: (value) => {
                            if (!value) return true;
                            const wholesalePrice = Number(value) || 0;
                            const costPrice = Number(watch('cost_price')) || 0;
                            const salePrice = Number(watch('sale_price')) || 0;
                            
                            // El precio mayorista debe estar entre el costo y la venta
                            if (wholesalePrice > 0 && costPrice > 0 && salePrice > 0) {
                              if (wholesalePrice <= costPrice || wholesalePrice >= salePrice) {
                                return 'El precio mayorista debe estar entre el costo y la venta';
                              }
                            }
                            return true;
                          }
                        }
                      })}
                    />
                    {errors.wholesale_price && (
                      <p className="text-sm text-destructive">{errors.wholesale_price.message}</p>
                    )}

                  </div>

                  {/* Resumen de Precios */}
                  {(() => {
                    const costPrice = Number(watch('cost_price')) || 0;
                    const salePrice = Number(watch('sale_price')) || 0;
                    const offerPrice = Number(watch('offer_price')) || 0;
                    const wholesalePrice = Number(watch('wholesale_price')) || 0;
                    
                    if (costPrice > 0 || salePrice > 0 || offerPrice > 0 || wholesalePrice > 0) {
                      return (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Resumen de Precios</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {costPrice > 0 && (
                              <div>Costo: <span className="font-medium">${costPrice.toFixed(2)}</span></div>
                            )}
                            {salePrice > 0 && (
                              <div>Venta: <span className="font-medium">${salePrice.toFixed(2)}</span></div>
                            )}
                            {offerPrice > 0 && hasOffer && (
                              <div>Oferta: <span className="font-medium text-orange-600">${offerPrice.toFixed(2)}</span></div>
                            )}
                            {wholesalePrice > 0 && (
                              <div>Mayorista: <span className="font-medium text-blue-600">${wholesalePrice.toFixed(2)}</span></div>
                            )}
                            {costPrice > 0 && salePrice > 0 && (
                              <div className="col-span-2 pt-1 border-t">
                                Margen: <span className="font-medium text-green-600">
                                  {((salePrice - costPrice) / costPrice * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>

              {/* Inventario */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Inventario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Stock Actual *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        placeholder="0"
                        {...register('stock_quantity', { 
                          required: 'El stock actual es obligatorio',
                          min: { value: 0, message: 'Debe ser mayor o igual a 0' }
                        })}
                      />
                      {errors.stock_quantity && (
                        <p className="text-sm text-destructive">{errors.stock_quantity.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_stock">Stock Mínimo *</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min="0"
                        placeholder="5"
                        {...register('min_stock', { 
                          required: 'El stock mínimo es obligatorio',
                          min: { value: 0, message: 'Debe ser mayor o igual a 0' }
                        })}
                      />
                      {errors.min_stock && (
                        <p className="text-sm text-destructive">{errors.min_stock.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_stock">Stock Máximo</Label>
                      <Input
                        id="max_stock"
                        type="number"
                        min="0"
                        placeholder="100"
                        {...register('max_stock')}
                      />
                    </div>
                  </div>

                  {/* Estado Activo */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={isActive}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                    <Label htmlFor="is_active">Producto activo</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Alertas de Validación */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Por favor corrige los errores en el formulario antes de continuar.
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {product ? 'Actualizar' : 'Crear'} Producto
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
