'use client';

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Package,
  Tag,
  DollarSign,
  Upload,
  Save,
  X,
  AlertTriangle,
  Percent,
  Plus,
  Building2,
  RefreshCw,
  Boxes,
  CheckCircle2,
  ImageOff,
  Trash2,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import type { Database } from '@/types/supabase';
import NextImage from 'next/image';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lee orgId de localStorage de forma segura. */
function getOrgId(): string | null {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('selected_organization')
        : null;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.id || parsed?.organization_id || null;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

/** Redimensiona y comprime una imagen usando un canvas. Máx 800×800, calidad 80%. */
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const MAX = 800;
    const img = new Image();
    img.onerror = () => resolve(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }) : file),
        'image/jpeg',
        0.8
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PRODUCTS || 'products';

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  accent = 'blue',
}: {
  icon: React.ElementType;
  title: string;
  accent?: 'blue' | 'green' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  };
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className={cn('rounded-lg border p-1.5', colors[accent])}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

// ── Inline create form ────────────────────────────────────────────────────────
function InlineCreate({
  label,
  placeholder,
  value,
  onChange,
  onSave,
  onCancel,
  loading,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-3">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(); } }}
        className="h-8 text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={loading || !value.trim()} className="h-7 gap-1 text-xs">
          {loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <CheckCircle2 className="h-3 w-3" />}
          Guardar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="h-7 text-xs">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── Image section ─────────────────────────────────────────────────────────────
function ImageSection({
  imagePreview,
  uploadProgress,
  uploading,
  onSelectFile,
  onClear,
}: {
  imagePreview: string | null;
  uploadProgress: number;
  uploading: boolean;
  onSelectFile: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <SectionHeader icon={Upload} title="Imagen" accent="blue" />

      {/* Preview */}
      <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary/30">
        {imagePreview ? (
          <>
            <NextImage
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 280px"
              unoptimized={imagePreview.startsWith('blob:')}
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute right-2 top-2 h-7 w-7 shadow-md"
              onClick={onClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                <span className="text-xs font-medium text-white">{uploadProgress}%</span>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onSelectFile}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors hover:bg-muted/50"
          >
            <div className="rounded-full bg-muted p-3">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <span className="text-xs text-muted-foreground">Click para subir imagen</span>
            <span className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP · Máx. 5MB</span>
          </button>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSelectFile}
        disabled={uploading}
        className="w-full gap-2 text-xs"
      >
        {uploading ? (
          <><div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />Subiendo...</>
        ) : (
          <><Upload className="h-3.5 w-3.5" />{imagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}</>
        )}
      </Button>

      {/* Upload progress bar */}
      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Price summary ─────────────────────────────────────────────────────────────
function PriceSummary({
  cost, sale, offer, wholesale, hasOffer,
}: { cost: number; sale: number; offer: number; wholesale: number; hasOffer: boolean }) {
  if (!cost && !sale) return null;
  const fmt = (n: number) => `Gs ${n.toLocaleString('es-PY')}`;
  const margin = cost > 0 && sale > 0 ? ((sale - cost) / cost * 100) : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs">
      <p className="mb-2 font-medium text-foreground">Resumen</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        {cost > 0 && <span>Costo: <span className="font-medium text-foreground">{fmt(cost)}</span></span>}
        {sale > 0 && <span>Venta: <span className="font-medium text-foreground">{fmt(sale)}</span></span>}
        {hasOffer && offer > 0 && <span>Oferta: <span className="font-medium text-amber-600">{fmt(offer)}</span></span>}
        {wholesale > 0 && <span>Mayorista: <span className="font-medium text-blue-600">{fmt(wholesale)}</span></span>}
        {margin > 0 && (
          <span className="col-span-2 border-t border-border/40 pt-1 mt-0.5">
            Margen: <span className={cn('font-semibold', margin >= 20 ? 'text-emerald-600' : 'text-amber-600')}>{margin.toFixed(1)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const ProductEditModal = memo(function ProductEditModal({
  product,
  open,
  onOpenChange,
  onSave,
  categories: propCategories = [],
  suppliers: propSuppliers = [],
}: ProductEditModalProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const {
    register, handleSubmit, formState: { errors }, reset,
    setValue, watch, clearErrors, trigger,
  } = useForm<ProductFormData>();

  const isActive = watch('is_active');
  const hasOffer = watch('has_offer');
  const categoryId = watch('category_id');
  const productName = watch('name');
  const costPrice = Number(watch('cost_price')) || 0;
  const salePrice = Number(watch('sale_price')) || 0;
  const offerPrice = Number(watch('offer_price')) || 0;
  const wholesalePrice = Number(watch('wholesale_price')) || 0;

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>(propCategories);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>(propSuppliers);

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Inline create forms
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // SKU
  const [generatingSku, setGeneratingSku] = useState(false);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);

  // ── Load categories & suppliers ──────────────────────────────────────────
  const loadCategoriesAndSuppliers = useCallback(async () => {
    if (!open) return;
    setLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Debes estar autenticado'); return; }

      const orgId = getOrgId();
      let orgIds: string[] = [];
      if (!orgId) {
        const { data: mem } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id);
        orgIds = ((mem ?? []) as Array<{ organization_id: string }>)
          .map((m) => m.organization_id)
          .filter(Boolean);
      }

      // Categories
      let catQ = supabase.from('categories').select('id, name').eq('is_active', true).order('name');
      if (orgId) catQ = catQ.eq('organization_id', orgId);
      else if (orgIds.length) catQ = catQ.in('organization_id', orgIds);
      const { data: catsData, error: catsErr } = await catQ;
      if (!catsErr) setCategories(catsData || []);

      // Suppliers
      let supQ = supabase.from('suppliers').select('id, name').eq('is_active', true).order('name');
      if (orgId) supQ = supQ.eq('organization_id', orgId);
      else if (orgIds.length) supQ = supQ.in('organization_id', orgIds);
      const { data: supsData, error: supsErr } = await supQ;
      if (!supsErr) setSuppliers(supsData || []);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoadingData(false);
    }
  }, [supabase, open]);

  useEffect(() => { if (open) loadCategoriesAndSuppliers(); }, [open, loadCategoriesAndSuppliers]);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setShowCreateCategory(false);
      setShowCreateSupplier(false);
      setNewCategoryName('');
      setNewSupplierName('');
      setAutoGenerateSku(true);
      setPendingFile(null);
      if (imageBlobUrl) { URL.revokeObjectURL(imageBlobUrl); setImageBlobUrl(null); }
      setImagePreview(null);
      setUploadProgress(0);
    }
  }, [open, imageBlobUrl]);

  // ── Populate form ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && product) {
      reset({
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
        image_url: product.image_url || '',
      });
      setImagePreview(product.image_url || null);
      setAutoGenerateSku(false);
    } else if (open && !product) {
      reset({
        name: '', sku: '', description: '', sale_price: 0, cost_price: 0,
        offer_price: 0, has_offer: false, stock_quantity: 0, min_stock: 5,
        category_id: '', supplier_id: 'none', is_active: true,
      });
      setImagePreview(null);
    }
  }, [product, open, reset]);

  // ── Cross-field validation trigger ───────────────────────────────────────
  useEffect(() => {
    const sub = watch((_, { name }) => {
      if (name === 'cost_price' || name === 'sale_price') {
        trigger(['cost_price', 'sale_price', 'offer_price', 'wholesale_price']);
      }
    });
    return () => sub.unsubscribe();
  }, [watch, trigger]);

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke previous blob
    if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);

    // Compress
    const compressed = file.size > 500_000 ? await compressImage(file) : file;

    // Show local preview immediately
    const blobUrl = URL.createObjectURL(compressed);
    setImageBlobUrl(blobUrl);
    setImagePreview(blobUrl);
    setPendingFile(compressed);

    // Reset file input
    e.target.value = '';
  }, [imageBlobUrl]);

  const uploadPendingFile = useCallback(async (): Promise<string | null> => {
    if (!pendingFile) return null;
    setUploading(true);
    setUploadProgress(0);
    try {
      const ext = pendingFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `product-${product?.id || Date.now()}-${Date.now()}.${ext}`;

      // Simulate progress
      const ticker = setInterval(() => {
        setUploadProgress((p) => p < 85 ? p + 8 : p);
      }, 200);

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, pendingFile, { upsert: true, contentType: pendingFile.type });

      clearInterval(ticker);

      if (error) {
        // Fallback: keep base64 if storage fails (bucket may not exist yet)
        toast.warning('No se pudo subir a Storage, la imagen quedará como referencia local');
        return null;
      }

      setUploadProgress(100);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      return pub?.publicUrl || null;
    } catch {
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  }, [pendingFile, product?.id, supabase]);

  const clearImage = useCallback(() => {
    if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
    setImageBlobUrl(null);
    setImagePreview(null);
    setPendingFile(null);
    setValue('image_url', '');
  }, [imageBlobUrl, setValue]);

  // ── SKU generation ────────────────────────────────────────────────────────
  const generateSku = useCallback(async (name: string, catId: string): Promise<string> => {
    const category = categories.find((c) => c.id === catId);
    const prefix =
      category?.name?.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'GEN';
    const namePart = name
      .trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '')
      .split(' ').filter(Boolean).slice(0, 2)
      .map((w) => w.substring(0, 3)).join('');
    const base = `${prefix}-${namePart}`;

    // Find first available sequence number (max 50 iterations)
    for (let n = 1; n <= 50; n++) {
      const candidate = `${base}-${String(n).padStart(3, '0')}`;
      const { error } = await supabase.from('products').select('id').eq('sku', candidate).single();
      if (error?.code === 'PGRST116') return candidate; // not found = available
    }
    return `${base}-${Date.now().toString().slice(-4)}`;
  }, [categories, supabase]);

  const handleGenerateSku = useCallback(async () => {
    if (!productName || !categoryId) {
      toast.error('Ingresa el nombre y la categoría primero');
      return;
    }
    setGeneratingSku(true);
    try {
      const sku = await generateSku(productName, categoryId);
      setValue('sku', sku);
    } finally {
      setGeneratingSku(false);
    }
  }, [productName, categoryId, generateSku, setValue]);

  // Auto-generate SKU for new products
  useEffect(() => {
    if (!autoGenerateSku || !productName || !categoryId || product) return;
    const id = setTimeout(async () => {
      const sku = await generateSku(productName, categoryId);
      if (sku) setValue('sku', sku);
    }, 600);
    return () => clearTimeout(id);
  }, [productName, categoryId, autoGenerateSku, product, generateSku, setValue]);

  // ── Create category/supplier ──────────────────────────────────────────────
  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;
    const orgId = getOrgId();
    if (!orgId) { toast.error('Selecciona una organización'); return; }
    setCreatingCategory(true);
    try {
      const payload: Database['public']['Tables']['categories']['Insert'] = {
        name: newCategoryName.trim(),
        description: `Categoría creada desde productos`,
        is_active: true,
        organization_id: orgId,
      };
      const { data, error } = await supabase.from('categories')
        .insert(payload as unknown as never).select('id, name').single();
      if (error) {
        if (error.code === '23505') toast.error('Ya existe una categoría con ese nombre');
        else toast.error('Error al crear categoría: ' + error.message);
        return;
      }
      const newCat = data as { id: string; name: string };
      setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setValue('category_id', newCat.id);
      setNewCategoryName('');
      setShowCreateCategory(false);
      toast.success('Categoría creada');
    } finally {
      setCreatingCategory(false);
    }
  }, [newCategoryName, supabase, setValue]);

  const handleCreateSupplier = useCallback(async () => {
    if (!newSupplierName.trim()) return;
    const orgId = getOrgId();
    if (!orgId) { toast.error('Selecciona una organización'); return; }
    setCreatingSupplier(true);
    try {
      const payload: Database['public']['Tables']['suppliers']['Insert'] = {
        name: newSupplierName.trim(),
        is_active: true,
        organization_id: orgId,
      };
      const { data, error } = await supabase.from('suppliers')
        .insert(payload as unknown as never).select('id, name').single();
      if (error) {
        if (error.code === '23505') toast.error('Ya existe un proveedor con ese nombre');
        else toast.error('Error al crear proveedor: ' + error.message);
        return;
      }
      const newSup = data as { id: string; name: string };
      setSuppliers((prev) => [...prev, newSup].sort((a, b) => a.name.localeCompare(b.name)));
      setValue('supplier_id', newSup.id);
      setNewSupplierName('');
      setShowCreateSupplier(false);
      toast.success('Proveedor creado');
    } finally {
      setCreatingSupplier(false);
    }
  }, [newSupplierName, supabase, setValue]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      // Upload image to Supabase Storage if pending
      let finalImageUrl = imagePreview && !imageBlobUrl ? imagePreview : undefined;
      if (pendingFile) {
        const storageUrl = await uploadPendingFile();
        if (storageUrl) {
          finalImageUrl = storageUrl;
          setValue('image_url', storageUrl);
        }
        // If storage upload failed, don't persist base64
      }

      const productData: Partial<Product> = {
        name: data.name.trim(),
        sku: data.sku.trim(),
        sale_price: Number(data.sale_price),
        cost_price: Number(data.cost_price) || 0,
        stock_quantity: Number(data.stock_quantity),
        min_stock: Number(data.min_stock),
        category_id: data.category_id,
        is_active: data.is_active,
        description: data.description?.trim() || undefined,
        offer_price: data.has_offer && data.offer_price ? Number(data.offer_price) : undefined,
        wholesale_price: data.wholesale_price ? Number(data.wholesale_price) : undefined,
        min_wholesale_quantity: data.wholesale_price && Number(data.wholesale_price) > 0 ? 10 : undefined,
        max_stock: data.max_stock ? Number(data.max_stock) : undefined,
        supplier_id: data.supplier_id === 'none' ? undefined : data.supplier_id,
        barcode: data.barcode?.trim() || undefined,
        image_url: finalImageUrl,
      };

      await onSave(productData);
      toast.success(product ? 'Producto actualizado' : 'Producto creado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {/* ── Header ── */}
        <DialogHeader className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-card via-card to-primary/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {product ? 'Editar Producto' : 'Nuevo Producto'}
                </DialogTitle>
                {product && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {product?.is_active !== undefined && (
                <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-xs">
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            {/* ── Left column: Image ── */}
            <div className="space-y-4 lg:col-span-1">
              <ImageSection
                imagePreview={imagePreview}
                uploadProgress={uploadProgress}
                uploading={uploading}
                onSelectFile={handleSelectFile}
                onClear={clearImage}
              />

              {/* Active toggle */}
              <Separator />
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Estado</p>
                  <p className="text-xs text-muted-foreground">Visible en catálogo</p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(v) => setValue('is_active', v)}
                />
              </div>
            </div>

            {/* ── Right column: Form ── */}
            <div className="space-y-6 lg:col-span-2">
              {/* ── Basic info ── */}
              <section className="space-y-4">
                <SectionHeader icon={Tag} title="Información Básica" accent="blue" />

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Nombre del Producto <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Ej: Labial Rojo Intenso"
                    className={cn(errors.name && 'border-destructive')}
                    {...register('name', {
                      required: 'El nombre es obligatorio',
                      minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                    })}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                {/* SKU */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sku" className="text-sm">SKU <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-3">
                      {!product && (
                        <div className="flex items-center gap-1.5">
                          <Switch
                            id="auto_sku"
                            checked={autoGenerateSku}
                            onCheckedChange={setAutoGenerateSku}
                            className="h-4 w-7 data-[state=checked]:bg-primary"
                          />
                          <Label htmlFor="auto_sku" className="cursor-pointer text-xs text-muted-foreground">Auto</Label>
                        </div>
                      )}
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={handleGenerateSku}
                        disabled={generatingSku || !productName || !categoryId}
                        className="h-6 w-6"
                        title="Regenerar SKU"
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', generatingSku && 'animate-spin')} />
                      </Button>
                    </div>
                  </div>
                  <Input
                    id="sku"
                    placeholder={autoGenerateSku && !product ? 'Se generará automáticamente...' : 'Ej: LAB-001'}
                    readOnly={autoGenerateSku && !product}
                    className={cn(
                      errors.sku && 'border-destructive',
                      autoGenerateSku && !product && 'bg-muted/40 text-muted-foreground'
                    )}
                    {...register('sku', {
                      required: 'El SKU es obligatorio',
                      minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                    })}
                  />
                  {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción del producto..."
                    rows={2}
                    className="resize-none text-sm"
                    {...register('description')}
                  />
                </div>

                {/* Category + Supplier */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="category_id" className="text-sm">Categoría <span className="text-destructive">*</span></Label>
                      {!showCreateCategory && (
                        <Button
                          type="button" variant="ghost" size="sm"
                          onClick={() => setShowCreateCategory(true)}
                          className="h-5 gap-1 px-1 text-xs text-muted-foreground hover:text-foreground"
                          disabled={loadingData}
                        >
                          <Plus className="h-3 w-3" /> Nueva
                        </Button>
                      )}
                    </div>
                    {showCreateCategory ? (
                      <InlineCreate
                        label="Nueva categoría"
                        placeholder="Nombre categoría"
                        value={newCategoryName}
                        onChange={setNewCategoryName}
                        onSave={handleCreateCategory}
                        onCancel={() => { setShowCreateCategory(false); setNewCategoryName(''); }}
                        loading={creatingCategory}
                      />
                    ) : (
                      <>
                        <Select
                          value={watch('category_id')}
                          onValueChange={(v) => { setValue('category_id', v); clearErrors('category_id'); }}
                          disabled={loadingData}
                        >
                          <SelectTrigger className={cn('text-sm', errors.category_id && 'border-destructive')}>
                            <SelectValue placeholder={loadingData ? 'Cargando...' : 'Seleccionar'} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input type="hidden" {...register('category_id', { required: 'Selecciona una categoría' })} />
                        {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
                      </>
                    )}
                  </div>

                  {/* Supplier */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="supplier_id" className="text-sm">Proveedor</Label>
                      {!showCreateSupplier && (
                        <Button
                          type="button" variant="ghost" size="sm"
                          onClick={() => setShowCreateSupplier(true)}
                          className="h-5 gap-1 px-1 text-xs text-muted-foreground hover:text-foreground"
                          disabled={loadingData}
                        >
                          <Building2 className="h-3 w-3" /> Nuevo
                        </Button>
                      )}
                    </div>
                    {showCreateSupplier ? (
                      <InlineCreate
                        label="Nuevo proveedor"
                        placeholder="Nombre proveedor"
                        value={newSupplierName}
                        onChange={setNewSupplierName}
                        onSave={handleCreateSupplier}
                        onCancel={() => { setShowCreateSupplier(false); setNewSupplierName(''); }}
                        loading={creatingSupplier}
                      />
                    ) : (
                      <Select
                        value={watch('supplier_id') || 'none'}
                        onValueChange={(v) => setValue('supplier_id', v === 'none' ? undefined : v)}
                        disabled={loadingData}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder={loadingData ? 'Cargando...' : 'Sin proveedor'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin proveedor</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Barcode */}
                <div className="space-y-1.5">
                  <Label htmlFor="barcode" className="text-sm">Código de Barras</Label>
                  <Input
                    id="barcode"
                    placeholder="Ej: 1234567890123"
                    className="font-mono text-sm"
                    {...register('barcode')}
                  />
                </div>
              </section>

              <Separator />

              {/* ── Prices ── */}
              <section className="space-y-4">
                <SectionHeader icon={DollarSign} title="Precios" accent="green" />

                <div className="grid grid-cols-2 gap-4">
                  {/* Sale price */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sale_price" className="text-sm">Precio de Venta <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
                      <Input
                        id="sale_price" type="number" min="0" step="1" placeholder="0"
                        className={cn('pl-8 text-sm', errors.sale_price && 'border-destructive')}
                        {...register('sale_price', {
                          required: 'Requerido',
                          validate: {
                            positive: (v) => Number(v) > 0 || 'Debe ser mayor a 0',
                            greaterThanCost: (v) => {
                              const c = Number(watch('cost_price')) || 0;
                              return (c === 0 || Number(v) > c) || 'Debe ser mayor al costo';
                            },
                          },
                        })}
                      />
                    </div>
                    {errors.sale_price && <p className="text-xs text-destructive">{errors.sale_price.message}</p>}
                  </div>

                  {/* Cost price */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cost_price" className="text-sm">Precio de Costo</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
                      <Input
                        id="cost_price" type="number" min="0" step="1" placeholder="0"
                        className={cn('pl-8 text-sm', errors.cost_price && 'border-destructive')}
                        {...register('cost_price', {
                          validate: {
                            lessThanSale: (v) => {
                              if (!v) return true;
                              const s = Number(watch('sale_price')) || 0;
                              return (s === 0 || Number(v) < s) || 'Debe ser menor a la venta';
                            },
                          },
                        })}
                      />
                    </div>
                    {errors.cost_price && <p className="text-xs text-destructive">{errors.cost_price.message}</p>}
                  </div>
                </div>

                {/* Offer price */}
                <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="has_offer"
                        checked={hasOffer}
                        onCheckedChange={(v) => { setValue('has_offer', v); if (!v) setValue('offer_price', 0); }}
                      />
                      <Label htmlFor="has_offer" className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <Percent className="h-3.5 w-3.5" /> Precio de Oferta
                      </Label>
                    </div>
                    {hasOffer && salePrice > 0 && offerPrice > 0 && offerPrice < salePrice && (
                      <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        -{((1 - offerPrice / salePrice) * 100).toFixed(0)}% desc.
                      </Badge>
                    )}
                  </div>
                  {hasOffer && (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
                      <Input
                        id="offer_price" type="number" min="0" step="1" placeholder="0"
                        className={cn('pl-8 text-sm', errors.offer_price && 'border-destructive')}
                        {...register('offer_price', {
                          validate: {
                            requiredWhenActive: (v) => !hasOffer || Number(v) > 0 || 'Ingresa el precio de oferta',
                            lessThanSale: (v) => {
                              if (!hasOffer || !v) return true;
                              return Number(v) < salePrice || 'Debe ser menor al precio de venta';
                            },
                          },
                        })}
                      />
                    </div>
                  )}
                  {errors.offer_price && <p className="text-xs text-destructive">{errors.offer_price.message}</p>}
                </div>

                {/* Wholesale price */}
                <div className="space-y-1.5">
                  <Label htmlFor="wholesale_price" className="text-sm">Precio Mayorista</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
                    <Input
                      id="wholesale_price" type="number" min="0" step="1" placeholder="0"
                      className={cn('pl-8 text-sm', errors.wholesale_price && 'border-destructive')}
                      {...register('wholesale_price', {
                        validate: {
                          range: (v) => {
                            if (!v || Number(v) === 0) return true;
                            const w = Number(v);
                            if (costPrice > 0 && w <= costPrice) return 'Debe ser mayor al costo';
                            if (salePrice > 0 && w >= salePrice) return 'Debe ser menor a la venta';
                            return true;
                          },
                        },
                      })}
                    />
                  </div>
                  {errors.wholesale_price && <p className="text-xs text-destructive">{errors.wholesale_price.message}</p>}
                </div>

                <PriceSummary
                  cost={costPrice} sale={salePrice}
                  offer={offerPrice} wholesale={wholesalePrice}
                  hasOffer={hasOffer}
                />
              </section>

              <Separator />

              {/* ── Inventory ── */}
              <section className="space-y-4">
                <SectionHeader icon={Boxes} title="Inventario" accent="orange" />

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'stock_quantity', label: 'Stock Actual', required: true, default: '0' },
                    { id: 'min_stock', label: 'Stock Mínimo', required: true, default: '5' },
                    { id: 'max_stock', label: 'Stock Máximo', required: false, default: '100' },
                  ].map(({ id, label, required, default: def }) => (
                    <div key={id} className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm">
                        {label} {required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id={id} type="number" min="0" placeholder={def}
                        className="text-sm"
                        {...register(id as keyof ProductFormData, required ? {
                          required: 'Requerido',
                          min: { value: 0, message: '≥ 0' },
                        } : { min: { value: 0, message: '≥ 0' } })}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </form>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-border/50 bg-card px-6 py-4">
          {hasErrors && (
            <Alert variant="destructive" className="mb-3 py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Corrige los errores antes de continuar.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {pendingFile && !uploading && (
                <><ImageOff className="h-3.5 w-3.5" /> Imagen pendiente de guardar</>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit" form="product-form" disabled={loading || uploading}
                className="min-w-[130px] gap-2"
              >
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Guardando...</>
                ) : (
                  <><Save className="h-4 w-4" />{product ? 'Actualizar' : 'Crear'} Producto</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
