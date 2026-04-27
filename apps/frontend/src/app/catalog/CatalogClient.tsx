'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import NavBar from '@/app/home/components/NavBar';
import { Footer } from '@/app/home/components/Footer';
import CatalogFilters, { SortMode, ViewMode } from './components/CatalogFilters';
import ProductGrid from './components/ProductGrid';
import QuickViewModal from './components/QuickViewModal';
import Pagination from '@/components/catalog/Pagination';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { createClient } from '@/lib/supabase/client';
import PageHero from '@/components/public-tenant/PageHero';
import { getTenantPublicContent, getTenantPublicSections } from '@/lib/public-site/tenant-public-config';
import { getProductPricing } from '@/lib/public-site/product-pricing';
import type { Category, Product } from '@/types';

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cartItems: { id: string; name: string; price: number; quantity: number; image?: string }[];
  cartTotal?: number;
  onRemoveItem?: (productId: string) => void;
  onUpdateItemQuantity?: (productId: string, quantity: number) => void;
  onOrderSuccess: (orderData: any) => void;
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

const CheckoutModal = dynamic<CheckoutModalProps>(() => import('@/components/catalog/CheckoutModal').then((m) => m.default), { loading: () => null });
const OrderConfirmationModal = dynamic<OrderConfirmationModalProps>(() => import('@/components/catalog/OrderConfirmationModal').then((m) => m.default), { loading: () => null });

interface CatalogClientProps {
  organizationId: string;
  initialProducts: Product[];
  initialCategories: Category[];
}

export default function CatalogClient({ organizationId, initialProducts, initialCategories }: CatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { config } = useBusinessConfig();
  const { tenantHref } = useTenantPublicRouting();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const supabase = createClient();
  const canUseCart = sections.showCart;
  const visibleCategories = sections.showCategories ? initialCategories : [];
  const PAGE_SIZE = 36;

  const { cart, cartTotal, cartItemsCount, addToCart, removeFromCart, updateQuantity, clearCart } = useCatalogCart();
  const { favorites, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(initialProducts.length);
  const [page, setPage] = useState(Number(searchParams?.get('page') || 1));
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams?.get('category') ? [searchParams.get('category')!] : []);
  const [sortBy, setSortBy] = useState<SortMode>((searchParams?.get('sort') as SortMode) || 'popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showOnlyInStock, setShowOnlyInStock] = useState(true);
  const [showOnlyOnSale, setShowOnlyOnSale] = useState(searchParams?.get('onSale') === 'true');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderConfirmationData, setOrderConfirmationData] = useState<any>(null);

  const maxPrice = useMemo(() => Math.max(...products.map((product) => product.sale_price), 1000), [products]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategories, showOnlyInStock, showOnlyOnSale, sortBy]);

  useEffect(() => {
    if (!sections.showCategories && selectedCategories.length > 0) {
      setSelectedCategories([]);
    }
  }, [sections.showCategories, selectedCategories.length]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedCategories.length === 1) params.set('category', selectedCategories[0]);
    if (sortBy !== 'popular') params.set('sort', sortBy);
    if (showOnlyOnSale) params.set('onSale', 'true');
    if (page > 1) params.set('page', String(page));
    router.replace(
      params.toString() ? tenantHref(`/catalog?${params.toString()}`) : tenantHref('/catalog'),
      { scroll: false }
    );
  }, [debouncedSearch, selectedCategories, sortBy, showOnlyOnSale, page, router, tenantHref]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase.from('products').select('*', { count: 'exact' }).eq('organization_id', organizationId).eq('is_active', true);
        if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
        if (sections.showCategories && selectedCategories.length > 0) query = query.in('category_id', selectedCategories);
        if (showOnlyInStock) query = query.gt('stock_quantity', 0);
        if (showOnlyOnSale) query = query.not('offer_price', 'is', null);
        if (sortBy === 'price-low') query = query.order('sale_price', { ascending: true });
        else if (sortBy === 'price-high') query = query.order('sale_price', { ascending: false });
        else if (sortBy === 'rating') query = query.order('rating', { ascending: false, nullsFirst: false });
        else if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
        else if (sortBy === 'name') query = query.order('name', { ascending: true });
        else query = query.order('stock_quantity', { ascending: false });

        const start = (page - 1) * itemsPerPage;
        const { data, error: queryError, count } = await query.range(start, start + itemsPerPage - 1);
        if (queryError) throw queryError;
        setProducts((data || []) as Product[]);
        setTotalProducts(count || 0);
      } catch (err) {
        setProducts([]);
        setError(err instanceof Error ? err.message : 'Algo salió mal al cargar los productos.');
      } finally {
        setLoading(false);
      }
    };
    void loadProducts();
  }, [page, itemsPerPage, debouncedSearch, selectedCategories, showOnlyInStock, showOnlyOnSale, sortBy, supabase, organizationId, sections.showCategories]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSortBy('popular');
    setShowOnlyInStock(true);
    setShowOnlyOnSale(false);
    setPage(1);
  }, []);

  const handleOrderSuccess = useCallback((orderData: any) => {
    setShowCheckout(false);
    setShowOrderConfirmation(true);
    setOrderConfirmationData(orderData);
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0f1a] transition-all duration-500">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <NavBar
        config={config}
        activeSection="catalogo"
        onNavigate={(section) => router.push(tenantHref(`/home#${section}`))}
        showCartButton={false}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          config={config}
          badge={content.heroBadge || 'Catalogo'}
          title={content.catalogTitle || 'Catalogo publico del negocio'}
          description={content.catalogDescription || 'Busca por categoria, revisa disponibilidad y explora productos del tenant actual.'}
          actions={[
            { href: '/catalog', label: 'Explorar catalogo', variant: 'primary' },
            ...(sections.showOffers ? [{ href: '/offers', label: 'Ver ofertas', variant: 'secondary' as const }] : []),
          ]}
          metrics={[
            { label: 'Resultados', value: totalProducts, helpText: 'Productos visibles para este tenant.' },
            { label: 'Carrito', value: cartItemsCount, helpText: canUseCart ? 'Items listos para checkout.' : 'Carrito oculto por configuracion.' },
          ]}
        />

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: tenantHref('/home') },
                { label: 'Catalogo', href: tenantHref('/catalog') },
              ]}
            />

            {canUseCart ? (
              <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => setShowCheckout(true)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Mi carrito
                {cartItemsCount > 0 ? <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-950">{cartItemsCount}</span> : null}
              </Button>
            ) : null}
          </div>

          <CatalogFilters
            selectedCategories={selectedCategories}
            sortBy={sortBy}
            viewMode={viewMode}
            showOnlyInStock={showOnlyInStock}
            showOnlyOnSale={showOnlyOnSale}
            categories={visibleCategories}
            resultsCount={products.length}
            maxPrice={maxPrice}
            advancedFilters={{ categories: selectedCategories, priceRange: [0, maxPrice], rating: null, inStock: showOnlyInStock, onSale: showOnlyOnSale, brands: [], tags: [] }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCategoryChange={(categoryId) => setSelectedCategories((prev) => categoryId === 'all' ? [] : prev.includes(categoryId) ? prev.filter((item) => item !== categoryId) : [...prev, categoryId])}
            onSortChange={setSortBy}
            onViewModeChange={setViewMode}
            onAdvancedFiltersChange={(filters) => { setSelectedCategories(filters.categories); setShowOnlyInStock(filters.inStock); setShowOnlyOnSale(filters.onSale); }}
            onClearFilters={handleClearFilters}
            onToggleInStock={() => setShowOnlyInStock((value) => !value)}
            onToggleOnSale={() => setShowOnlyOnSale((value) => !value)}
            config={config}
          />
        </div>

        {error ? (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{error} Podés intentar de nuevo.</span>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 rounded-lg dark:border-white/10 dark:hover:bg-white/5" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {loading && products.length === 0 ? (
          <div className="mt-8 flex items-center justify-center rounded-[28px] border border-slate-200/70 dark:border-white/5 bg-white/60 dark:bg-white/5 backdrop-blur-xl px-6 py-20 text-sm text-slate-500 dark:text-slate-400 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
              </div>
              <p className="font-medium animate-pulse">Cargando catálogo premium...</p>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <ProductGrid
              products={products}
              viewMode={viewMode}
              favorites={favorites}
              loading={loading}
              onToggleFavorite={toggleFavorite}
              onQuickView={setSelectedProduct}
              onAddToCart={(product) => addToCart(product, 1)}
              onClearFilters={handleClearFilters}
              config={config}
              allowAddToCart={canUseCart}
            />
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(totalProducts / itemsPerPage))}
              totalItems={totalProducts}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              onItemsPerPageChange={(value) => { setItemsPerPage(value); setPage(1); }}
              className="pt-8"
              showItemsPerPage
              showInfo
              maxVisiblePages={7}
            />
          </div>
        )}
      </main>

      <Footer config={config} onNavigate={(sectionId) => router.push(tenantHref(`/home#${sectionId}`))} />

      <QuickViewModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product, quantity) => addToCart(product, quantity)}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
        config={config}
        allowAddToCart={canUseCart}
        categoryName={
          selectedProduct?.category_id
            ? visibleCategories.find((item) => item.id === selectedProduct.category_id)?.name || null
            : null
        }
      />

      <Suspense fallback={null}>
        {canUseCart && showCheckout ? (
          <CheckoutModal
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
            cartItems={cart.map((item) => ({
              id: item.product.id,
              name: item.product.name,
              price: getProductPricing(item.product as Product).displayPrice,
              quantity: item.quantity,
              image: item.product.image_url || undefined,
            }))}
            cartTotal={cartTotal}
            onRemoveItem={removeFromCart}
            onUpdateItemQuantity={updateQuantity}
            onOrderSuccess={handleOrderSuccess}
          />
        ) : null}
      </Suspense>

      <Suspense fallback={null}>
        {showOrderConfirmation && orderConfirmationData ? (
          <OrderConfirmationModal
            isOpen={showOrderConfirmation}
            onClose={() => { setShowOrderConfirmation(false); setOrderConfirmationData(null); }}
            orderId={orderConfirmationData.orderId}
            customerName={orderConfirmationData.customerName}
            customerEmail={orderConfirmationData.customerEmail}
            total={orderConfirmationData.total}
            paymentMethod={orderConfirmationData.paymentMethod}
            orderDate={orderConfirmationData.orderDate}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
