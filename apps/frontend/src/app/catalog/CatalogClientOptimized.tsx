'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import NavBar from '@/app/home/components/NavBar';
import CatalogFiltersOptimized, { type ViewMode } from './components/CatalogFiltersOptimized';
import ProductGridOptimized from './components/ProductGridOptimized';
import QuickViewModal from './components/QuickViewModal';
import { type AdvancedFilters } from './components/FilterDrawer';
import {
  buildCatalogSearchParams,
  CATALOG_DEFAULT_PAGE_SIZE,
  type CatalogQueryState,
  type CatalogSortMode,
} from './catalog-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Pagination from '@/components/catalog/Pagination';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useCatalogAudit } from '@/hooks/useCatalogAudit';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import type { Product, Category } from '@/types';

type OrderConfirmationData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
};

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cartItems: { id: string; name: string; price: number; quantity: number; image?: string }[];
  cartTotal?: number;
  onRemoveItem?: (productId: string) => void;
  onUpdateItemQuantity?: (productId: string, quantity: number) => void;
  onOrderSuccess: (orderData: OrderConfirmationData) => void;
};

type OrderConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
};

type CatalogProductsPayload = {
  products: Product[];
  totalProducts: number;
  maxPrice: number;
};

const CheckoutModal = dynamic<CheckoutModalProps>(
  () => import('@/components/catalog/CheckoutModal').then((module) => module.default),
  { loading: () => null }
);

const OrderConfirmationModal = dynamic<OrderConfirmationModalProps>(
  () => import('@/components/catalog/OrderConfirmationModal').then((module) => module.default),
  { loading: () => null }
);

interface CatalogClientOptimizedProps {
  initialProducts: Product[];
  initialCategories: Category[];
  initialTotalProducts: number;
  initialMaxPrice: number;
  initialQueryState: CatalogQueryState;
}

function buildInitialFilters(
  initialQueryState: CatalogQueryState,
  initialMaxPrice: number
): AdvancedFilters {
  const upperBound =
    initialQueryState.maxPrice !== null
      ? Math.min(initialQueryState.maxPrice, initialMaxPrice)
      : initialMaxPrice;

  return {
    categories: initialQueryState.categories,
    priceRange: [Math.max(initialQueryState.minPrice, 0), Math.max(upperBound, 1)],
    rating: initialQueryState.rating,
    inStock: initialQueryState.inStock,
    onSale: initialQueryState.onSale,
    brands: [],
    tags: [],
  };
}

export default function CatalogClientOptimized({
  initialProducts,
  initialCategories,
  initialTotalProducts,
  initialMaxPrice,
  initialQueryState,
}: CatalogClientOptimizedProps) {
  const router = useRouter();
  const { config } = useBusinessConfig();
  const { tenantHref, tenantApiPath } = useTenantPublicRouting();
  const categories = initialCategories;
  const initialAdvancedFilters = useMemo(
    () => buildInitialFilters(initialQueryState, initialMaxPrice),
    [initialMaxPrice, initialQueryState]
  );

  const {
    cart,
    cartTotal,
    cartItemsCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCatalogCart();

  const {
    favorites,
    toggleFavorite,
  } = useFavorites();

  const {
    logPageView,
    logProductView,
    logSearch,
    logCategoryFilter,
    logAddToCart,
    logCheckoutStart,
    logCheckoutComplete,
    logOrderCreated,
    logFilterApplied,
    logSortChanged,
    logViewModeChanged,
  } = useCatalogAudit();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [totalProducts, setTotalProducts] = useState(initialTotalProducts);
  const [maxPrice, setMaxPrice] = useState(Math.max(initialMaxPrice, 1));

  const [page, setPage] = useState(initialQueryState.page);
  const [itemsPerPage, setItemsPerPage] = useState(initialQueryState.itemsPerPage);
  const [searchQuery, setSearchQuery] = useState(initialQueryState.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQueryState.search);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialQueryState.categories);
  const [sortBy, setSortBy] = useState<CatalogSortMode>(initialQueryState.sortBy);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showOnlyInStock, setShowOnlyInStock] = useState(initialQueryState.inStock);
  const [showOnlyOnSale, setShowOnlyOnSale] = useState(initialQueryState.onSale);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(initialAdvancedFilters);

  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderConfirmationData, setOrderConfirmationData] = useState<OrderConfirmationData | null>(null);

  const skipInitialFetchRef = useRef(true);
  const previousMaxPriceRef = useRef(Math.max(initialMaxPrice, 1));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    logPageView('/catalog', {
      search: initialQueryState.search || null,
      categories: initialQueryState.categories,
      onSale: initialQueryState.onSale,
    });
  }, [initialQueryState.categories, initialQueryState.onSale, initialQueryState.search, logPageView]);

  useEffect(() => {
    try {
      const savedView = localStorage.getItem('catalog.viewMode');
      if (savedView === 'grid' || savedView === 'list' || savedView === 'compact') {
        setViewMode(savedView);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('catalog.viewMode', viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    const previousMaxPrice = previousMaxPriceRef.current;
    setAdvancedFilters((previous) => {
      const shouldSyncUpperBound =
        previous.priceRange[1] === previousMaxPrice || previous.priceRange[1] > maxPrice;
      const nextUpperBound = shouldSyncUpperBound ? maxPrice : previous.priceRange[1];
      const nextLowerBound = Math.min(previous.priceRange[0], nextUpperBound);

      if (
        nextUpperBound === previous.priceRange[1] &&
        nextLowerBound === previous.priceRange[0]
      ) {
        return previous;
      }

      return {
        ...previous,
        priceRange: [nextLowerBound, nextUpperBound],
      };
    });
    previousMaxPriceRef.current = maxPrice;
  }, [maxPrice]);

  const requestState = useMemo<CatalogQueryState>(() => {
    const normalizedMaxPrice =
      advancedFilters.priceRange[1] < maxPrice ? advancedFilters.priceRange[1] : null;

    return {
      search: debouncedSearch,
      categories: selectedCategories,
      sortBy,
      inStock: showOnlyInStock,
      onSale: showOnlyOnSale,
      page,
      itemsPerPage,
      minPrice: advancedFilters.priceRange[0],
      maxPrice: normalizedMaxPrice,
      rating: advancedFilters.rating,
    };
  }, [
    advancedFilters.priceRange,
    advancedFilters.rating,
    debouncedSearch,
    itemsPerPage,
    maxPrice,
    page,
    selectedCategories,
    showOnlyInStock,
    showOnlyOnSale,
    sortBy,
  ]);

  const requestQueryString = useMemo(
    () =>
      buildCatalogSearchParams(requestState, {
        defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE,
        maxPriceCeiling: maxPrice,
      }).toString(),
    [maxPrice, requestState]
  );

  useEffect(() => {
    const params = buildCatalogSearchParams(requestState, {
      defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE,
      maxPriceCeiling: maxPrice,
    });
    const query = params.toString();
    router.replace(query ? tenantHref(`/catalog?${query}`) : tenantHref('/catalog'), { scroll: false });
  }, [maxPrice, requestState, router, tenantHref]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    const target = requestQueryString
      ? tenantApiPath(`/api/catalog/products?${requestQueryString}`)
      : tenantApiPath('/api/catalog/products');

    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(target, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | (CatalogProductsPayload & { error?: string })
          | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error || 'No pudimos cargar los productos.');
        }

        setProducts(payload.products || []);
        setTotalProducts(payload.totalProducts || 0);
        setMaxPrice(Math.max(payload.maxPrice || 0, 1));

        if (debouncedSearch) {
          logSearch(debouncedSearch, payload.totalProducts || 0);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return;
        }

        console.error('[Catalog] Error loading products:', fetchError);
        setError('No pudimos cargar los productos. Intenta nuevamente.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => controller.abort();
  }, [debouncedSearch, logSearch, requestQueryString, retryNonce, tenantApiPath]);

  const handleRetry = useCallback(() => {
    setRetryNonce((previous) => previous + 1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    const nextCategories = categoryId === 'all' ? [] : [categoryId];
    setSelectedCategories(nextCategories);
    setAdvancedFilters((previous) => ({ ...previous, categories: nextCategories }));
    setPage(1);

    if (categoryId !== 'all') {
      const category = categories.find((item) => item.id === categoryId);
      logCategoryFilter(categoryId, category?.name);
    }
  }, [categories, logCategoryFilter]);

  const handleCategoryRemove = useCallback((categoryId: string) => {
    setSelectedCategories((previous) => {
      const nextCategories = previous.filter((value) => value !== categoryId);
      setAdvancedFilters((current) => ({ ...current, categories: nextCategories }));
      return nextCategories;
    });
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: CatalogSortMode) => {
    setSortBy(value);
    setPage(1);
    logSortChanged(value);
  }, [logSortChanged]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    logViewModeChanged(mode);
  }, [logViewModeChanged]);

  const handleInStockChange = useCallback((value: boolean) => {
    setShowOnlyInStock(value);
    setAdvancedFilters((previous) => ({ ...previous, inStock: value }));
    setPage(1);
  }, []);

  const handleToggleOnSale = useCallback(() => {
    setShowOnlyOnSale((previous) => {
      const nextValue = !previous;
      setAdvancedFilters((current) => ({ ...current, onSale: nextValue }));
      return nextValue;
    });
    setPage(1);
  }, []);

  const handleAdvancedFiltersChange = useCallback((filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
    setSelectedCategories(filters.categories);
    setShowOnlyInStock(filters.inStock);
    setShowOnlyOnSale(filters.onSale);
    setPage(1);
    logFilterApplied('advanced', filters);
  }, [logFilterApplied]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategories([]);
    setSortBy('popular');
    setShowOnlyInStock(true);
    setShowOnlyOnSale(false);
    setAdvancedFilters({
      categories: [],
      priceRange: [0, maxPrice],
      rating: null,
      inStock: true,
      onSale: false,
      brands: [],
      tags: [],
    });
    setPage(1);
  }, [maxPrice]);

  const handleQuickView = useCallback((product: Product) => {
    setSelectedProduct(product);
    logProductView(product.id, product.name);
  }, [logProductView]);

  const handleAddToCart = useCallback((product: Product, quantity = 1) => {
    addToCart(product, quantity);
    logAddToCart(product.id, quantity, product.name, Number(product.offer_price ?? product.sale_price));
  }, [addToCart, logAddToCart]);

  const handleToggleFavorite = useCallback((productId: string) => {
    toggleFavorite(productId);
  }, [toggleFavorite]);

  const handleCheckout = useCallback(() => {
    if (cartItemsCount <= 0) {
      return;
    }

    setShowCheckout(true);
    logCheckoutStart(cartTotal, cartItemsCount);
  }, [cartItemsCount, cartTotal, logCheckoutStart]);

  const handleOrderSuccess = useCallback((orderData: OrderConfirmationData) => {
    setShowCheckout(false);
    setShowOrderConfirmation(true);
    setOrderConfirmationData(orderData);
    logOrderCreated(orderData.orderId, orderData.customerEmail, orderData.total, cartItemsCount);
    logCheckoutComplete(orderData.orderId, orderData.total, orderData.paymentMethod);
    clearCart();
  }, [cartItemsCount, clearCart, logCheckoutComplete, logOrderCreated]);

  const goToPage = useCallback((nextPage: number) => {
    if (nextPage === page) {
      return;
    }

    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleItemsPerPageChange = useCallback((nextItemsPerPage: number) => {
    setItemsPerPage(nextItemsPerPage);
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalProducts / itemsPerPage));

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0f1a] transition-colors duration-500">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <NavBar
        config={config}
        activeSection="explorar"
        onNavigate={(section) => router.push(tenantHref(`/home#${section}`))}
        showCartButton={false}
      />

      <header className="sticky top-16 z-40 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground text-lg tracking-tight">Catalogo</h1>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold hidden sm:block">
                  {config.businessName}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={cartItemsCount === 0}
              className="relative h-10 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-105 active:scale-95 gap-2 border-0 disabled:opacity-60 disabled:hover:scale-100"
              onClick={handleCheckout}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Carrito</span>
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-2 border-white dark:border-slate-900 rounded-full animate-bounce">
                  {cartItemsCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: tenantHref('/home') },
            { label: 'Catalogo', href: tenantHref('/catalog') },
            ...(selectedCategories.length === 1
              ? [{
                  label: categories.find((item) => item.id === selectedCategories[0])?.name || 'Categoria',
                  href: tenantHref(`/catalog?${buildCatalogSearchParams({
                    ...requestState,
                    page: 1,
                    categories: selectedCategories,
                  }, {
                    defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE,
                    maxPriceCeiling: maxPrice,
                  }).toString()}`),
                }]
              : []),
          ]}
          className="mb-6"
        />

        <CatalogFiltersOptimized
          selectedCategories={selectedCategories}
          sortBy={sortBy}
          viewMode={viewMode}
          showOnlyInStock={showOnlyInStock}
          showOnlyOnSale={showOnlyOnSale}
          categories={categories}
          resultsCount={products.length}
          totalProducts={totalProducts}
          maxPrice={maxPrice}
          advancedFilters={advancedFilters}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onCategorySelect={handleCategorySelect}
          onCategoryRemove={handleCategoryRemove}
          onSortChange={handleSortChange}
          onViewModeChange={handleViewModeChange}
          onAdvancedFiltersChange={handleAdvancedFiltersChange}
          onClearFilters={handleClearFilters}
          onInStockChange={handleInStockChange}
          onToggleOnSale={handleToggleOnSale}
          config={config}
        />

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading && products.length > 0 && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 backdrop-blur-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Actualizando productos...</span>
            </div>
          </div>
        )}

        <div className="mt-6">
          <ProductGridOptimized
            products={products}
            viewMode={viewMode}
            favorites={favorites}
            loading={loading && products.length === 0}
            onToggleFavorite={handleToggleFavorite}
            onQuickView={handleQuickView}
            onAddToCart={(product) => handleAddToCart(product, 1)}
            onClearFilters={handleClearFilters}
            config={config}
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalProducts}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            className="pt-8"
            showItemsPerPage
            showInfo
            maxVisiblePages={7}
          />
        </div>
      </main>

      <QuickViewModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
        config={config}
        categoryName={
          selectedProduct?.category_id
            ? categories.find((item) => item.id === selectedProduct.category_id)?.name || null
            : null
        }
      />

      <Suspense fallback={null}>
        {showCheckout && (
          <CheckoutModal
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
            cartItems={cart.map((item) => ({
              id: item.product.id,
              name: item.product.name,
              price: Number(item.product.offer_price ?? item.product.sale_price),
              quantity: item.quantity,
              image: item.product.image_url || undefined,
            }))}
            cartTotal={cartTotal}
            onRemoveItem={removeFromCart}
            onUpdateItemQuantity={updateQuantity}
            onOrderSuccess={handleOrderSuccess}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showOrderConfirmation && orderConfirmationData && (
          <OrderConfirmationModal
            isOpen={showOrderConfirmation}
            onClose={() => {
              setShowOrderConfirmation(false);
              setOrderConfirmationData(null);
            }}
            orderId={orderConfirmationData.orderId}
            customerName={orderConfirmationData.customerName}
            customerEmail={orderConfirmationData.customerEmail}
            total={orderConfirmationData.total}
            paymentMethod={orderConfirmationData.paymentMethod}
            orderDate={orderConfirmationData.orderDate}
          />
        )}
      </Suspense>
    </div>
  );
}
