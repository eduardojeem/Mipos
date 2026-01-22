'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid, FixedSizeList } from 'react-window';
import type { Product } from '@/types';
import { POSProductCard } from './POSProductCard';
import { POSProductListItem } from './POSProductListItem';
import { ProductDetailModal } from '@/components/catalog/ProductDetailModal';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface POSProductsViewportProps {
    products: Product[];
    viewMode: 'grid' | 'list';
    onAddToCart?: (product: Product) => void;
    isWholesaleMode?: boolean;
    quickAddMode?: boolean;
    highlightProductId?: string;
    isMobile?: boolean;
    loading?: boolean;
    gridColumns?: number;
    controls?: {
        mode: 'infinite' | 'pagination';
        pageSize: number;
        batchSize: number;
        page: number;
        onModeChange: (m: 'infinite' | 'pagination') => void;
        onPageSizeChange: (n: number) => void;
        onBatchSizeChange: (n: number) => void;
        onPageChange: (p: number) => void;
    };
}

export const POSProductsViewport = memo(({
    products,
    viewMode,
    onAddToCart,
    isWholesaleMode,
    quickAddMode,
    highlightProductId,
    isMobile = false,
    loading = false,
    gridColumns,
    controls
}: POSProductsViewportProps) => {
    // Configuración de grid optimizada (memoizada)
    const getGridConfig = useCallback((width: number) => {
        const gap = 15;
        let columns = gridColumns || 1; // Use provided gridColumns or default to 1
        let cardHeight = 270;

        // Breakpoints optimizados (only if gridColumns not provided)
        if (!gridColumns) {
            if (width >= 1024) {
                columns = 4; // Desktop
            } else if (width >= 768) {
                columns = 3; // Tablet
            } else {
                columns = 2; // Mobile
            }
        }

        const cardWidth = Math.floor((width - gap * (columns - 1)) / columns);

        return { columns, cardWidth, cardHeight, gap };
    }, [gridColumns]);

    const [mode, setMode] = useState<'infinite' | 'pagination'>('infinite');
    const [pageSize, setPageSize] = useState(10);
    const [batchSize, setBatchSize] = useState(12);
    const [page, setPage] = useState(1);
    const [visibleCount, setVisibleCount] = useState(24);
    const modeControlled = controls?.mode ?? mode;
    const pageSizeControlled = controls?.pageSize ?? pageSize;
    const batchSizeControlled = controls?.batchSize ?? batchSize;
    const pageControlled = controls?.page ?? page;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(products.length / pageSizeControlled)), [products.length, pageSizeControlled]);
    const paginatedProducts = useMemo(() => {
        const start = (pageControlled - 1) * pageSizeControlled;
        return products.slice(start, start + pageSizeControlled);
    }, [products, pageControlled, pageSizeControlled]);
    const visibleProducts = useMemo(() => modeControlled === 'infinite' ? products.slice(0, visibleCount) : paginatedProducts, [modeControlled, products, visibleCount, paginatedProducts]);
    const hasMore = modeControlled === 'infinite' && visibleCount < products.length;
    const isLoadingMoreRef = useRef(false);

    const loadMore = useCallback(() => {
        if (!hasMore || isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;
        setTimeout(() => {
            setVisibleCount(v => Math.min(v + batchSizeControlled, products.length));
            isLoadingMoreRef.current = false;
        }, 150);
    }, [hasMore, products.length, batchSizeControlled]);

    // Modal details
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setDetailProduct(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [detailProduct]);

    useEffect(() => {
        if (!detailProduct) return;
        const latest = products.find(p => p.id === detailProduct.id);
        if (!latest) return;
        const changed = (
            latest.stock_quantity !== detailProduct.stock_quantity ||
            latest.sale_price !== detailProduct.sale_price ||
            latest.wholesale_price !== detailProduct.wholesale_price ||
            latest.name !== detailProduct.name ||
            latest.image_url !== detailProduct.image_url ||
            latest.description !== detailProduct.description
        );
        if (changed) setDetailProduct(latest);
    }, [products, detailProduct]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <>
            {!controls && (
                <div className="flex items-center gap-3 mb-2">
                    <label className="text-sm">Modo</label>
                    <select className="border rounded px-2 py-1 text-sm" value={mode} onChange={(e) => { setMode(e.target.value as any); if (e.target.value === 'pagination') setPage(1); }} aria-label="Modo de carga">
                        <option value="infinite">Scroll infinito</option>
                        <option value="pagination">Paginación</option>
                    </select>
                    <label className="text-sm">Tamaño de página</label>
                    <select className="border rounded px-2 py-1 text-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Tamaño de página">
                        <option value={10}>10</option>
                        <option value={12}>12</option>
                        <option value={20}>20</option>
                        <option value={24}>24</option>
                    </select>
                    <label className="text-sm">Lote</label>
                    <select className="border rounded px-2 py-1 text-sm" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} aria-label="Tamaño de lote">
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={36}>36</option>
                    </select>
                </div>
            )}
            <AutoSizer>
                {({ width, height }) => {
                    if (viewMode === 'list') {
                        const itemHeight = 100; // Altura optimizada para lista horizontal
                        return (
                            <FixedSizeList
                                height={height}
                                width={width}
                                itemCount={visibleProducts.length}
                                itemSize={itemHeight}
                                overscanCount={3}
                                itemKey={(index) => visibleProducts[index]?.id ?? index}
                                onItemsRendered={({ visibleStopIndex }) => {
                                    if (modeControlled !== 'infinite') return;
                                    const thresholdIndex = visibleProducts.length - 2;
                                    if (visibleStopIndex >= thresholdIndex) loadMore();
                                }}
                            >
                                {({ index, style }) => {
                                    const product = visibleProducts[index];
                                    return (
                                        <div style={{ ...style, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 }}>
                                            <POSProductListItem
                                                product={product}
                                                onViewDetails={setDetailProduct}
                                                onAddToCart={onAddToCart}
                                                isWholesaleMode={isWholesaleMode}
                                                quickAddMode={quickAddMode}
                                                highlightProductId={highlightProductId}
                                            />
                                        </div>
                                    );
                                }}
                            </FixedSizeList>
                        );
                    }

                    // Grid view optimizado
                    const config = getGridConfig(width);
                    const rows = Math.ceil(visibleProducts.length / config.columns);

                    return (
                        <FixedSizeGrid
                            height={height}
                            width={width}
                            columnCount={config.columns}
                            columnWidth={config.cardWidth}
                            rowCount={rows}
                            rowHeight={config.cardHeight + config.gap}
                            overscanRowCount={2}
                            overscanColumnCount={1}
                            style={{ overflowX: 'hidden' }}
                            itemKey={({ columnIndex, rowIndex }) => {
                                const index = rowIndex * config.columns + columnIndex;
                                return visibleProducts[index]?.id ?? `${rowIndex}-${columnIndex}`;
                            }}
                            onItemsRendered={({ visibleRowStopIndex }) => {
                                if (modeControlled !== 'infinite') return;
                                const thresholdRow = rows - 1;
                                if (visibleRowStopIndex >= thresholdRow) loadMore();
                            }}
                        >
                            {({ columnIndex, rowIndex, style }) => {
                                const index = rowIndex * config.columns + columnIndex;
                                if (index >= visibleProducts.length) return null;
                                const product = visibleProducts[index];
                                return (
                                    <div style={{ ...style, paddingRight: columnIndex < config.columns - 1 ? config.gap : 0, paddingBottom: 8 }} className="flex justify-center">
                                        <POSProductCard
                                            product={product}
                                            onViewDetails={setDetailProduct}
                                            onAddToCart={onAddToCart}
                                            isWholesaleMode={isWholesaleMode}
                                            quickAddMode={quickAddMode}
                                            highlightProductId={highlightProductId}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                );
                            }}
                        </FixedSizeGrid>
                    );
                }}
            </AutoSizer>
            {hasMore && (
                <div className="flex items-center justify-center py-3">
                    <div className="h-5 w-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" aria-label="Cargando más productos" />
                </div>
            )}
            {modeControlled === 'pagination' && (
                <div className="flex items-center justify-center gap-2 py-2">
                    <button className="px-2 py-1 border rounded text-sm" disabled={(controls ? controls.page : page) <= 1} onClick={() => (controls ? controls.onPageChange(Math.max(1, (controls.page - 1))) : setPage(p => Math.max(1, p - 1)))} aria-label="Página anterior">Anterior</button>
                    <span className="text-sm">{controls ? controls.page : page} / {totalPages}</span>
                    <button className="px-2 py-1 border rounded text-sm" disabled={(controls ? controls.page : page) >= totalPages} onClick={() => (controls ? controls.onPageChange(Math.min(totalPages, (controls.page + 1))) : setPage(p => Math.min(totalPages, p + 1)))} aria-label="Página siguiente">Siguiente</button>
                </div>
            )}
            <ProductDetailModal
                product={detailProduct as any}
                isOpen={!!detailProduct}
                onClose={() => setDetailProduct(null)}
                onAddToCart={(p) => { if (onAddToCart) onAddToCart(p as Product); }}
                className="shadow-2xl"
                showFeatures={false}
            />
        </>
    );
});

POSProductsViewport.displayName = 'POSProductsViewport';
