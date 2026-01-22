'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import NavBar from '@/app/home/components/NavBar';
import CatalogFilters, { ViewMode, SortMode } from './components/CatalogFilters';
import ProductGrid from './components/ProductGrid';
import QuickViewModal from './components/QuickViewModal';
import { AdvancedFilters } from './components/FilterDrawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Pagination from '@/components/catalog/Pagination';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useCatalogAudit } from '@/hooks/useCatalogAudit';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { createClient } from '@/lib/supabase/client';
import {
    AlertCircle,
    Loader2,
    RefreshCw,
    ShoppingCart,
    Sparkles
} from 'lucide-react';
import type { Product, Category } from '@/types';

// Lazy load modals with proper typing
type CheckoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    cartItems: { id: string; name: string; price: number; quantity: number; image?: string }[];
    cartTotal?: number;
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

const CheckoutModal = dynamic<CheckoutModalProps>(
    () => import('@/components/catalog/CheckoutModal').then(m => m.default),
    { loading: () => null }
);

const OrderConfirmationModal = dynamic<OrderConfirmationModalProps>(
    () => import('@/components/catalog/OrderConfirmationModal').then(m => m.default),
    { loading: () => null }
);

interface CatalogClientProps {
    initialProducts: Product[];
    initialCategories: Category[];
}

export default function CatalogClient({
    initialProducts,
    initialCategories,
}: CatalogClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { config } = useBusinessConfig();
    const supabase = createClient();
    const PAGE_SIZE = 36;

    // Custom hooks
    const {
        cart,
        cartTotal,
        cartItemsCount,
        addToCart,
        removeFromCart,
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
        logRemoveFromCart,
        logCheckoutStart,
        logCheckoutComplete,
        logOrderCreated,
        logFilterApplied,
        logSortChanged,
        logViewModeChanged,
        logLoadMore,
    } = useCatalogAudit();

    // State
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [categories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalProducts, setTotalProducts] = useState(initialProducts.length);

    // Pagination
    const [page, setPage] = useState(() => {
        const p = parseInt(searchParams?.get('page') || '1', 10);
        return Number.isFinite(p) && p > 0 ? p : 1;
    });
    const [hasMore, setHasMore] = useState(initialProducts.length >= PAGE_SIZE);
    const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE);

    // Filters
    const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        searchParams?.get('category') ? [searchParams.get('category')!] : []
    );
    const [sortBy, setSortBy] = useState<SortMode>(
        (searchParams?.get('sort') as SortMode) || 'popular'
    );
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showOnlyInStock, setShowOnlyInStock] = useState(true);
    const [showOnlyOnSale, setShowOnlyOnSale] = useState(
        searchParams?.get('onSale') === 'true'
    );
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
        categories: selectedCategories,
        priceRange: [0, 1000],
        rating: null,
        inStock: true,
        onSale: false,
        brands: [],
        tags: [],
    });

    // UI State
    const [showCheckout, setShowCheckout] = useState(false);
    const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [orderConfirmationData, setOrderConfirmationData] = useState<any>(null);

    // Max price for filters
    const maxPrice = useMemo(() => {
        return Math.max(...products.map(p => p.sale_price), 1000);
    }, [products]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Log page view on mount
    useEffect(() => {
        logPageView('/catalog', {
            search: searchParams?.get('search'),
            category: searchParams?.get('category'),
        });
    }, []); // eslint-disable-line

    // Restore preferences from localStorage
    useEffect(() => {
        try {
            const savedView = localStorage.getItem('catalog.viewMode');
            if (savedView === 'grid' || savedView === 'list' || savedView === 'compact') {
                setViewMode(savedView);
            }
        } catch { }
    }, []);

    // Persist preferences
    useEffect(() => {
        try {
            localStorage.setItem('catalog.viewMode', viewMode);
        } catch { }
    }, [viewMode]);

    // Sync filters with URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedCategories.length === 1) params.set('category', selectedCategories[0]);
        if (sortBy !== 'popular') params.set('sort', sortBy);
        if (showOnlyOnSale) params.set('onSale', 'true');
        if (page && page > 1) params.set('page', String(page));

        const query = params.toString();
        router.replace(query ? `/catalog?${query}` : '/catalog', { scroll: false });
    }, [debouncedSearch, selectedCategories, sortBy, showOnlyOnSale, page, router]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedCategories, showOnlyInStock, showOnlyOnSale, sortBy]);

    // Load products
    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            setError(null);

            try {
                let query = supabase
                    .from('products')
                    .select('*', { count: 'exact' })
                    .eq('is_active', true);

                // Apply search
                if (debouncedSearch) {
                    query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
                }

                // Apply category filter
                if (selectedCategories.length > 0) {
                    query = query.in('category_id', selectedCategories);
                }

                // Apply stock filter
                if (showOnlyInStock) {
                    query = query.gt('stock_quantity', 0);
                }

                // Apply sale filter
                if (showOnlyOnSale) {
                    query = query.gt('discount_percentage', 0);
                }

                // Apply price range
                if (advancedFilters.priceRange[0] > 0) {
                    query = query.gte('sale_price', advancedFilters.priceRange[0]);
                }
                if (advancedFilters.priceRange[1] < maxPrice) {
                    query = query.lte('sale_price', advancedFilters.priceRange[1]);
                }

                // Apply rating filter
                if (advancedFilters.rating) {
                    query = query.gte('rating', advancedFilters.rating);
                }

                // Apply sorting
                switch (sortBy) {
                    case 'price-low':
                        query = query.order('sale_price', { ascending: true });
                        break;
                    case 'price-high':
                        query = query.order('sale_price', { ascending: false });
                        break;
                    case 'rating':
                        query = query.order('rating', { ascending: false, nullsFirst: false });
                        break;
                    case 'newest':
                        query = query.order('created_at', { ascending: false });
                        break;
                    case 'name':
                        query = query.order('name', { ascending: true });
                        break;
                    default: // popular
                        query = query.order('stock_quantity', { ascending: false });
                }

                const start = (page - 1) * itemsPerPage;
                const { data, error: queryError, count } = await query.range(start, start + itemsPerPage - 1);

                if (queryError) {
                    console.error('Error loading products:', queryError);
                    setError('No pudimos cargar los productos. Verifica tu conexión.');
                    setProducts([]);
                    setHasMore(false);
                    return;
                }

                if (data) {
                    setProducts(data);
                    setTotalProducts(count || data.length);
                    const total = count || data.length;
                    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
                    setHasMore(page < totalPages);

                    if (debouncedSearch) {
                        logSearch(debouncedSearch, data.length);
                    }
                }
            } catch (err) {
                console.error('Unexpected error:', err);
                setError('Ocurrió un error inesperado.');
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [page, debouncedSearch, selectedCategories, showOnlyInStock, showOnlyOnSale, sortBy, advancedFilters, supabase, maxPrice, logSearch]);

    // Load more products
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const start = (nextPage - 1) * itemsPerPage;

            let query = supabase
                .from('products')
                .select('*')
                .eq('is_active', true);

            if (debouncedSearch) {
                query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
            }
            if (selectedCategories.length > 0) {
                query = query.in('category_id', selectedCategories);
            }
            if (showOnlyInStock) {
                query = query.gt('stock_quantity', 0);
            }
            if (showOnlyOnSale) {
                query = query.gt('discount_percentage', 0);
            }

            // Same sorting as main query
            switch (sortBy) {
                case 'price-low':
                    query = query.order('sale_price', { ascending: true });
                    break;
                case 'price-high':
                    query = query.order('sale_price', { ascending: false });
                    break;
                case 'rating':
                    query = query.order('rating', { ascending: false, nullsFirst: false });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'name':
                    query = query.order('name', { ascending: true });
                    break;
                default:
                    query = query.order('stock_quantity', { ascending: false });
            }

            const { data, error: queryError } = await query.range(start, start + itemsPerPage - 1);

            if (queryError) {
                setError('Error al cargar más productos.');
                return;
            }

            if (data) {
                setProducts(prev => {
                    const merged = [...prev, ...data];
                    setPage(nextPage);
                    setHasMore(merged.length < totalProducts);
                    logLoadMore(nextPage, data.length);
                    return merged;
                });
            }
        } finally {
            setLoadingMore(false);
        }
    }, [page, loadingMore, hasMore, debouncedSearch, selectedCategories, showOnlyInStock, showOnlyOnSale, sortBy, supabase, logLoadMore, itemsPerPage, totalProducts]);

    const goToPage = useCallback(async (p: number) => {
        if (p === page) return;
        setLoading(true);
        setError(null);
        try {
            const clamped = Math.max(1, p);
            const start = (clamped - 1) * itemsPerPage;
            let query = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('is_active', true);

            if (debouncedSearch) {
                query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
            }
            if (selectedCategories.length > 0) {
                query = query.in('category_id', selectedCategories);
            }
            if (showOnlyInStock) {
                query = query.gt('stock_quantity', 0);
            }
            if (showOnlyOnSale) {
                query = query.gt('discount_percentage', 0);
            }

            switch (sortBy) {
                case 'price-low':
                    query = query.order('sale_price', { ascending: true });
                    break;
                case 'price-high':
                    query = query.order('sale_price', { ascending: false });
                    break;
                case 'rating':
                    query = query.order('rating', { ascending: false, nullsFirst: false });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'name':
                    query = query.order('name', { ascending: true });
                    break;
                default:
                    query = query.order('stock_quantity', { ascending: false });
            }

            const { data, error: queryError, count } = await query.range(start, start + itemsPerPage - 1);

            if (queryError) {
                setError('No pudimos cargar los productos. Verifica tu conexión.');
                return;
            }

            if (data) {
                setProducts(data);
                setTotalProducts(count || data.length);
                const total = count || data.length;
                const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
                const nextPage = Math.min(clamped, totalPages);
                setPage(nextPage);
                setHasMore(nextPage < totalPages);
                const params = new URLSearchParams();
                if (debouncedSearch) params.set('search', debouncedSearch);
                if (selectedCategories.length === 1) params.set('category', selectedCategories[0]);
                if (sortBy !== 'popular') params.set('sort', sortBy);
                if (showOnlyOnSale) params.set('onSale', 'true');
                if (nextPage > 1) params.set('page', String(nextPage));
                const query = params.toString();
                router.replace(query ? `/catalog?${query}` : '/catalog', { scroll: false });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } finally {
            setLoading(false);
        }
    }, [page, itemsPerPage, debouncedSearch, selectedCategories, showOnlyInStock, showOnlyOnSale, sortBy, supabase, router]);

    // Handlers
    const handleCategoryChange = useCallback((categoryId: string) => {
        setSelectedCategories(prev => {
            if (categoryId === 'all') return [];
            return prev.includes(categoryId)
                ? prev.filter(c => c !== categoryId)
                : [...prev, categoryId];
        });
        const category = categories.find(c => c.id === categoryId);
        logCategoryFilter(categoryId, category?.name);
    }, [categories, logCategoryFilter]);

    const handleSortChange = useCallback((sort: SortMode) => {
        setSortBy(sort);
        logSortChanged(sort);
    }, [logSortChanged]);

    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        logViewModeChanged(mode);
    }, [logViewModeChanged]);

    const handleAdvancedFiltersChange = useCallback((filters: AdvancedFilters) => {
        setAdvancedFilters(filters);
        setSelectedCategories(filters.categories);
        setShowOnlyInStock(filters.inStock);
        setShowOnlyOnSale(filters.onSale);
        logFilterApplied('advanced', filters);
    }, [logFilterApplied]);

    const handleClearFilters = useCallback(() => {
        setSearchQuery('');
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
    }, [maxPrice]);

    const handleQuickView = useCallback((product: Product) => {
        setSelectedProduct(product);
        logProductView(product.id, product.name);
    }, [logProductView]);

    const handleAddToCart = useCallback((product: Product, quantity: number = 1) => {
        addToCart(product, quantity);
        logAddToCart(product.id, quantity, product.name, product.sale_price);
    }, [addToCart, logAddToCart]);

    const handleRemoveFromCart = useCallback((productId: string) => {
        removeFromCart(productId);
        logRemoveFromCart(productId);
    }, [removeFromCart, logRemoveFromCart]);

    const handleToggleFavorite = useCallback((productId: string) => {
        toggleFavorite(productId);
    }, [toggleFavorite]);

    const handleCheckout = useCallback(() => {
        setShowCheckout(true);
        logCheckoutStart(cartTotal, cartItemsCount);
    }, [cartTotal, cartItemsCount, logCheckoutStart]);

    const handleOrderSuccess = useCallback((orderData: any) => {
        setShowCheckout(false);
        setShowOrderConfirmation(true);
        setOrderConfirmationData(orderData);
        logOrderCreated(orderData.orderId, orderData.customerEmail, orderData.total, cart.length);
        logCheckoutComplete(orderData.orderId, orderData.total, orderData.paymentMethod);
        clearCart();
    }, [clearCart, cart.length, logOrderCreated, logCheckoutComplete]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Navigation */}
            <NavBar
                config={config}
                activeSection="explorar"
                onNavigate={(section) => router.push(`/home#${section}`)}
            />

            {/* Header con Carrito */}
            <header className="sticky top-16 z-40 border-b border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-4 h-16">
                        {/* Logo/Title */}
                        <div className="flex items-center gap-3 group">
                            <div className="p-2.5 bg-gradient-to-br from-violet-500/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-600/20 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                                <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                    Catálogo
                                </h1>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider hidden sm:block">
                                    {config.businessName}
                                </p>
                            </div>
                        </div>

                        {/* Cart Button */}
                        <Button
                            size="sm"
                            className="relative h-10 pl-4 pr-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:-translate-y-0.5"
                            onClick={() => setShowCheckout(true)}
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline font-medium">Mi Carrito</span>
                            {cartItemsCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-200">
                                    {cartItemsCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Breadcrumbs */}
                <Breadcrumbs
                    items={[
                        { label: 'Inicio', href: '/home' },
                        { label: 'Catálogo', href: '/catalog' },
                        ...(selectedCategories.length === 1
                            ? [{
                                label: categories.find(c => c.id === selectedCategories[0])?.name || 'Categoría',
                                href: `/catalog?category=${selectedCategories[0]}`
                            }]
                            : []
                        )
                    ]}
                    className="mb-6"
                />

                {/* Filters */}
                <CatalogFilters
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
                    onSearchChange={setSearchQuery}
                    onCategoryChange={handleCategoryChange}
                    onSortChange={handleSortChange}
                    onViewModeChange={handleViewModeChange}
                    onAdvancedFiltersChange={handleAdvancedFiltersChange}
                    onClearFilters={handleClearFilters}
                    onToggleInStock={() => setShowOnlyInStock(!showOnlyInStock)}
                    onToggleOnSale={() => setShowOnlyOnSale(!showOnlyOnSale)}
                    config={config}
                />

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive" className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span>{error}</span>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reintentar
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Loading Overlay */}
                {loading && products.length > 0 && (
                    <div className="flex justify-center py-8">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 backdrop-blur-sm">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Actualizando productos...</span>
                        </div>
                    </div>
                )}

                {/* Product Grid */}
                <div className="mt-6">
                    <ProductGrid
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
                        totalPages={Math.max(1, Math.ceil(totalProducts / itemsPerPage))}
                        totalItems={totalProducts}
                        itemsPerPage={itemsPerPage}
                        onPageChange={(p) => goToPage(p)}
                        onItemsPerPageChange={(n) => { setItemsPerPage(n); goToPage(1); }}
                        className="pt-8"
                        showItemsPerPage
                        showInfo
                        maxVisiblePages={7}
                    />
                </div>
            </main>

            {/* Cart Sidebar eliminado: usamos Checkout directo */}

            {/* Quick View Modal */}
            <QuickViewModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAddToCart={handleAddToCart}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
                config={config}
            />

            {/* Checkout Modal */}
            <Suspense fallback={null}>
                {showCheckout && (
                    <CheckoutModal
                        isOpen={showCheckout}
                        onClose={() => setShowCheckout(false)}
                        cartItems={cart.map(item => ({
                            id: item.product.id,
                            name: item.product.name,
                            price: item.product.sale_price,
                            quantity: item.quantity,
                            image: item.product.image_url || undefined,
                        }))}
                        cartTotal={cartTotal}
                        onOrderSuccess={handleOrderSuccess}
                    />
                )}
            </Suspense>

            {/* Order Confirmation Modal */}
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
