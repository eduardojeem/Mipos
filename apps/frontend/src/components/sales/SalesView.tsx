import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, List } from 'lucide-react';
import { SalesTable } from './SalesTable';
import { SalesCards } from './SalesCards';
import type { Sale } from '@/types';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'cards';

interface SalesViewProps {
    sales: Sale[];
    onViewSale: (sale: Sale) => void;
    sortBy?: 'date' | 'total' | 'customer';
    sortOrder?: 'asc' | 'desc';
    onSort?: (sortBy: 'date' | 'total' | 'customer') => void;
    page?: number;
    limit?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    defaultViewMode?: ViewMode;
    className?: string;
}

export const SalesView = memo(function SalesView({
    sales,
    onViewSale,
    sortBy,
    sortOrder,
    onSort,
    page,
    limit,
    totalPages,
    onPageChange,
    defaultViewMode = 'table',
    className,
}: SalesViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        // Try to load from localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sales:viewMode');
            if (saved === 'table' || saved === 'cards') {
                return saved;
            }
        }
        return defaultViewMode;
    });

    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('sales:viewMode', mode);
        }
    }, []);

    return (
        <div className={cn('space-y-4', className)}>
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    Ventas ({sales.length})
                </h2>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    <Button
                        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleViewModeChange('table')}
                        className="h-8 px-3"
                        aria-label="Vista de tabla"
                    >
                        <List className="h-4 w-4 mr-1" />
                        Tabla
                    </Button>
                    <Button
                        variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleViewModeChange('cards')}
                        className="h-8 px-3"
                        aria-label="Vista de tarjetas"
                    >
                        <Grid3X3 className="h-4 w-4 mr-1" />
                        Tarjetas
                    </Button>
                </div>
            </div>

            {/* Render appropriate view */}
            {viewMode === 'table' ? (
                <SalesTable
                    sales={sales}
                    onViewSale={onViewSale}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    page={page}
                    limit={limit}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            ) : (
                <SalesCards
                    sales={sales}
                    onViewSale={onViewSale}
                />
            )}
        </div>
    );
});
