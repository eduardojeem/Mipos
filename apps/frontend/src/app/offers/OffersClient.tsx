'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Clock,
  Info,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
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
import PageHero from '@/components/public-tenant/PageHero';
import Pagination from '@/components/catalog/Pagination';
import { getTenantPublicContent, getTenantPublicSections } from '@/lib/public-site/tenant-public-config';
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

interface OffersClientProps {
  initialOffers: OfferItem[];
  initialCategories: OfferCategory[];
  initialCarouselItems: OfferItem[];
  initialPagination: OfferPagination;
  initialQueryState: OfferQueryState;
}

type OffersApiPayload = {
  success: boolean;
  data: OfferItem[];
  categories: OfferCategory[];
  pagination: OfferPagination;
  error?: string;
};

function toCartProduct(item: OfferItem): OfferProduct & {
  image_url?: string;
  offer_price?: number;
  is_active: boolean;
} {
  const hasOfferPrice = Number.isFinite(item.offerPrice) && item.offerPrice < item.basePrice;
  return {
    id: item.product.id,
    name: item.product.name,
    sale_price: item.basePrice,
    offer_price: hasOfferPrice ? item.offerPrice : undefined,
    image_url: item.product.images?.[0]?.url || item.product.image,
    stock_quantity: Number(item.product.stock_quantity ?? 0),
    is_active: true,
    images: item.product.images,
    image: item.product.image,
    category_id: item.product.category_id,
    categoryName: item.product.categoryName,
    sku: item.product.sku,
    description: item.product.description,
    brand: item.product.brand,
  };
}

export type {
  DiscountType,
  OfferCategory,
  OfferItem,
  OfferPagination,
  OfferProduct as Product,
  OfferPromotion as Promotion,
} from './offers-types';

export default function OffersClient({
  initialOffers,
  initialCategories,
  initialCarouselItems,
  initialPagination,
  initialQueryState,
}: OffersClientProps) {
  const { config } = useBusinessConfig();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const formatCurrency = useCurrencyFormatter();
  const router = useRouter();
  const { addToCart } = useCatalogCart();
  const { tenantApiPath, tenantHref } = useTenantPublicRouting();
  const canUseCart = sections.showCart;
  type CatalogCartProduct = Parameters<typeof addToCart>[0];

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
  const skipInitialFetchRef = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (category !== 'all' && !categories.some((item) => item.id === category)) {
      setCategory('all');
      setPage(1);
    }
  }, [categories, category]);

  const requestState = useMemo<OfferQueryState>(() => ({
    search: debouncedSearch,
    category: category === 'all' ? null : category,
    promotion: promotionFilter,
    sort,
    status,
    page,
    limit,
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
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    const target = requestQueryString
      ? tenantApiPath(`/api/offers?${requestQueryString}`)
      : tenantApiPath('/api/offers');

    const fetchOffers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(target, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        const result = (await response.json().catch(() => null)) as OffersApiPayload | null;
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'No se pudieron cargar las ofertas');
        }

        setOffers(result.data || []);
        setCategories(result.categories || []);
        setPagination(result.pagination);
        setPage(result.pagination.page || 1);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return;
        }

        console.error('[Offers] Error loading offers:', fetchError);
        setError('No pudimos cargar las ofertas. Intenta nuevamente.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchOffers();

    return () => controller.abort();
  }, [requestQueryString, retryNonce, tenantApiPath]);

  const expiringOffers = useMemo(
    () =>
      offers
        .map((offer) => ({
          offer,
          validation: validatePromotion(offer.promotion),
        }))
        .filter(
          ({ validation }) =>
            validation.hoursRemaining !== null &&
            validation.hoursRemaining > 0 &&
            validation.hoursRemaining <= 24
        )
        .sort((left, right) => (left.validation.hoursRemaining || 0) - (right.validation.hoursRemaining || 0))
        .slice(0, 3),
    [offers]
  );

  const handleRetry = useCallback(() => {
    setRetryNonce((previous) => previous + 1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: OfferSortMode) => {
    setSort(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: OfferStatusFilter) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCategory('all');
    setPromotionFilter(null);
    setSort('best_savings');
    setStatus('active');
    setPage(1);
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
    if (!promotionFilter) {
      return null;
    }

    const match = offers.find((item) => item.promotion.id === promotionFilter);
    return match?.promotion.name || 'Promocion seleccionada';
  }, [offers, promotionFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar
        config={config}
        activeSection="ofertas"
        onNavigate={(sectionId) => router.push(tenantHref(`/home#${sectionId}`))}
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {ariaLive}
        </div>

        <PageHero
          config={config}
          badge={content.heroBadge || 'Promociones'}
          title={content.offersTitle || 'Ofertas activas del negocio'}
          description={
            content.offersDescription ||
            'Descubre promociones reales, filtra por categoria y prioriza los productos con mejor ahorro.'
          }
          actions={[
            { href: '/offers', label: 'Explorar ofertas', variant: 'primary' },
            ...(sections.showCatalog
              ? [{ href: '/catalog', label: 'Ir al catalogo', variant: 'secondary' as const }]
              : []),
          ]}
          metrics={[
            {
              label: 'Ofertas activas',
              value: pagination.total,
              helpText: 'Resultados disponibles con tus filtros actuales.',
            },
            {
              label: 'Categorias',
              value: categories.length,
              helpText: 'Segmentos de productos con promociones visibles.',
            },
          ]}
        />

        {promotionFilter ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Vista sincronizada con promociones</p>
                <p className="mt-1 text-rose-800/80 dark:text-rose-200/80">
                  Mostrando las ofertas de {promotionFilterName || 'la promocion seleccionada'}.
                </p>
              </div>
              <Button variant="outline" onClick={handleClearFilters}>
                Ver todas las ofertas
              </Button>
            </div>
          </section>
        ) : null}

        {expiringOffers.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                  <p className="text-sm font-semibold uppercase tracking-[0.16em]">Por expirar</p>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Algunas promociones se terminan hoy. Revisa primero las mas urgentes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {expiringOffers.map(({ offer, validation }) => (
                  <button
                    key={`${offer.product.id}-${offer.promotion.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedItem(offer);
                      setDetailOpen(true);
                    }}
                    className="rounded-full border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-amber-950/20"
                  >
                    {offer.product.name}
                    <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">
                      {validation.hoursRemaining}h
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <PublicOffersCarousel
          initialItems={initialCarouselItems}
          showCart={canUseCart}
          onAddToCart={
            canUseCart
              ? ((productLike: CatalogCartProduct) => {
                  addToCart(productLike, 1);
                  const price = Number(productLike.offer_price ?? productLike.sale_price ?? 0);
                  setAriaLive(`Producto agregado: ${productLike.name} - ${formatCurrency(price)}`);
                })
              : undefined
          }
          onViewDetails={(item) => {
            setSelectedItem(item);
            setDetailOpen(true);
          }}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Buscar por producto o promocion..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={status} onValueChange={(value) => handleStatusChange(value as OfferStatusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="upcoming">Proximas</SelectItem>
                  <SelectItem value="ended">Finalizadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[176px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorias</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => handleSortChange(value as OfferSortMode)}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best_savings">Mayor ahorro</SelectItem>
                  <SelectItem value="highest_discount">% descuento</SelectItem>
                  <SelectItem value="price_low_high">Precio menor</SelectItem>
                  <SelectItem value="price_high_low">Precio mayor</SelectItem>
                  <SelectItem value="ending_soon">Termina pronto</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="h-5 w-5 text-rose-500" />
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
              Explora las ofertas
            </h2>
            <Badge variant="outline">
              {pagination.total} {pagination.total === 1 ? 'resultado' : 'resultados'}
            </Badge>
          </div>

          {loading && offers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Actualizando ofertas...
            </div>
          ) : offers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <Package className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-50">
                No encontramos ofertas
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Ajusta la busqueda, cambia la categoria o vuelve a activas.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((item) => {
                const imageUrl =
                  item.product.images?.[0]?.url ||
                  item.product.image ||
                  '/api/placeholder/400/400';
                const timeRemaining = item.promotion.endDate
                  ? formatTimeRemaining(item.promotion.endDate)
                  : null;
                const isUrgent = Boolean(timeRemaining && !timeRemaining.includes('dia'));
                const isOutOfStock = Number(item.product.stock_quantity ?? 0) <= 0;

                return (
                  <Card
                    key={`${item.product.id}-${item.promotion.id}`}
                    className={`overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md ${
                      isUrgent
                        ? 'border-rose-200 dark:border-rose-900/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <Image
                        src={imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 1280px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 to-transparent" />
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
                          -{Math.round(item.discountPercent)}%
                        </span>
                        {item.product.categoryName ? (
                          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                            {item.product.categoryName}
                          </span>
                        ) : null}
                      </div>
                      {timeRemaining ? (
                        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">
                          <Clock className="h-3 w-3" />
                          {timeRemaining}
                        </div>
                      ) : null}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                          {item.promotion.name}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">
                          {item.product.name}
                        </h3>
                      </div>
                    </div>

                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400 line-through dark:text-slate-500">
                            {formatCurrency(item.basePrice)}
                          </p>
                          <p className="text-2xl font-semibold text-rose-600">
                            {formatCurrency(item.offerPrice)}
                          </p>
                          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Ahorras {formatCurrency(item.savings)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 rounded-full"
                          onClick={() => {
                            setSelectedItem(item);
                            setDetailOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-3">
                        {sections.showCatalog ? (
                          <Button asChild variant="outline" className="flex-1 rounded-lg">
                            <Link href={tenantHref(`/catalog/${item.product.id}`)}>
                              <Tag className="mr-2 h-4 w-4" />
                              Ver producto
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="flex-1 rounded-lg"
                            onClick={() => {
                              setSelectedItem(item);
                              setDetailOpen(true);
                            }}
                          >
                            <Info className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Button>
                        )}

                        {canUseCart ? (
                          <Button
                            className="flex-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-none disabled:opacity-60"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(item)}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
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
            onItemsPerPageChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            className="pt-6"
            showInfo
            maxVisiblePages={7}
          />
        </section>
      </main>

      <Footer config={config} onNavigate={(sectionId) => router.push(tenantHref(`/home#${sectionId}`))} />

      <OfferQuickViewModal
        item={selectedItem}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedItem(null);
        }}
        onAddToCart={canUseCart ? handleAddToCart : undefined}
        config={config}
        allowAddToCart={canUseCart}
        allowViewProduct={sections.showCatalog}
      />
    </div>
  );
}
