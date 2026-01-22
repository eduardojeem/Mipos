'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5';
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
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className={`w-full ${viewMode === 'list' ? 'h-32' : viewMode === 'compact' ? 'aspect-square' : 'aspect-[4/3]'}`} />
                            <CardContent className="p-4 space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-9 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="relative mb-8">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                            <Package className="w-16 h-16 text-muted-foreground/50" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Search className="w-6 h-6 text-muted-foreground" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-foreground mb-3">
                        No encontramos productos
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-8">
                        No hay productos que coincidan con tus criterios de búsqueda.
                        Intenta ajustar los filtros o explorar otras categorías.
                    </p>

                    {onClearFilters && (
                        <Button
                            onClick={onClearFilters}
                            variant="default"
                            size="lg"
                            className="gap-2"
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
                                className="animate-in fade-in-0 slide-in-from-bottom-4"
                                style={{
                                    animationDelay: `${Math.min(index * 30, 300)}ms`,
                                    animationDuration: '400ms',
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
                                />
                            </div>
                        ))}
                    </div>

                    {/* Loading More Indicator */}
                    {loadingMore && (
                        <div className="flex items-center justify-center py-8">
                            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 backdrop-blur-sm">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-medium text-muted-foreground">
                                    Cargando más productos...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Infinite Scroll Sentinel */}
                    {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}

                    {/* End of Results (solo para infinito) */}
                    {!hasMore && onLoadMore && products.length > 0 && (
                        <div className="flex flex-col items-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Package className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground mb-4">
                                Has visto todos los {products.length} productos
                            </p>
                            {showBackToTop && (
                                <Button variant="outline" size="sm" onClick={scrollToTop} className="gap-2">
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
                    className={`fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg transition-all ${backToTopVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={scrollToTop}
                    id="back-to-top"
                >
                    <ArrowUp className="w-5 h-5" />
                </Button>
            )}


        </div>
    );
}
