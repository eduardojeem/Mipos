"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ArrowLeft, Upload, X, Image as ImageIcon, Save, Loader2, RotateCcw, Plus, Zap, AlertCircle, LayoutDashboard, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessConfigData } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import productService from '@/services/productService';
import type { Category } from '@/types';

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  cost_price: number;        // Precio de costo
  wholesale_price: number;   // Precio al por mayor
  retail_price: number;      // Precio de venta
  offer_price: number;       // Precio de oferta
  offer_active: boolean;     // Oferta activada/desactivada
  stock: number;
  min_stock: number;
  category_id: string;
  barcode: string;
  is_active: boolean;
  tags: string[];
  supplier_info: string;
}

export default function CreateProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [skuValidating, setSkuValidating] = useState(false);
  const [skuError, setSkuError] = useState<string>('');
  const skuDebounceTimer = useRef<number | null>(null);
  const skuAbortController = useRef<AbortController | null>(null);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    sku: '',
    cost_price: 0,
    wholesale_price: 0,
    retail_price: 0,
    offer_price: 0,
    offer_active: false,
    stock: 0,
    min_stock: 5,
    category_id: '',
    barcode: '',
    is_active: true,
    tags: [],
    supplier_info: '',
  });

  // Configuración del negocio para formatear precios según moneda/locale
  const { config } = useBusinessConfigData();

  // Estado de visualización formateada para oferta
  const [offerDisplay, setOfferDisplay] = useState<string>('');

  const currencyDecimals = config?.storeSettings?.currency === 'PYG' ? 0 : 2;
  const formatCurrencyInteractive = useCallback((amount: number) => {
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: config?.storeSettings?.currency || 'PYG',
      minimumFractionDigits: currencyDecimals,
      maximumFractionDigits: currencyDecimals,
    };
    const value = currencyDecimals === 0 ? Math.round(amount) : amount;
    return new Intl.NumberFormat(config?.regional?.locale || 'es-PY', options).format(value || 0);
  }, [config?.storeSettings?.currency, currencyDecimals, config?.regional?.locale]);

  const parseCurrencyRaw = (raw: string): number => {
    const cleaned = raw
      .replace(/[^0-9.,-]/g, '')
      .replace(/,/g, '.');
    const parts = cleaned.split('.');
    const normalized = parts.length > 1
      ? parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
      : cleaned;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  };

  useEffect(() => {
    if (formData.offer_active) {
      setOfferDisplay(formatCurrencyInteractive(formData.offer_price || 0));
    } else {
      setOfferDisplay('');
    }
  }, [formData.offer_active, formData.offer_price, formatCurrencyInteractive]);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await productService.getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  

  const numericFields: Array<keyof ProductFormData> = ['cost_price','wholesale_price','retail_price','offer_price','stock','min_stock'];
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    let nextValue = value;
    if (numericFields.includes(field)) {
      const n = typeof value === 'string' ? Number(value.replace(/[^\d.,-]/g, '').replace(',', '.')) : Number(value);
      nextValue = Number.isFinite(n) ? n : 0;
    }
    setFormData(prev => ({
      ...prev,
      [field]: nextValue
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length + imageFiles.length > 5) {
      toast({
        title: 'Límite excedido',
        description: 'Máximo 5 imágenes por producto',
        variant: 'destructive',
      });
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Archivo inválido',
          description: `${file.name} no es una imagen válida`,
          variant: 'destructive',
        });
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite de 5MB`,
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setImageFiles(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Función para validar SKU único
  const validateSKU = async (sku: string, signal?: AbortSignal): Promise<boolean> => {
    if (!sku.trim()) {
      setSkuError('El SKU es requerido');
      return false;
    }

    if (sku.length < 3) {
      setSkuError('El SKU debe tener al menos 3 caracteres');
      return false;
    }

    setSkuValidating(true);
    setSkuError('');

    try {
      const response = await api.get(`/products/check-sku/${encodeURIComponent(sku)}` as string, { signal });
      
      if (response.data.exists) {
        setSkuError('Este SKU ya existe. Por favor, usa uno diferente.');
        return false;
      }
      
      setSkuError('');
      return true;
    } catch (error: any) {
      console.error('Error validating SKU:', error);
      // Si hay error en la validación, permitimos continuar pero mostramos advertencia
      setSkuError('No se pudo validar el SKU. Verifica que sea único.');
      return true;
    } finally {
      setSkuValidating(false);
    }
  };

  // Validación de SKU con debounce
  const handleSKUChange = (value: string) => {
    handleInputChange('sku', value);
    setSkuError('');

    // cancelar debounce anterior si existe
    if (skuDebounceTimer.current) {
      clearTimeout(skuDebounceTimer.current);
      skuDebounceTimer.current = null;
    }
    // abortar request anterior si existe
    if (skuAbortController.current) {
      try { skuAbortController.current.abort(); } catch {}
      skuAbortController.current = null;
    }

    if (value.trim()) {
      const controller = new AbortController();
      skuAbortController.current = controller;
      skuDebounceTimer.current = window.setTimeout(() => {
        validateSKU(value, controller.signal);
      }, 500);
    }
  };

  const generateSKU = () => {
    const category = categories.find(c => c.id === formData.category_id);
    const categoryPrefix = category?.name.substring(0, 3).toUpperCase() || 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    const newSku = `${categoryPrefix}-${timestamp}-${randomNum}`;
    setFormData(prev => ({
      ...prev,
      sku: newSku
    }));
    
    // Validar el SKU generado
    validateSKU(newSku);
  };

  // UI: sección de oferta (switch + input) — se ubica cerca de los campos de precio
  const renderOfferControls = () => {
    const isInvalidOffer = formData.offer_active && (formData.offer_price <= 0 || formData.offer_price >= formData.retail_price);
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between p-3 rounded-md border">
          <Label className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Activar oferta</span>
          </Label>
          <Switch
            checked={formData.offer_active}
            onCheckedChange={(checked) => {
              handleInputChange('offer_active', checked)
              if (!checked) {
                setOfferDisplay('')
              } else {
                setOfferDisplay(formatCurrencyInteractive(formData.offer_price || 0))
              }
            }}
          />
        </div>

        <div>
          <Label htmlFor="offer_price" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Precio de oferta</span>
            {formData.offer_active && (
              <Badge variant={isInvalidOffer ? 'destructive' : 'secondary'}>
                {isInvalidOffer ? 'Debe ser menor que el precio regular' : 'Activo'}
              </Badge>
            )}
          </Label>
          <Input
            id="offer_price"
            type="text"
            inputMode="decimal"
            placeholder={currencyDecimals === 0 ? '0' : '0.00'}
            value={offerDisplay}
            onChange={(e) => {
              if (!formData.offer_active) return;
              const num = parseCurrencyRaw(e.target.value);
              setFormData(prev => ({ ...prev, offer_price: num }));
              setOfferDisplay(formatCurrencyInteractive(num));
            }}
            disabled={!formData.offer_active}
          />
        </div>
      </div>
    );
  };

  const compressImage = (file: File, maxDim = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const ratio = Math.min(maxDim / width, maxDim / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto de canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo comprimir la imagen'));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para compresión'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    try {
      const results = await Promise.all(
        imageFiles.map(async (file) => {
          // comprimir antes de subir
          let payloadFile: Blob | File = file;
          try {
            payloadFile = await compressImage(file);
          } catch {
            payloadFile = file; // fallback sin compresión
          }
          const formData = new FormData();
          formData.append('file', payloadFile);
          formData.append('original_name', file.name);
          formData.append('folder', 'products');

          const response = await api.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return response.data?.url as string;
        })
      );
      return results.filter((u) => typeof u === 'string' && !!u);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error('Error al subir las imágenes');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validaciones básicas
    if (!formData.name.trim()) {
      toast({
        title: 'Error de Validación',
        description: 'El nombre del producto es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.sku.trim()) {
      toast({
        title: 'Error de Validación',
        description: 'El SKU es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.category_id) {
      toast({
        title: 'Error de Validación',
        description: 'Selecciona una categoría',
        variant: 'destructive',
      });
      return;
    }

    // Validar SKU único antes de enviar
    const isSkuValid = await validateSKU(formData.sku);
    if (!isSkuValid && skuError.includes('ya existe')) {
      toast({
        title: 'SKU Duplicado',
        description: 'Este SKU ya existe. Por favor, usa uno diferente.',
        variant: 'destructive',
      });
      return;
    }

    // Validaciones de precios mejoradas
    if (formData.cost_price <= 0) {
      toast({
        title: 'Error de Validación',
        description: 'El precio de costo debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (formData.wholesale_price <= 0) {
      toast({
        title: 'Error de Validación',
        description: 'El precio al por mayor debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (formData.retail_price <= 0) {
      toast({
        title: 'Error de Validación',
        description: 'El precio de venta debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    // Validación de lógica de precios (advertencias, no bloquean)
    if (formData.wholesale_price <= formData.cost_price) {
      toast({
        title: 'Advertencia de Precios',
        description: 'El precio al por mayor debería ser mayor al costo para obtener ganancia',
        variant: 'default',
      });
    }

    if (formData.retail_price <= formData.wholesale_price) {
      toast({
        title: 'Advertencia de Precios',
        description: 'El precio de venta debería ser mayor al precio mayorista',
        variant: 'default',
      });
    }

    // Validación de oferta
    if (formData.offer_active) {
      if (formData.offer_price <= 0) {
        toast({
          title: 'Error de Validación',
          description: 'El precio de oferta debe ser mayor a 0',
          variant: 'destructive',
        });
        return;
      }
      if (formData.offer_price >= formData.retail_price) {
        toast({
          title: 'Error de Validación',
          description: 'El precio de oferta debe ser menor que el precio regular',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validación de stock
    if (formData.stock < 0) {
      toast({
        title: 'Error de Validación',
        description: 'El stock no puede ser negativo',
        variant: 'destructive',
      });
      return;
    }

    if (formData.min_stock < 0) {
      toast({
        title: 'Error de Validación',
        description: 'El stock mínimo no puede ser negativo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Calculate margins
      const wholesaleMargin = formData.cost_price > 0 
        ? ((formData.wholesale_price - formData.cost_price) / formData.cost_price) * 100 
        : 0;
      
      const retailMargin = formData.cost_price > 0 
        ? ((formData.retail_price - formData.cost_price) / formData.cost_price) * 100 
        : 0;

      // Mapear campos al backend (sale_price, stock_quantity, etc.)
      const payload: any = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        cost_price: formData.cost_price,
        sale_price: formData.retail_price,
        wholesale_price: formData.wholesale_price,
        offer_price: formData.offer_active ? formData.offer_price : undefined,
        stock_quantity: formData.stock,
        min_stock: formData.min_stock,
        category_id: formData.category_id,
        barcode: formData.barcode || undefined,
        image_url: imageUrls[0] ?? undefined,
        images: imageUrls,
        is_active: formData.is_active,
        wholesale_margin: Math.round(wholesaleMargin * 100) / 100,
        retail_margin: Math.round(retailMargin * 100) / 100,
      };

      const created = await productService.createProduct(payload);

      if (created?.id) {
        toast({
          title: 'Éxito',
          description: 'El producto ha sido creado exitosamente',
        });
        router.push('/dashboard/products');
      } else {
        throw new Error('Error desconocido al crear el producto');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      // Manejo mejorado de errores
      let errorMessage = 'No se pudo crear el producto';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Errores específicos
      if (error.response?.status === 409) {
        errorMessage = 'El SKU ya existe. Por favor, usa uno diferente.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Datos inválidos. Verifica todos los campos.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error del servidor. Inténtalo más tarde.';
      }

      toast({
        title: 'Error al Crear Producto',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb 
        items={[
          { label: 'Inicio', href: '/', icon: LayoutDashboard },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Productos', href: '/dashboard/products' },
          { label: 'Crear Producto', href: '/dashboard/products/create' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crear Producto</h1>
            <p className="text-muted-foreground">Completa los campos obligatorios para crear un nuevo producto</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                sku: '',
                cost_price: 0,
                wholesale_price: 0,
                retail_price: 0,
                offer_price: 0,
                offer_active: false,
                stock: 0,
                min_stock: 5,
                category_id: '',
                barcode: '',
                is_active: true,
                tags: [],
                supplier_info: '',
              });
              setSkuError('');
              setImageFiles([]);
              setImagePreviews([]);
              setTagInput('');
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información Básica - Compacta */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Información Básica</CardTitle>
                <CardDescription>
                  Datos esenciales del producto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ej: Base de maquillaje líquida"
                      required
                      className="border-red-200 focus:border-red-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoría *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleInputChange('category_id', value)}
                      required
                    >
                      <SelectTrigger className="border-red-200 focus:border-red-500">
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => handleSKUChange(e.target.value)}
                          placeholder="Código único del producto"
                          required
                          className={`border-red-200 focus:border-red-500 ${skuError ? 'border-red-500' : ''}`}
                        />
                        {skuValidating && (
                          <div className="flex items-center mt-1 text-sm text-blue-600">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Validando SKU...
                          </div>
                        )}
                        {skuError && (
                          <div className="flex items-center mt-1 text-sm text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {skuError}
                          </div>
                        )}
                      </div>
                      <Button type="button" variant="outline" onClick={generateSKU}>
                        <Zap className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      placeholder="Código de barras"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción breve del producto"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Precios y Costos</CardTitle>
                <CardDescription>
                  Configuración de precios obligatorios para el producto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Precio de Costo ($) *</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.cost_price}
                      onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                      className="border-red-200 focus:border-red-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wholesale_price">Precio Mayorista ($) *</Label>
                    <Input
                      id="wholesale_price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.wholesale_price}
                      onChange={(e) => handleInputChange('wholesale_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                      className="border-red-200 focus:border-red-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="retail_price">Precio de Venta ($) *</Label>
                    <Input
                      id="retail_price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.retail_price}
                      onChange={(e) => handleInputChange('retail_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                      className="border-red-200 focus:border-red-500"
                    />
                  </div>
                </div>

                {formData.cost_price > 0 && formData.wholesale_price > 0 && formData.retail_price > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          Margen Mayoreo:
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {(((formData.wholesale_price - formData.cost_price) / formData.cost_price) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          Margen Venta:
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {(((formData.retail_price - formData.cost_price) / formData.cost_price) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventario - Compacto */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Inventario</CardTitle>
                <CardDescription>
                  Stock inicial y alertas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Inicial *</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      required
                      className="border-red-200 focus:border-red-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Stock Mínimo</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      min="0"
                      value={formData.min_stock}
                      onChange={(e) => handleInputChange('min_stock', parseInt(e.target.value) || 0)}
                      placeholder="5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Adicional - Simplificada */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Información Adicional</CardTitle>
                <CardDescription>
                  Datos opcionales del producto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tags">Etiquetas</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Agregar etiqueta"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="outline" onClick={addTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                            <span>{tag}</span>
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier_info">Información del Proveedor</Label>
                  <Textarea
                    id="supplier_info"
                    value={formData.supplier_info}
                    onChange={(e) => handleInputChange('supplier_info', e.target.value)}
                    placeholder="Información del proveedor"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Imágenes del Producto - Optimizada */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Imágenes del Producto</CardTitle>
                <CardDescription>
                  Sube hasta 5 imágenes (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="images" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG o WEBP (MAX. 5MB)</p>
                      </div>
                      <input
                        id="images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Producto ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Optimizado */}
          <div className="space-y-6">
            {/* Estado del Producto */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Estado del Producto</CardTitle>
                <CardDescription>
                  Configuración de visibilidad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Producto activo</Label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Los productos inactivos no aparecerán en el catálogo
                </p>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || uploadingImages}
                  >
                    {loading || uploadingImages ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {uploadingImages ? 'Subiendo imágenes...' : 'Creando producto...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Crear Producto
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                    disabled={loading || uploadingImages}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}