'use client';

import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  ShoppingCart,
  Trash2,
  X,
  Calculator,
  User,
  DollarSign,
  Activity,
  Star,
  Clock,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { formatCurrency } from '@/lib/utils';
import { type CartItem } from '@/hooks/useCart';
import { type Customer } from '@/types';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { CartSummary } from '@/components/pos/CartSummary';
import { CartItemsList } from '@/components/pos/CartItemsList';
import CartItemDetailModal from '@/components/catalog/CartItemDetailModal';
import toast from '@/lib/toast';
import { ToastAction } from '@/components/ui/toast';
import { usePOSDraft } from '@/hooks/usePOSDraft';
 

// Lazy load heavy components to reduce initial bundle
const CalculatorWidget = dynamic(() => import('@/components/pos/CalculatorWidget'), {
  ssr: false,
  loading: () => <div className="text-sm text-muted-foreground">Cargando calculadora…</div>,
});

interface Product {
  id: string;
  name: string;
  sku?: string;
  sale_price: number;
  stock_quantity: number;
  iva_rate?: number;
  iva_included?: boolean;
  price_with_iva?: number;
  price_without_iva?: number;
  category?: {
    name: string;
  };
  low_stock_threshold?: number;
  is_featured?: boolean;
  discount_percentage?: number;
}

// Unificado: usar CartItem del hook useCart


interface EnhancedCartProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  discount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  notes: string;
  processing: boolean;
  isWholesaleMode: boolean; // Nueva prop para modo mayorista
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  onSetDiscount: (discount: number) => void;
  onSetPaymentMethod: (method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER') => void;
  onSetNotes: (notes: string) => void;
  onProcessSale: () => void;
  onToggleWholesaleMode: (enabled: boolean) => void; // Nueva función para toggle mayorista
  // Added props to control discount type from parent
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  onSetDiscountType: (type: 'PERCENTAGE' | 'FIXED_AMOUNT') => void;
  products: Product[];
  // Nuevas integraciones
  highlightProductId?: string;
  onViewInCatalog?: (productId: string) => void;
  // Nuevo: para restaurar borradores desde el carrito
  onAddToCart?: (product: Product, quantity: number) => void;
  onToggleCartFullscreen?: () => void;
}

function EnhancedCartComponent({
  cart,
  customers,
  selectedCustomer,
  discount,
  paymentMethod,
  notes,
  processing,
  isWholesaleMode,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSelectCustomer,
  onSetDiscount,
  onSetPaymentMethod,
  onSetNotes,
  onProcessSale,
  onToggleWholesaleMode,
  discountType,
  onSetDiscountType,
  products,
  highlightProductId,
  onViewInCatalog,
  onAddToCart,
  onToggleCartFullscreen,
}: EnhancedCartProps) {
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);

  const openCartItemDetail = (productId: string) => {
    const item = cart.find(ci => ci.product_id === productId) || null;
    setSelectedCartItem(item);
  };

  const closeCartItemDetail = () => setSelectedCartItem(null);
  // Referencia para detectar productos agregados
  const prevCartRef = useRef<Map<string, number>>(new Map());
  const [showCalculator, setShowCalculator] = useState(false);
  

  // Enhanced cart features
  const [cartSessionStart, setCartSessionStart] = useState<Date>(new Date());
  const [lastModified, setLastModified] = useState<Date>(new Date());
  const [cartNotes, setCartNotes] = useState('');
  const [priorityItems, setPriorityItems] = useState<Set<string>>(new Set());
  const [compactMode, setCompactMode] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  // Favoritos por cliente (persistidos en localStorage)
  const [favoritesByCustomer, setFavoritesByCustomer] = useState<Map<string, Set<string>>>(new Map());
  const prevCartBeforeSaleRef = useRef<CartItem[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pos.customerFavorites');
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, string[]>;
        const map = new Map<string, Set<string>>(
          Object.entries(obj).map(([cid, ids]) => [cid, new Set(ids || [])])
        );
        setFavoritesByCustomer(map);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const obj: Record<string, string[]> = {};
      favoritesByCustomer.forEach((set, cid) => {
        obj[cid] = Array.from(set);
      });
      localStorage.setItem('pos.customerFavorites', JSON.stringify(obj));
    } catch {}
  }, [favoritesByCustomer]);

  const handleProcessSaleWithFavorites = React.useCallback(() => {
    // Guardar snapshot del carrito antes de cobrar para actualizar favoritos al finalizar
    prevCartBeforeSaleRef.current = cart.slice();
    onProcessSale?.();
  }, [cart, onProcessSale]);

  // Cuando el carrito se vacía después de procesar, actualizar favoritos del cliente actual
  useEffect(() => {
    if (prevCartBeforeSaleRef.current && cart.length === 0 && selectedCustomer?.id) {
      const customerId = selectedCustomer.id;
      const existing = new Set(favoritesByCustomer.get(customerId) || []);
      for (const item of prevCartBeforeSaleRef.current) {
        if (item?.product_id) existing.add(item.product_id);
      }
      const next = new Map(favoritesByCustomer);
      next.set(customerId, existing);
      setFavoritesByCustomer(next);
      prevCartBeforeSaleRef.current = null;
      toast.success('Favoritos actualizados', { description: 'Se agregaron productos a favoritos del cliente' });
    }
  }, [cart.length, selectedCustomer?.id, favoritesByCustomer]);

  // Persistir modo compacto en localStorage y aplicar defaults inteligentes si no hay valor guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos.cart.compact');
      if (saved !== null) {
        setCompactMode(saved === '1');
      } else {
        const prefersCompact = typeof window !== 'undefined' && (
          window.matchMedia('(max-width: 640px)').matches ||
          (Array.isArray(cart) && cart.length > 6)
        );
        setCompactMode(prefersCompact);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('pos.cart.compact', compactMode ? '1' : '0');
    } catch {}
  }, [compactMode]);
  // Abrir detalles en modo no compacto; colapsar en compacto para ahorrar espacio
  useEffect(() => {
    setDetailsOpen(!compactMode);
  }, [compactMode]);

  // Atajo: +/- para ajustar cantidad del último ítem del carrito
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Evitar conflictos cuando se escribe en inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!cart || cart.length === 0) return;

      const lastItem = cart[cart.length - 1];
      if (!lastItem) return;

      const key = event.key;
      // '+' puede venir como '=' con Shift en algunos teclados
      const isPlus = key === '+' || (key === '=' && event.shiftKey);
      const isMinus = key === '-';

      if (isPlus) {
        event.preventDefault();
        const newQty = Math.min(lastItem.quantity + 1, 999);
        onUpdateQuantity(lastItem.product_id, newQty);
        try {
          (toast as any).show?.({ title: 'Cantidad actualizada', description: `${lastItem.product_name} → ${newQty}` });
        } catch {}
      } else if (isMinus) {
        event.preventDefault();
        const newQty = Math.max(1, lastItem.quantity - 1);
        if (newQty !== lastItem.quantity) {
          onUpdateQuantity(lastItem.product_id, newQty);
          try {
            (toast as any).show?.({ title: 'Cantidad actualizada', description: `${lastItem.product_name} → ${newQty}` });
          } catch {}
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cart, onUpdateQuantity]);

  // Borradores POS: guardar/restaurar desde el carrito
  const { hasDraft, saveDraft, restoreDraft, clearDraft } = usePOSDraft();

  const handleSaveDraft = React.useCallback(() => {
    saveDraft(cart as any, discount, discountType, notes, isWholesaleMode, selectedCustomer);
  }, [cart, discount, discountType, notes, isWholesaleMode, selectedCustomer, saveDraft]);

  const handleRestoreDraft = React.useCallback(() => {
    restoreDraft((draft) => {
      onSetDiscount(draft.discount);
      onSetNotes(draft.notes);
      onSetDiscountType(draft.discountType);
      onToggleWholesaleMode(draft.isWholesaleMode);
  
      // Restaurar cliente si existe
      if (draft.selectedCustomerId) {
        const found = customers.find(c => c.id === draft.selectedCustomerId) || null;
        onSelectCustomer(found);
      }
  
      // Limpiar carrito actual y re-agregar items del borrador
      onClearCart();
      draft.cart.forEach((item: any) => {
        const product = products.find(p => p.id === item.product_id);
        if (product && onAddToCart) {
          onAddToCart(product, item.quantity);
        }
      });
    });
  }, [restoreDraft, customers, products, onSetDiscount, onSetNotes, onSetDiscountType, onToggleWholesaleMode, onSelectCustomer, onClearCart, onAddToCart]);
  // Historial de acciones del carrito
  const [historyOpen, setHistoryOpen] = useState(false);
  const [actionsHistory, setActionsHistory] = useState<Array<{ type: 'add' | 'remove' | 'update' | 'clear'; productId?: string; productName?: string; prevQty?: number; newQty?: number; timestamp: number; details?: string }>>([]);
  const [lastRemoved, setLastRemoved] = useState<{ productId: string; qty: number } | null>(null);

  function recordAction(entry: { type: 'add' | 'remove' | 'update' | 'clear'; productId?: string; productName?: string; prevQty?: number; newQty?: number; details?: string }) {
    setActionsHistory(prev => [{ ...entry, timestamp: Date.now() }, ...prev].slice(0, 20));
  }

  // Wrappers para acciones con toasts y registro
  const handleUpdateQuantity = React.useCallback((productId: string, quantity: number) => {
    const item = cart.find(i => i.product_id === productId);
    const prevQty = item?.quantity ?? 0;
    onUpdateQuantity(productId, quantity);
    recordAction({ type: 'update', productId, productName: item?.product_name, prevQty, newQty: quantity });
    toast.info('Cantidad actualizada', { description: `${item?.product_name || 'Producto'}: ${prevQty} → ${quantity}` });
  }, [cart, onUpdateQuantity]);

  const handleRemoveItem = React.useCallback((productId: string) => {
    const item = cart.find(i => i.product_id === productId);
    onRemoveItem(productId);
    recordAction({ type: 'remove', productId, productName: item?.product_name, details: 'Artículo eliminado' });
    const qty = item?.quantity ?? 1;
    setLastRemoved({ productId, qty });
    const productName = item?.product_name || 'Artículo';
    toast.show({
      title: 'Producto eliminado',
      description: productName,
      action: (
        <ToastAction
          altText="Deshacer eliminación"
          onClick={() => {
            const prod = products.find(p => p.id === productId);
            if (prod && onAddToCart) {
              onAddToCart(prod, qty);
              toast.success('Restaurado', { description: `${productName} x${qty}` });
              setLastRemoved(null);
            }
          }}
        >
          Deshacer
        </ToastAction>
      )
    });
  }, [cart, onRemoveItem, products, onAddToCart]);

  const handleClearCart = React.useCallback(() => {
    onClearCart();
    recordAction({ type: 'clear', details: 'Carrito limpiado' });
    toast.info('Carrito limpiado', { description: 'Todos los artículos fueron removidos' });
  }, [onClearCart]);

  // Cálculos avanzados del carrito con IVA por producto - optimizado con memo
  const cartCalculations = useMemo(() => {
    return calculateCartWithIva(cart, products as import("@/types/supabase").Product[], discount, discountType)
  }, [cart, products, discount, discountType]);

  // Lista de productos mejorada
  // Se extrajo a CartItemsList; se pasa un setter directo de cantidad

  // Búsqueda rápida dentro del carrito
  const [cartSearchQuery, setCartSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filteredItemsWithIva = useMemo(() => {
    const q = cartSearchQuery.trim().toLowerCase();
    if (!q) return cartCalculations.itemsWithIva;
    return cartCalculations.itemsWithIva.filter((item) => {
      const name = (item.product_name || '').toLowerCase();
      const sku = item.product?.sku?.toLowerCase() || '';
      return name.includes(q) || sku.includes(q);
    });
  }, [cartCalculations.itemsWithIva, cartSearchQuery]);

  // Filtros rápidos y ordenamiento
  type CartFilter = 'all' | 'discounted' | 'low_stock' | 'featured';
  type CartSortBy = 'name' | 'price' | 'qty' | 'total';
  const [cartFilter, setCartFilter] = useState<CartFilter>('all');
  const [cartSortBy, setCartSortBy] = useState<CartSortBy>('name');
  const [cartSortOrder, setCartSortOrder] = useState<'asc' | 'desc'>('asc');

  const displayItems = useMemo(() => {
    let base = filteredItemsWithIva;
    // Filtrado
    if (cartFilter === 'discounted') {
      base = base.filter(i => ((i.product as any)?.discount_percentage || 0) > 0);
    } else if (cartFilter === 'low_stock') {
      base = base.filter(i => {
        const sq = i.product?.stock_quantity ?? null;
        // Usar min_stock si existe en el tipo; si la API expone low_stock_threshold, usarlo de forma segura
        const thresholdFromApi = (i.product as any)?.low_stock_threshold;
        const th = typeof thresholdFromApi === 'number' ? thresholdFromApi : (i.product?.min_stock ?? 5);
        return typeof sq === 'number' && typeof th === 'number' && sq <= th;
      });
    } else if (cartFilter === 'featured') {
      // Algunos datos pueden incluir is_featured; acceder de forma segura sin romper tipos
      base = base.filter(i => Boolean((i.product as any)?.is_featured));
    }
    // Ordenamiento
    const dir = cartSortOrder === 'asc' ? 1 : -1;
    base = [...base].sort((a, b) => {
      if (cartSortBy === 'name') {
        return (a.product_name || '').localeCompare(b.product_name || '') * dir;
      }
      if (cartSortBy === 'price') {
        return ((a.price || 0) - (b.price || 0)) * dir;
      }
      if (cartSortBy === 'qty') {
        return ((a.quantity || 0) - (b.quantity || 0)) * dir;
      }
      // total
      return ((a.total || 0) - (b.total || 0)) * dir;
    });
    return base;
  }, [filteredItemsWithIva, cartFilter, cartSortBy, cartSortOrder]);

  // Atajos de teclado básicos
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Buscar
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Guardar borrador
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDraft();
        return;
      }
      // Restaurar borrador
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRestoreDraft();
        return;
      }
      // Toggle calculadora
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowCalculator(v => !v);
        return;
      }
      // Toggle compacto
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setCompactMode(v => !v);
        return;
      }
      // Pantalla completa del carrito
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onToggleCartFullscreen?.();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveDraft, handleRestoreDraft, onToggleCartFullscreen]);

  // Feedback inmediato al agregar desde catálogo: detecta nuevas entradas
  useEffect(() => {
    const prev = prevCartRef.current;
    const now = new Map<string, number>(cart.map(i => [i.product_id, i.quantity]));
    for (const [id] of now.entries()) {
      if (!prev.has(id)) {
        const item = cart.find(i => i.product_id === id);
        toast.success('Producto agregado', { description: item?.product_name || 'Artículo agregado' });
        recordAction({ type: 'add', productId: id, productName: item?.product_name, details: 'Agregado al carrito' });
        setLastModified(new Date());
        // Micro-interacción: animación de éxito
        const element = document.querySelector(`[data-product-id="${id}"]`);
        if (element) {
          element.classList.add('animate-scale-in', 'success-feedback');
          setTimeout(() => element.classList.remove('animate-scale-in', 'success-feedback'), 1000);
        }
      }
    }
    prevCartRef.current = now;
  }, [cart]);

  // Track cart session time
  useEffect(() => {
    if (cart.length > 0 && cartSessionStart.getTime() === new Date().getTime()) {
      setCartSessionStart(new Date());
    }
  }, [cart.length, cartSessionStart]);

  return (
  <div className={`w-full bg-card flex flex-col h-full ${compactMode ? 'text-[0.95rem]' : ''} relative`} role="region" aria-label="Carrito de compras">
      {/* Header del carrito mejorado */}
      <div className={`sticky top-0 z-30 ${compactMode ? 'p-sm md:p-md' : 'p-md md:p-lg'} border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm`}>
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center gap-sm">
           <div className="p-sm bg-primary/10 rounded-lg relative">
             <ShoppingCart className="h-6 w-6 text-primary" aria-hidden="true" />
             <Badge
               variant="secondary"
               className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground"
               aria-live="polite"
               aria-label={`${cartCalculations.itemCount} artículos en el carrito`}
             >
               {cartCalculations.itemCount}
             </Badge>
              {priorityItems.size > 0 && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white flex items-center justify-center">
                  <Star className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`${compactMode ? 'text-lg' : 'text-xl'} font-bold`}>Carrito de Compras</h2>
                {cart.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Timer className="h-3 w-3 mr-1" />
                      {Math.floor((new Date().getTime() - cartSessionStart.getTime()) / 60000)}min
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {lastModified.toLocaleTimeString()}
                    </Badge>
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <p className={`${compactMode ? 'text-xs' : 'text-sm'} text-muted-foreground`} aria-live="polite">
                  {cartCalculations.itemCount} {cartCalculations.itemCount === 1 ? 'artículo' : 'artículos'}
                </p>
              )}
            </div>
          </div>
          {cart.length > 0 && (
            <div className="flex items-center gap-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailsOpen(v => !v)}
                aria-controls="cart-details"
                aria-expanded={detailsOpen}
                className="border-muted/40"
              >
                Detalles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(v => !v)}
                className="border-muted/40"
                aria-label={historyOpen ? 'Ocultar historial' : 'Mostrar historial'}
              >
                <Activity className="h-4 w-4 mr-2" />
                Historial
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Toggle priority mode for all items
                  if (priorityItems.size === cart.length) {
                    setPriorityItems(new Set());
                  } else {
                    setPriorityItems(new Set(cart.map(item => item.product_id)));
                  }
                }}
                className={`${priorityItems.size > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : ''}`}
                aria-label="Marcar como prioritarios"
              >
                <Star className={`h-4 w-4 mr-2 ${priorityItems.size > 0 ? 'fill-current' : ''}`} />
                Prioridad
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCart}
                className="text-destructive hover:text-destructive border-destructive/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button
                variant={compactMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompactMode(v => !v)}
                aria-pressed={compactMode}
                title="Ctrl+Shift+M"
              >
                {compactMode ? 'Compacto' : 'Compactar'}
              </Button>
              {onToggleCartFullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleCartFullscreen()}
                  title="Ctrl+Shift+F"
                >
                  Pantalla completa
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Búsqueda dentro del carrito */}
        {cart.length > 0 && (
          <div className={`${compactMode ? 'mt-sm' : 'mt-md'}`}>
            <Label htmlFor="cart-search" className="text-sm font-semibold">Buscar en carrito</Label>
            <Input
              id="cart-search"
              ref={searchInputRef}
              value={cartSearchQuery}
              onChange={(e) => setCartSearchQuery(e.target.value)}
              placeholder="Nombre o SKU..."
              aria-label="Buscar producto dentro del carrito"
              className={`${compactMode ? 'mt-xs h-8 text-sm' : 'mt-xs'}`}
            />
          </div>
        )}

        {/* Panel de detalles simplificado: solo opciones críticas */}
        {cart.length > 0 && (
          <div id="cart-details" className={`${detailsOpen ? '' : 'hidden'} ${compactMode ? 'mt-sm' : 'mt-md'} space-y-md`}>
            {/* Filtros simplificados - solo ordenamiento básico */}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Ordenar por:</Label>
              <div className="flex items-center gap-2">
                <Select onValueChange={(v) => setCartSortBy(v as CartSortBy)} defaultValue={cartSortBy}>
                  <SelectTrigger className="h-8 w-[8rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nombre</SelectItem>
                    <SelectItem value="price">Precio</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={() => setCartSortOrder(cartSortOrder === 'asc' ? 'desc' : 'asc')}>
                  {cartSortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>

            {/* Toggle para modo mayorista */}
            <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-orange-100 rounded">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Venta Mayorista</p>
                  <p className="text-xs text-muted-foreground">Precios especiales para mayoristas</p>
                </div>
              </div>
              <Button variant={isWholesaleMode ? 'default' : 'outline'} size="sm" onClick={() => onToggleWholesaleMode(!isWholesaleMode)} className={isWholesaleMode ? 'bg-orange-600 hover:bg-orange-700' : ''}>
                {isWholesaleMode ? 'Activado' : 'Activar'}
              </Button>
            </div>

            {/* Descuento se configura al procesar la venta */}

            {/* Método de pago */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Método de pago</Label>
              <Select value={paymentMethod} onValueChange={(value: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER') => onSetPaymentMethod(value)}>
                <SelectTrigger className="h-10 w-full" aria-label="Selecciona método de pago">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">💵 Efectivo</SelectItem>
                  <SelectItem value="CARD">💳 Tarjeta</SelectItem>
                  <SelectItem value="TRANSFER">🏦 Transferencia</SelectItem>
                  <SelectItem value="OTHER">❓ Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas simplificadas */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notas de venta</Label>
              <Textarea
                value={notes}
                onChange={(e) => onSetNotes(e.target.value)}
                placeholder="Notas que aparecerán en el recibo..."
                className="min-h-[60px]"
                aria-label="Notas de la venta"
              />
            </div>

            {/* Funciones avanzadas (colapsadas por defecto) */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                <span>⚙️ Funciones avanzadas</span>
                <span className="text-xs">(calculadora, borradores)</span>
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2"><Calculator className="h-4 w-4" />Calculadora</Label>
                    <Button variant="outline" size="sm" onClick={() => setShowCalculator(v => !v)} aria-controls="calculator-widget" aria-expanded={showCalculator}>{showCalculator ? 'Ocultar' : 'Mostrar'}</Button>
                  </div>
                  {showCalculator && (<div id="calculator-widget"><CalculatorWidget /></div>)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={handleSaveDraft} aria-label="Guardar borrador" className="w-full">💾 Guardar</Button>
                  <Button variant="outline" size="sm" onClick={handleRestoreDraft} disabled={!hasDraft} aria-label="Restaurar borrador" className="w-full">📂 Restaurar</Button>
                  <Button variant="ghost" size="sm" onClick={clearDraft} aria-label="Borrar borrador" className="w-full">🗑️ Borrar</Button>
                </div>
              </div>
            </details>
          </div>
        )}

        {historyOpen && actionsHistory.length > 0 && (
          <div className="mt-3" role="region" aria-label="Historial de acciones del carrito">
            <Label className="text-sm font-semibold">Últimas acciones</Label>
            <ul className="mt-1 text-xs text-muted-foreground max-h-24 overflow-auto">
              {actionsHistory.slice(-10).reverse().map((act, idx) => (
                <li key={idx} className="leading-5">
                  <span className="font-medium">{new Date(act.timestamp).toLocaleTimeString()}</span>
                  {": "}
                  {act.type === 'remove' && `Eliminó ${act.details}`}
                  {act.type === 'update' && `Actualizó cantidad ${act.details}`}
                  {act.type === 'clear' && `Limpió carrito`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toggle para modo mayorista */}
        <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-orange-100 rounded">
              <DollarSign className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Venta Mayorista</p>
              <p className="text-xs text-muted-foreground">Precios especiales para mayoristas</p>
            </div>
          </div>
          <Button
            variant={isWholesaleMode ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleWholesaleMode(!isWholesaleMode)}
            className={isWholesaleMode ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            {isWholesaleMode ? "Activado" : "Activar"}
          </Button>
        </div>
      </div>

      {/* Lista de productos mejorada */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${compactMode ? 'p-sm space-y-sm' : 'p-md space-y-sm'}`}>
        {cart.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="h-10 w-10 opacity-50" />
            </div>
            <h3 className="text-base font-medium mb-2">Carrito vacío</h3>
            <p className="text-sm">Selecciona productos del catálogo para comenzar</p>
          </div>
        ) : (
          <CartItemsList
            items={displayItems}
            isWholesaleMode={isWholesaleMode}
            onRemoveItem={handleRemoveItem}
            onSetQuantity={(productId, quantity) => handleUpdateQuantity(productId, quantity)}
            highlightProductId={highlightProductId}
            onViewInCatalog={onViewInCatalog}
            onViewDetails={openCartItemDetail}
            compact={compactMode}
          />
        )}

        {/* Favoritos del cliente (quick-add) */}
        {selectedCustomer?.id && (
          (() => {
            const favoriteIds = Array.from(favoritesByCustomer.get(selectedCustomer.id) || []);
            const favoriteProducts = favoriteIds
              .map(id => products.find(p => p.id === id))
              .filter(Boolean) as Product[];
            if (favoriteProducts.length === 0) return null;
            return (
              <div className="mt-2 p-2 border rounded-lg bg-card" aria-label="Favoritos del cliente">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Favoritos del cliente</p>
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={() => {
                      const next = new Map(favoritesByCustomer);
                      next.set(selectedCustomer.id!, new Set());
                      setFavoritesByCustomer(next);
                    }}
                  >Limpiar</Button>
                </div>
                <div className="-mx-1 overflow-x-auto">
                  <div className="px-1 flex items-center gap-2 min-w-max">
                    {favoriteProducts.slice(0, 8).map(fp => (
                      <div key={fp.id} className="flex items-center gap-2 bg-muted/40 border border-muted/30 rounded-full px-2 py-1">
                        <span className="text-xs max-w-[10rem] truncate">{fp.name}</span>
                        <Button size="sm" className="h-7 px-2" onClick={() => onAddToCart?.(fp as any, 1)}>Agregar</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Región vacía reservada para futuros indicadores en el flujo */}
      <div className="sr-only" aria-live="polite" />

      {/* Modal de detalles del ítem del carrito (POS) */}
      {selectedCartItem?.product && (
        <CartItemDetailModal
          item={{ product: selectedCartItem.product, quantity: selectedCartItem.quantity, selectedOptions: undefined }}
          isOpen={!!selectedCartItem}
          onClose={closeCartItemDetail}
          onUpdateQuantity={(id, qty) => onUpdateQuantity(id, qty)}
          onRemoveItem={(id) => {
            onRemoveItem(id);
            closeCartItemDetail();
          }}
        />
      )}

      {/* Resumen flotante (modo compacto) */}
      {compactMode && cart.length > 0 && (
        <div className="absolute bottom-24 right-3 sm:right-4 z-40">
          <div className="flex items-center gap-2 bg-background/95 border border-border shadow-lg rounded-full px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="text-sm font-semibold">
              {formatCurrency(cartCalculations.total)}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="text-xs text-muted-foreground">
              {cartCalculations.itemCount} {cartCalculations.itemCount === 1 ? 'artículo' : 'artículos'}
            </div>
            <Button size="sm" className="ml-1" onClick={() => onProcessSale()}>
              Cobrar
            </Button>
          </div>
        </div>
      )}

      {/* Sección de checkout mejorada */}
      {cart.length > 0 && (
        <>
        <div className={`sticky bottom-0 z-30 border-t border-border ${compactMode ? 'p-md space-y-md' : 'p-lg space-y-lg'} bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg`}>

            {/* Cliente */}
            <div className="space-y-sm">
              <Label className="text-sm font-semibold flex items-center gap-xs">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>Cliente</span>
              </Label>
              <div className="flex items-center gap-2">
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Buscar cliente">
                      Buscar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[320px] bg-popover border" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por nombre, email o teléfono" value={customerQuery} onValueChange={setCustomerQuery} />
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {(Array.isArray(customers) ? customers : [])
                          .filter(c => {
                            const q = customerQuery.trim().toLowerCase();
                            if (!q) return true;
                            return (
                              (c.name || '').toLowerCase().includes(q) ||
                              (c.email || '').toLowerCase().includes(q) ||
                              (c.phone || '').toLowerCase().includes(q)
                            );
                          })
                          .map((c) => (
                            <CommandItem
                              key={c.id}
                              onSelect={() => {
                                onSelectCustomer(c as any);
                                setCustomerSearchOpen(false);
                                setCustomerQuery('');
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                  <User className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium">{c.name}</span>
                                    {c.customer_type === 'WHOLESALE' && (
                                      <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 px-1 py-0">Mayorista</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {(c.email || '')}
                                    {c.phone ? ` • ${c.phone}` : ''}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomer && (
                  <Button variant="ghost" size="sm" onClick={() => onSelectCustomer(null)} aria-label="Limpiar cliente">Limpiar</Button>
                )}
              </div>
              <Select
                onValueChange={(value) => {
                  const customer = (Array.isArray(customers) ? customers : []).find((c) => c.id === value) || null;
                  onSelectCustomer(customer);
                }}
                defaultValue={selectedCustomer?.id || 'general'}
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {selectedCustomer ? (
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-primary/10 rounded">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">{selectedCustomer.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-muted rounded">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="text-sm">Cliente general</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center space-x-2 py-1">
                      <div className="p-1 bg-muted rounded">
                        <User className="h-3 w-3" />
                      </div>
                      <span className="text-sm">Cliente general</span>
                    </div>
                  </SelectItem>
                  {(Array.isArray(customers) ? customers : []).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center space-x-2 py-1">
                        <div className="p-1 bg-primary/10 rounded">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1">
                            <p className="font-medium text-sm">{customer.name}</p>
                            {customer.customer_type === 'WHOLESALE' && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 px-1 py-0">
                                Mayorista
                              </Badge>
                            )}
                          </div>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Información del cliente mayorista compacta */}
              {selectedCustomer && selectedCustomer.customer_type === 'WHOLESALE' && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-orange-900">Venta mayorista activa</span>
                    <Badge variant="default" className="bg-orange-600 text-xs px-1 py-0">
                      Mayorista
                    </Badge>
                  </div>
                  {selectedCustomer.wholesale_discount && (
                    <div className="flex items-center justify-between text-xs text-orange-700 mt-1">
                      <span>Descuento:</span>
                      <span className="font-semibold">{selectedCustomer.wholesale_discount}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          
          <div className="space-y-md">
            {/* Pago */}
            <div className="grid grid-cols-1 gap-md">
              <div className="space-y-sm">
                <Label className="text-sm font-semibold">Pago</Label>
                <Select value={paymentMethod} onValueChange={(value: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER') => onSetPaymentMethod(value)}>
                  <SelectTrigger className="h-10 w-full" aria-label="Seleccionar método de pago">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Efectivo</SelectItem>
                    <SelectItem value="CARD">💳 Tarjeta</SelectItem>
                    <SelectItem value="TRANSFER">🏦 Transferencia</SelectItem>
                    <SelectItem value="OTHER">❓ Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
  
            {/* Notas */}
            <div className="space-y-sm">
              <Label className="text-sm font-semibold">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => onSetNotes(e.target.value)}
                placeholder="Notas que aparecerán en el recibo..."
                className="min-h-[60px]"
                aria-label="Notas de la venta"
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-40 border-t border-border p-3 sm:p-4 space-y-3 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-[0_-6px_12px_rgba(0,0,0,0.06)]" role="region" aria-label="Totales y acción de cobro">
            <Card className="bg-gradient-to-br from-background to-muted/30 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent id="cart-totals" className="space-y-2">
                <CartSummary
                  subtotalWithIva={cartCalculations.subtotalWithIva}
                  taxAmount={cartCalculations.taxAmount}
                  discountAmount={cartCalculations.discountAmount}
                  total={cartCalculations.total}
                />
                
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
              <Button
                variant="outline"
                className="w-full h-12 md:h-14 text-base hover-lift"
                onClick={handleClearCart}
                disabled={processing || cart.length === 0}
                aria-disabled={processing || cart.length === 0}
                aria-label="Cancelar compra"
              >
                <X className="h-4 w-4 mr-2" aria-hidden="true" />
                Cancelar
              </Button>
              <Button
                className="w-full h-12 md:h-14 text-base sm:text-base md:text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus-visible:ring-2 focus-visible:ring-primary/50 hover-lift animate-pulse-subtle"
                onClick={handleProcessSaleWithFavorites}
                disabled={processing || cart.length === 0}
                aria-disabled={processing || cart.length === 0}
                aria-busy={processing}
                aria-describedby="cart-totals"
                aria-label={`Procesar venta con ${cartCalculations.itemCount} ${cartCalculations.itemCount === 1 ? 'artículo' : 'artículos'}`}
              >
                {processing ? (
                  <div className="flex items-center gap-xs" aria-live="polite">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-hidden="true"></div>
                    <span>Procesando…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-xs">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    <div className="text-left">
                      <div>Finalizar compra</div>
                      <div className="text-xs font-normal opacity-90">
                        {formatCurrency(cartCalculations.total)}
                      </div>
                    </div>
                  </div>
                )}
              </Button>
            </div>

            {/* Estadísticas simples */}
            {cart.length > 0 && (
              <div className="pt-md border-t border-border/50">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{cartCalculations.itemCount} productos</span>
                  <span>{Math.floor((new Date().getTime() - cartSessionStart.getTime()) / 60000)}min</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const EnhancedCart = memo(EnhancedCartComponent);
(EnhancedCart as any).displayName = 'EnhancedCart';

export default EnhancedCart;
