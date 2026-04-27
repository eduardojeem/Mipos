'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Search,
    RefreshCw,
    Package,
    ArrowUp
} from 'lucide-react';
import ProductCard from './ProductCard';
import type { Product } from '@/types';

interface ProductGridProps {
    products: Product[];
    viewMode: 'grid' | 'list' | 'compact';
    favorites: string[];
    loading?: boolean;
    loadingMore?: boolean;
    hasMore?: boolean;
    onToggleFavorite: (productId: string) => void;
    onQuickView: (product: Product) => void;
    onAddToCart: (product: Product) => void;
    onLoadMore?: () => void;
    onClearFilters?: () => void;
    config: any;
    allowAddToCart?: boolean;
}

export default function ProductGrid({
    products,
    viewMode,
    favorites,
    loading = false,
    loadingMore = false,
    hasMore = false,
    onToggleFavorite,
    onQuickView,
    onAddToCart,
    onLoadMore,
    onClearFilters,
    config,
    allowAddToCart = true,
}: ProductGridProps) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Infinite scroll with Intersection Observer
    useEffect(() => {
        if (!sentinelRef.current || !hasMore || loadingMore || !onLoadMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { rootMargin: '400px', threshold: 0 }
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [hasMore, loadingMore, onLoadMore]);

    // Scroll to top function
    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Grid class based on view mode
    const gridClassName = useMemo(() => {
        switch (viewMode) {
            case 'list':
                return 'grid-cols-1 gap-4';
            case 'compact':
                return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
            default:
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
        }
    }, [viewMode]);

    // Skeleton count based on view mode
    const skeletonCount = viewMode === 'compact' ? 12 : viewMode === 'list' ? 4 : 8;

    // Check if should show back to top
    const showBackToTop = products.length > 12;

    const [backToTopVisible, setBackToTopVisible] = useState(false);
    useEffect(() => {
        const handler = () => {
            setBackToTopVisible(window.scrollY > 600);
        };
        handler();
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            {/* Loading State */}
            {loading && products.length === 0 && (
                <div className={`grid ${gridClassName}`}>
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                        <Card key={i} className="overflow-hidden border-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl sm:rounded-3xl">
                            <div className={`w-full ${viewMode === 'list' ? 'h-32' : viewMode === 'compact' ? 'aspect-square' : 'aspect-[4/3]'} bg-slate-200 dark:bg-slate-800 animate-pulse relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                            </div>
                            <CardContent className="p-4 space-y-4">
                                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 animate-pulse" />
                                <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded-lg w-full animate-pulse" />
                                <div className="flex justify-between items-center pt-2">
                                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-24 animate-pulse" />
                                    <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-xl w-32 animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm rounded-[32px] border border-slate-200/50 dark:border-white/5">
                    <div className="relative mb-8">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center animate-glow-pulse">
                            <Package className="w-16 h-16 text-primary opacity-50" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center">
                            <Search className="w-6 h-6 text-primary" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        No encontramos productos
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 font-medium">
                        No hay productos que coincidan con tus criterios de búsqueda.
                        Intenta ajustar los filtros o explorar otras categorías.
                    </p>

                    {onClearFilters && (
                        <Button
                            onClick={onClearFilters}
                            variant="default"
                            size="lg"
                            className="gap-2 rounded-2xl bg-primary text-white shadow-xl shadow-primary/25 border-0 hover:scale-105 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Limpiar filtros
                        </Button>
                    )}
                </div>
            )}

            {/* Product Grid */}
            {!loading && products.length > 0 && (
                <>
                    <div className={`grid ${gridClassName}`}>
                        {products.map((product, index) => (
                            <div
                                key={product.id}
                                className="animate-slide-up"
                                style={{
                                    animationDelay: `${Math.min(index * 40, 400)}ms`,
                                    animationFillMode: 'both'
                                }}
                            >
                                <ProductCard
                                    product={product}
                                    viewMode={viewMode}
                                    isFavorite={favorites.includes(product.id)}
                                    onToggleFavorite={onToggleFavorite}
                                    onQuickView={onQuickView}
                                    onAddToCart={onAddToCart}
                                    config={config}
                                    priority={index < 4}
                                    allowAddToCart={allowAddToCart}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Loading More Indicator */}
                    {loadingMore && (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 shadow-xl">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                    Cargando más...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Infinite Scroll Sentinel */}
                    {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}

                    {/* End of Results (solo para infinito) */}
                    {!hasMore && onLoadMore && products.length > 0 && (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 transition-all hover:scale-110">
                                <Package className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mb-6 px-6 py-2 bg-slate-100/50 dark:bg-white/5 rounded-full">
                                Has visto todos los {products.length} productos
                            </p>
                            {showBackToTop && (
                                <Button variant="outline" size="sm" onClick={scrollToTop} className="gap-2 rounded-xl dark:border-white/10 dark:hover:bg-white/5">
                                    <ArrowUp className="w-4 h-4" />
                                    Volver arriba
                                </Button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Floating Back to Top Button */}
            {showBackToTop && (
                <Button
                    variant="secondary"
                    size="icon"
                    className={`fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 hover:scale-110 hover:bg-white dark:hover:bg-slate-900 ${backToTopVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                    onClick={scrollToTop}
                    id="back-to-top"
                >
                    <ArrowUp className="w-5 h-5 text-primary" />
                </Button>
            )}


        </div>
    );
}
