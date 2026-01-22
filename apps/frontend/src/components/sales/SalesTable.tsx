import { memo, useCallback, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Eye, ArrowUpDown, ChevronLeft, ChevronRight,
    CreditCard, Banknote, Smartphone, Wallet,
    CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { Sale } from '@/types';
import { cn } from '@/lib/utils';

interface SalesTableProps {
    sales: Sale[];
    onViewSale: (sale: Sale) => void;
    sortBy?: 'date' | 'total' | 'customer';
    sortOrder?: 'asc' | 'desc';
    onSort?: (sortBy: 'date' | 'total' | 'customer') => void;
    page?: number;
    limit?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    className?: string;
}

// Memoized row component for better performance
const SaleRow = memo(function SaleRow({
    sale,
    onView,
    fmtCurrency
}: {
    sale: Sale;
    onView: (sale: Sale) => void;
    fmtCurrency: (value: number) => string;
}) {
    const statusConfig = {
        COMPLETED: {
            label: 'Completada',
            icon: CheckCircle2,
            className: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
        },
        PENDING: {
            label: 'Pendiente',
            icon: Clock,
            className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
        },
        CANCELLED: {
            label: 'Cancelada',
            icon: XCircle,
            className: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        },
        REFUNDED: {
            label: 'Reembolsada',
            icon: AlertCircle,
            className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
        },
    };

    const paymentIcons = {
        CASH: Banknote,
        CARD: CreditCard,
        TRANSFER: Smartphone,
        OTHER: Wallet,
    };

    const status = statusConfig[sale.status] || statusConfig.COMPLETED;
    const StatusIcon = status.icon;
    const PaymentIcon = paymentIcons[sale.payment_method as keyof typeof paymentIcons] || Wallet;
    const items = Array.isArray(sale.items)
        ? sale.items
        : Array.isArray((sale as any).sale_items)
            ? (sale as any).sale_items
            : [];

    return (
        <TableRow
            className="hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onView(sale)}
        >
            {/* Date */}
            <TableCell className="font-medium">
                <div className="flex flex-col">
                    <span className="text-sm">{formatDate(sale.created_at)}</span>
                    <span className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
            </TableCell>

            {/* ID */}
            <TableCell>
                <span className="text-sm text-muted-foreground font-mono">
                    #{sale.id.slice(-8)}
                </span>
            </TableCell>

            {/* Customer */}
            <TableCell>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">
                        {sale.customer?.name || (sale as any).customer_name || 'Cliente Anónimo'}
                    </span>
                    {(sale.customer?.email || (sale as any).customer_email) && (
                        <span className="text-xs text-muted-foreground">
                            {sale.customer?.email || (sale as any).customer_email}
                        </span>
                    )}
                </div>
            </TableCell>

            {/* Items */}
            <TableCell className="text-center">
                <Badge variant="outline" className="font-mono">
                    {items.length}
                </Badge>
            </TableCell>

            <TableCell>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">
                        {(items?.[0]?.product?.name) || (items?.[0]?.product?.id) || (items?.[0]?.product_id) || '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        SKU: {(items?.[0]?.product?.sku) || (items?.[0]?.product?.id) || (items?.[0]?.product_id) || 'N/A'}
                    </span>
                </div>
            </TableCell>

            {/* Total */}
            <TableCell className="font-semibold text-right">
                {fmtCurrency(sale.total_amount)}
            </TableCell>

            {/* Subtotal */}
            <TableCell className="text-right">
                {fmtCurrency(
                    Number(sale.total_amount || 0) - Number(sale.tax_amount || 0) + Number(sale.discount_amount || 0)
                )}
            </TableCell>

            {/* IVA */}
            <TableCell className="text-right">
                {fmtCurrency(Number(sale.tax_amount || 0))}
            </TableCell>

            {/* Payment Method */}
            <TableCell>
                <div className="flex items-center gap-2">
                    <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                        {sale.payment_method === 'CASH' && 'Efectivo'}
                        {sale.payment_method === 'CARD' && 'Tarjeta'}
                        {sale.payment_method === 'TRANSFER' && 'Transferencia'}
                        {sale.payment_method === 'OTHER' && 'Otro'}
                    </span>
                </div>
            </TableCell>

            {/* Status */}
            <TableCell>
                <Badge className={cn('flex items-center gap-1 w-fit', status.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                </Badge>
            </TableCell>

            {/* Actions */}
            <TableCell>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onView(sale);
                    }}
                    aria-label={`Ver detalles de venta ${sale.id}`}
                >
                    <Eye className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
});

export const SalesTable = memo(function SalesTable({
    sales,
    onViewSale,
    sortBy = 'date',
    sortOrder = 'desc',
    onSort,
    page = 1,
    limit = 10,
    totalPages = 1,
    onPageChange,
    className,
}: SalesTableProps) {
    const fmtCurrency = useCurrencyFormatter();

    const handleSort = useCallback((column: 'date' | 'total' | 'customer') => {
        onSort?.(column);
    }, [onSort]);

    const SortButton = ({ column, children }: { column: 'date' | 'total' | 'customer'; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort(column)}
            className={cn(
                'h-8 font-semibold',
                sortBy === column && 'text-primary'
            )}
            aria-label={`Ordenar por ${children}`}
        >
            {children}
            <ArrowUpDown className={cn(
                'ml-2 h-4 w-4',
                sortBy === column && sortOrder === 'asc' && 'rotate-180',
                sortBy === column && 'text-primary'
            )} />
        </Button>
    );

    // Pagination controls
    const canGoPrevious = page > 1;
    const canGoNext = page < totalPages;

    const handlePreviousPage = useCallback(() => {
        if (canGoPrevious) {
            onPageChange?.(page - 1);
        }
    }, [canGoPrevious, page, onPageChange]);

    const handleNextPage = useCallback(() => {
        if (canGoNext) {
            onPageChange?.(page + 1);
        }
    }, [canGoNext, page, onPageChange]);

    // Empty state
    if (!sales || sales.length === 0) {
        return (
            <Card className={className}>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No hay ventas</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                        No se encontraron ventas con los filtros aplicados. Intenta ajustar los criterios de búsqueda.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-lg">
                    Ventas ({sales.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <SortButton column="date">Fecha</SortButton>
                                </TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>
                                    <SortButton column="customer">Cliente</SortButton>
                                </TableHead>
                                <TableHead className="text-center">Items</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">
                                    <SortButton column="total">Total</SortButton>
                                </TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="text-right">IVA</TableHead>
                                <TableHead>Pago</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.map((sale) => (
                                <SaleRow
                                    key={sale.id}
                                    sale={sale}
                                    onView={onViewSale}
                                    fmtCurrency={fmtCurrency}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                            Página {page} de {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousPage}
                                disabled={!canGoPrevious}
                                aria-label="Página anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={!canGoNext}
                                aria-label="Página siguiente"
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
