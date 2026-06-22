'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowDown, ArrowUp, Calendar, CheckCircle2, Clock,
  Filter, Info, Package, Percent, RefreshCw, Search, ShoppingCart,
  Sparkles, Tag, TrendingUp, X, Zap,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessConfig, useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { NavBar } from '@/app/home/components/NavBar';
import { Footer } from '@/app/home/components/Footer';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Pagination from '@/components/catalog/Pagination';
import { getTenantPublicContent, getTenantPublicSections } from '@/lib/public-site/tenant-public-config';
import type { BusinessVertical } from '@/config/verticals';
import PublicOffersCarousel from './components/PublicOffersCarousel';
import OfferQuickViewModal from './components/OfferQuickViewModal';
import {
  buildOfferSearchParams,
  OFFER_DEFAULT_PAGE_SIZE,
  type OfferQueryState,
  type OfferSortMode,
  type OfferStatusFilter,
} from './offers-query';
import type { OfferCategory, OfferItem, OfferPagination, OfferProduct } from './offers-types';
import { formatTimeRemaining, validatePromotion } from '@/lib/offers';

type OrderConfirmationData = {
  orderId: string; customerName: string; customerEmail: string;
  total: number; paymentMethod: string; orderDate: string;
};
type CheckoutModalProps = {
  isOpen: boolean; onClose: () => void;
  cartItems: { id: string; name: string; price: number; quantity: number; image?: string }[];
  cartTotal?: number;
  onRemoveItem?: (productId: string) => void;
  onUpdateItemQuantity?: (productId: string, quantity: number) => void;
  onOrderSuccess: (orderData: OrderConfirmationData) => void;
};
type OrderConfirmationModalProps = {
  isOpen: boolean; onClose: () => void; orderId: string; customerName: string;
  customerEmail: string; total: number; paymentMethod: string; orderDate: string;
};

const CheckoutModal = dynamic<CheckoutModalProps>(
  () => import('@/components/catalog/CheckoutModal').then((m) => m.default),
  { loading: () => null }
);
const OrderConfirmationModal = dynamic<OrderConfirmationModalProps>(
  () => import('@/components/catalog/OrderConfirmationModal').then((m) => m.default),
  { loading: () => null }
);

interface OffersClientProps {
  initialOffers: OfferItem[];
  initialCategories: OfferCategory[];
  initialCarouselItems: OfferItem[];
  initialPagination: OfferPagination;
  initialQueryState: OfferQueryState;
  vertical?: BusinessVertical;
}
type OffersApiPayload = {
  success: boolean; data: OfferItem[]; categories: OfferCategory[];
  pagination: OfferPagination; error?: string;
};

function toCartProduct(item: OfferItem): OfferProduct & { image_url?: string; offer_price?: number; is_active: boolean } {
  const hasOfferPrice = Number.isFinite(item.offerPrice) && item.offerPrice < item.basePrice;
  return {
    id: item.product.id, name: item.product.name, sale_price: item.basePrice,
    offer_price: hasOfferPrice ? item.offerPrice : undefined,
    image_url: item.product.images?.[0]?.url || item.product.image,
    stock_quantity: Number(item.product.stock_quantity ?? 0), is_active: true,
    images: item.product.images, image: item.product.image,
    category_id: item.product.category_id, categoryName: item.product.categoryName,
    sku: item.product.sku, description: item.product.description, brand: item.product.brand,
  };
}

export type {
  DiscountType, OfferCategory, OfferItem, OfferPagination,
  OfferProduct as Product, OfferPromotion as Promotion,
} from './offers-types';

// ─── Skeleton card ────────────────────────────────────────────────────────────
function OfferCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse">
      <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-800" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4" />
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-2/5" />
        <div className="flex gap-2 pt-2">
          <div className="h-9 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
      {label}
      <button type="button" onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900/40 p-0.5 transition-colors"
        aria-label={`Quitar filtro ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OffersClient({
  initialOffers, initialCategories, initialCarouselItems, initialPagination, initialQueryState, vertical = 'RETAIL',
}: OffersClientProps) {
  const { config } = useBusinessConfig();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const formatCurrency = useCurrencyFormatter();
  const router = useRouter();
  const {
    addToCart, cart, removeFromCart, updateQuantity, clearCart,
    cartItemsCount, cartTotal: computedCartTotal,
  } = useCatalogCart();
  const { tenantApiPath, tenantHref } = useTenantPublicRouting();
  const canUseCart = sections.showCart;
  type CatalogCartProduct = Parameters<typeof addToCart>[0];
  const brandPrimary = config.branding.primaryColor || '#e11d48';

  const [offers, setOffers] = useState<OfferItem[]>(initialOffers);
  const [categories, setCategories] = useState<OfferCategory[]>(initialCategories);
  const [pagination, setPagination] = useState<OfferPagination>(initialPagination);
  const [page, setPage] = useState(initialQueryState.page);
  const [limit, setLimit] = useState(initialQueryState.limit);
  const [searchQuery, setSearchQuery] = useState(initialQueryState.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQueryState.search);
  const [category, setCategory] = useState<string>(initialQueryState.category || 'all');
  const [promotionFilter, setPromotionFilter] = useState<string | null>(initialQueryState.promotion);
  const [sort, setSort] = useState<OfferSortMode>(initialQueryState.sort);
  const [status, setStatus] = useState<OfferStatusFilter>(initialQueryState.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OfferItem | null>(null);
  const [ariaLive, setAriaLive] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmationData | null>(null);
  const skipInitialFetchRef = useRef(true);

  const handleCheckout = useCallback(() => setCheckoutOpen(true), []);
  const handleOrderSuccess = useCallback((orderData: OrderConfirmationData) => {
    setCheckoutOpen(false); setOrderConfirmation(orderData);
  }, []);
  const handleOrderConfirmationClose = useCallback(() => {
    setOrderConfirmation(null); clearCart();
  }, [clearCart]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(searchQuery.trim()); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (category !== 'all' && !categories.some((item) => item.id === category)) {
      setCategory('all'); setPage(1);
    }
  }, [categories, category]);

  const requestState = useMemo<OfferQueryState>(() => ({
    search: debouncedSearch,
    category: category === 'all' ? null : category,
    promotion: promotionFilter, sort, status, page, limit,
  }), [category, debouncedSearch, limit, page, promotionFilter, sort, status]);

  const requestQueryString = useMemo(
    () => buildOfferSearchParams(requestState, { defaultLimit: OFFER_DEFAULT_PAGE_SIZE }).toString(),
    [requestState]
  );

  useEffect(() => {
    const query = buildOfferSearchParams(requestState, { defaultLimit: OFFER_DEFAULT_PAGE_SIZE }).toString();
    router.replace(query ? tenantHref(`/offers?${query}`) : tenantHref('/offers'), { scroll: false });
  }, [requestState, router, tenantHref]);

  useEffect(() => {
    if (skipInitialFetchRef.current) { skipInitialFetchRef.current = false; return; }
    const controller = new AbortController();
    const target = requestQueryString
      ? tenantApiPath(`/api/offers?${requestQueryString}`)
      : tenantApiPath('/api/offers');
    const fetchOffers = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(target, { method: 'GET', cache: 'default', signal: controller.signal });
        const result = (await response.json().catch(() => null)) as OffersApiPayload | null;
        if (!response.ok || !result?.success) throw new Error(result?.error || 'No se pudieron cargar las ofertas');
        setOffers(result.data || []); setCategories(result.categories || []);
        setPagination(result.pagination); setPage(result.pagination.page || 1);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') return;
        console.error('[Offers] Error loading offers:', fetchError);
        setError('No pudimos cargar las ofertas. Intenta nuevamente.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void fetchOffers();
    return () => controller.abort();
  }, [requestQueryString, retryNonce, tenantApiPath]);

  const expiringOffers = useMemo(() =>
    offers
      .map((offer) => ({ offer, validation: validatePromotion(offer.promotion) }))
      .filter(({ validation }) =>
        validation.hoursRemaining !== null &&
        validation.hoursRemaining > 0 &&
        validation.hoursRemaining <= 24
      )
      .sort((l, r) => (l.validation.hoursRemaining || 0) - (r.validation.hoursRemaining || 0))
      .slice(0, 3),
    [offers]
  );

  const handleRetry = useCallback(() => setRetryNonce((p) => p + 1), []);
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(1); }, []);
  const handleCategoryChange = useCallback((value: string) => { setCategory(value); setPage(1); }, []);
  const handleSortChange = useCallback((value: OfferSortMode) => { setSort(value); setPage(1); }, []);
  const handleStatusChange = useCallback((value: OfferStatusFilter) => { setStatus(value); setPage(1); }, []);
  const handleClearFilters = useCallback(() => {
    setSearchQuery(''); setDebouncedSearch(''); setCategory('all');
    setPromotionFilter(null); setSort('best_savings'); setStatus('active'); setPage(1);
  }, []);
  const handleAddToCart = useCallback((item: OfferItem, quantity = 1) => {
    const product = toCartProduct(item);
    addToCart(product as CatalogCartProduct, quantity);
    const price = Number(product.offer_price ?? product.sale_price ?? 0);
    setAriaLive(`Producto agregado: ${product.name} - ${formatCurrency(price)}`);
  }, [addToCart, formatCurrency]);

  const hasActiveFilters = Boolean(
    searchQuery || category !== 'all' || promotionFilter || sort !== 'best_savings' || status !== 'active'
  );
  const promotionFilterName = useMemo(() => {
    if (!promotionFilter) return null;
    return offers.find((item) => item.promotion.id === promotionFilter)?.promotion.name || 'Promocion seleccionada';
  }, [offers, promotionFilter]);
  const categoryName = useMemo(
    () => (category && category !== 'all') ? categories.find((c) => c.id === category)?.name ?? null : null,
    [category, categories]
  );
  const sortLabel: Record<OfferSortMode, string> = {
    best_savings: 'Mayor ahorro', highest_discount: '% descuento',
    price_low_high: 'Precio menor', price_high_low: 'Precio mayor', ending_soon: 'Termina pronto',
  };
  const statusLabel: Record<OfferStatusFilter, string> = {
    active: 'Activas', upcoming: 'Proximas', ended: 'Finalizadas',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950/10">
      <NavBar config={config} activeSection="ofertas" onNavigate={(s) => router.push(tenantHref(`/home#${s}`))} vertical={vertical} />

      {/* ── Sticky sub-header ─────────────────────────────────────────────── */}
      <header className="sticky top-[var(--public-nav-height,4rem)] z-40 border-b border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 p-2.5 rounded-xl" style={{ backgroundColor: `${brandPrimary}22` }}>
                <Sparkles className="w-5 h-5" style={{ color: brandPrimary }} />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-foreground text-lg tracking-tight truncate">
                  {content.offersTitle || 'Ofertas'}
                </h1>
                <div className="hidden sm:flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                    {content.offersDescription || config.businessName}
                  </p>
                  {!loading && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50">
                      {pagination.total} resultado{pagination.total !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {canUseCart ? (
              <Button
                size="icon"
                disabled={cartItemsCount === 0}
                style={{ backgroundColor: brandPrimary }}
                className="relative h-10 w-10 rounded-xl text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:brightness-110 border-0 disabled:opacity-40 disabled:hover:scale-100"
                onClick={handleCheckout}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-2 border-white dark:border-slate-900 rounded-full">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-32">
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{ariaLive}</div>

        <Breadcrumbs
          items={[
            { label: 'Inicio', href: tenantHref('/home') },
            { label: 'Ofertas', href: tenantHref('/offers') },
          ]}
          className="mb-6"
        />

        {/* ── Promotion filter banner ──────────────────────────────────────── */}
        {promotionFilter ? (
          <section className="mb-6 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4 dark:border-rose-900/40 dark:from-rose-950/20 dark:to-pink-950/10 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold text-rose-900 dark:text-rose-100 text-sm">Vista de promocion</p>
                  <p className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-300/80">
                    Mostrando las ofertas de <strong>{promotionFilterName || 'la promocion seleccionada'}</strong>.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearFilters}
                className="border-rose-200 hover:bg-rose-100 dark:border-rose-800 text-rose-700 dark:text-rose-300 shrink-0">
                <X className="h-3.5 w-3.5 mr-1.5" /> Ver todas
              </Button>
            </div>
          </section>
        ) : null}

        {/* ── Urgency banner ───────────────────────────────────────────────── */}
        {expiringOffers.length > 0 ? (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-5 py-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-amber-950/20 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-300">Terminan hoy</p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Estas promociones vencen en menos de 24 horas</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {expiringOffers.map(({ offer, validation }) => (
                  <button
                    key={`${offer.product.id}-${offer.promotion.id}`}
                    type="button"
                    onClick={() => { setSelectedItem(offer); setDetailOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-2 text-sm text-slate-700 transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm dark:border-amber-900/40 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <span className="font-medium truncate max-w-[120px]">{offer.product.name}</span>
                    <span className="shrink-0 font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5 text-xs">
                      {validation.hoursRemaining}h
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="offers-search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar por producto o promocion..."
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={status} onValueChange={(v) => handleStatusChange(v as OfferStatusFilter)}>
                  <SelectTrigger id="offers-status" className="w-[148px] rounded-xl">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Activas</span>
                    </SelectItem>
                    <SelectItem value="upcoming">
                      <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" />Proximas</span>
                    </SelectItem>
                    <SelectItem value="ended">
                      <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" />Finalizadas</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="offers-category" className="w-[172px] rounded-xl">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2"><Package className="h-4 w-4" />Todas las categorias</span>
                    </SelectItem>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className="flex items-center gap-2"><Tag className="h-4 w-4" />{item.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => handleSortChange(v as OfferSortMode)}>
                  <SelectTrigger id="offers-sort" className="w-[188px] rounded-xl">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best_savings">
                      <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Mayor ahorro</span>
                    </SelectItem>
                    <SelectItem value="highest_discount">
                      <span className="flex items-center gap-2"><Percent className="h-4 w-4 text-rose-500" />% descuento</span>
                    </SelectItem>
                    <SelectItem value="price_low_high">
                      <span className="flex items-center gap-2"><ArrowUp className="h-4 w-4" />Precio menor</span>
                    </SelectItem>
                    <SelectItem value="price_high_low">
                      <span className="flex items-center gap-2"><ArrowDown className="h-4 w-4" />Precio mayor</span>
                    </SelectItem>
                    <SelectItem value="ending_soon">
                      <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" />Termina pronto</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Filter className="h-3.5 w-3.5" />Filtros activos:
                </span>
                {searchQuery && (
                  <FilterChip label={`"${searchQuery}"`} onRemove={() => { setSearchQuery(''); setPage(1); }} />
                )}
                {category !== 'all' && categoryName && (
                  <FilterChip label={categoryName} onRemove={() => { setCategory('all'); setPage(1); }} />
                )}
                {sort !== 'best_savings' && (
                  <FilterChip label={sortLabel[sort]} onRemove={() => { setSort('best_savings'); setPage(1); }} />
                )}
                {status !== 'active' && (
                  <FilterChip label={statusLabel[status]} onRemove={() => { setStatus('active'); setPage(1); }} />
                )}
                <button type="button" onClick={handleClearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 transition-colors">
                  Limpiar todo
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Carousel ────────────────────────────────────────────────────── */}
        {!debouncedSearch && category === 'all' && !promotionFilter && initialCarouselItems.length > 0 ? (
          <PublicOffersCarousel
            initialItems={initialCarouselItems}
            showCart={canUseCart}
            onAddToCart={canUseCart ? ((productLike: CatalogCartProduct) => {
              addToCart(productLike, 1);
              const price = Number(productLike.offer_price ?? productLike.sale_price ?? 0);
              setAriaLive(`Producto agregado: ${productLike.name} - ${formatCurrency(price)}`);
            }) : undefined}
            onViewDetails={(item) => { setSelectedItem(item); setDetailOpen(true); }}
          />
        ) : null}

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error ? (
          <Alert variant="destructive" className="mb-6 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry} className="shrink-0">
                <RefreshCw className="mr-2 h-4 w-4" />Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* ── Offers grid ─────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${brandPrimary}18` }}>
              <Zap className="h-4 w-4" style={{ color: brandPrimary }} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Explora las ofertas</h2>
            {!loading && (
              <Badge variant="outline" className="font-semibold">
                {pagination.total} {pagination.total === 1 ? 'resultado' : 'resultados'}
              </Badge>
            )}
            {loading && <span className="text-sm text-muted-foreground animate-pulse">Actualizando...</span>}
          </div>

          {loading && offers.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <OfferCardSkeleton key={i} />)}
            </div>
          ) : offers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-20 px-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Package className="h-10 w-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">No encontramos ofertas</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Ajusta los filtros activos, cambia la categoria o vuelve a las ofertas activas.
              </p>
              {hasActiveFilters && (
                <Button onClick={handleClearFilters} className="mt-6 rounded-xl" style={{ backgroundColor: brandPrimary }}>
                  <X className="mr-2 h-4 w-4" />Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
              {offers.map((item) => {
                const imageUrl = item.product.images?.[0]?.url || item.product.image || '/api/placeholder/400/400';
                const timeRemaining = item.promotion.endDate ? formatTimeRemaining(item.promotion.endDate) : null;
                const isUrgent = Boolean(timeRemaining && !timeRemaining.includes('dia'));
                const isOutOfStock = Number(item.product.stock_quantity ?? 0) <= 0;
                const stockQty = Number(item.product.stock_quantity ?? 0);
                const isLowStock = stockQty > 0 && stockQty <= 5;
                return (
                  <Card
                    key={`${item.product.id}-${item.promotion.id}`}
                    className={`group overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white dark:bg-slate-900 ${
                      isUrgent
                        ? 'border-rose-200 dark:border-rose-900/40 hover:shadow-rose-100/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Product image */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <Image
                        src={imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      {/* Top-left badges */}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-black text-white shadow-lg shadow-rose-600/30">
                          <Percent className="h-3.5 w-3.5" />-{Math.round(item.discountPercent)}%
                        </span>
                        {item.product.categoryName ? (
                          <span className="inline-flex items-center rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                            {item.product.categoryName}
                          </span>
                        ) : null}
                      </div>
                      {/* Countdown */}
                      {timeRemaining ? (
                        <div className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm ${
                          isUrgent ? 'bg-rose-600/90' : 'bg-slate-900/75'
                        }`}>
                          <Clock className="h-3 w-3" />{timeRemaining}
                        </div>
                      ) : null}
                      {/* Low stock */}
                      {isLowStock && (
                        <div className="absolute right-3 bottom-16 inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                          Quedan {stockQty}!
                        </div>
                      )}
                      {/* Title overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{item.promotion.name}</p>
                        <h3 className="mt-1 text-base font-bold text-white leading-tight line-clamp-2">{item.product.name}</h3>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-400 dark:text-slate-500 line-through">{formatCurrency(item.basePrice)}</p>
                          <p className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-500">{formatCurrency(item.offerPrice)}</p>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Ahorras {formatCurrency(item.savings)}</p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="shrink-0 h-9 w-9 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          onClick={() => { setSelectedItem(item); setDetailOpen(true); }}
                          aria-label="Ver detalle rapido"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                      {isOutOfStock && (
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-center">
                          Sin stock disponible
                        </p>
                      )}
                      <div className="flex gap-2.5">
                        {sections.showCatalog ? (
                          <Button asChild variant="outline" className="flex-1 rounded-xl text-sm h-9">
                            <Link href={tenantHref(`/catalog/${item.product.id}`)}>
                              <Tag className="mr-1.5 h-3.5 w-3.5" />Ver producto
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" className="flex-1 rounded-xl text-sm h-9"
                            onClick={() => { setSelectedItem(item); setDetailOpen(true); }}>
                            <Info className="mr-1.5 h-3.5 w-3.5" />Ver detalle
                          </Button>
                        )}
                        {canUseCart ? (
                          <Button
                            className="flex-1 rounded-xl text-sm h-9 font-semibold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                            style={!isOutOfStock ? { backgroundColor: brandPrimary } : {}}
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(item)}
                          >
                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                            {isOutOfStock ? 'Sin stock' : 'Agregar'}
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={Math.max(1, pagination.totalPages)}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={setPage}
            onItemsPerPageChange={(value) => { setLimit(value); setPage(1); }}
            className="pt-6"
            showInfo
            maxVisiblePages={7}
          />
        </section>
      </main>

      <Footer config={config} onNavigate={(s) => router.push(tenantHref(`/home#${s}`))} />

      <OfferQuickViewModal
        item={selectedItem}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedItem(null); }}
        onAddToCart={canUseCart ? handleAddToCart : undefined}
        config={config}
        allowAddToCart={canUseCart}
        allowViewProduct={sections.showCatalog}
      />

      {canUseCart ? (
        <Suspense fallback={null}>
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            cartItems={cart.map((item) => ({
              id: item.product.id, name: item.product.name,
              price: Number(item.product.offer_price ?? item.product.sale_price ?? 0),
              quantity: item.quantity, image: item.product.image_url,
            }))}
            cartTotal={computedCartTotal}
            onRemoveItem={removeFromCart}
            onUpdateItemQuantity={updateQuantity}
            onOrderSuccess={handleOrderSuccess}
          />
          <OrderConfirmationModal
            isOpen={Boolean(orderConfirmation)}
            onClose={handleOrderConfirmationClose}
            orderId={orderConfirmation?.orderId || ''}
            customerName={orderConfirmation?.customerName || ''}
            customerEmail={orderConfirmation?.customerEmail || ''}
            total={orderConfirmation?.total || 0}
            paymentMethod={orderConfirmation?.paymentMethod || ''}
            orderDate={orderConfirmation?.orderDate || ''}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
