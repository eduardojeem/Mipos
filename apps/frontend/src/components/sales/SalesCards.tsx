import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Eye, Calendar, User, Package, CreditCard,
    Banknote, Smartphone, Wallet,
    CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { Sale } from '@/types';
import { cn } from '@/lib/utils';

interface SalesCardsProps {
    sales: Sale[];
    onViewSale: (sale: Sale) => void;
    className?: string;
}

const SaleCard = memo(function SaleCard({
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

    const paymentConfig = {
        CASH: { label: 'Efectivo', icon: Banknote, color: 'text-green-600' },
        CARD: { label: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' },
        TRANSFER: { label: 'Transferencia', icon: Smartphone, color: 'text-purple-600' },
        OTHER: { label: 'Otro', icon: Wallet, color: 'text-gray-600' },
    };

    const status = statusConfig[sale.status] || statusConfig.COMPLETED;
    const payment = paymentConfig[sale.payment_method as keyof typeof paymentConfig] || paymentConfig.OTHER;

    const StatusIcon = status.icon;
    const PaymentIcon = payment.icon;

    return (
        <Card
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => onView(sale)}
        >
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {formatDate(sale.created_at)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {new Date(sale.created_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            ID: #{sale.id.slice(-8)}
                        </span>
                    </div>
                    <Badge className={cn('flex items-center gap-1', status.className)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                    </Badge>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {sale.customer?.name || 'Cliente Anónimo'}
                        </p>
                        {sale.customer?.email && (
                            <p className="text-xs text-muted-foreground truncate">
                                {sale.customer.email}
                            </p>
                        )}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Items */}
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Items</p>
                            <p className="text-sm font-semibold">
                                {Array.isArray(sale.items) ? sale.items.length : 0}
                            </p>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-center gap-2">
                        <PaymentIcon className={cn('h-4 w-4', payment.color)} />
                        <div>
                            <p className="text-xs text-muted-foreground">Pago</p>
                            <p className="text-sm font-semibold">{payment.label}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Producto</p>
                        <p className="text-sm font-semibold truncate">
                            {sale.items?.[0]?.product?.name || sale.items?.[0]?.product_id || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            SKU: {sale.items?.[0]?.product?.sku || sale.items?.[0]?.product_id || 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Total and Action */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Total</p>
                        <p className="text-lg font-bold text-primary">
                            {fmtCurrency(sale.total_amount)}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onView(sale);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Ver detalles de venta ${sale.id}`}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                    </Button>
                </div>

                {/* Discount indicator if applicable */}
                {sale.discount_amount && sale.discount_amount > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                            Descuento aplicado: <span className="font-semibold text-red-600">
                                {fmtCurrency(sale.discount_amount)}
                            </span>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

export const SalesCards = memo(function SalesCards({
    sales,
    onViewSale,
    className,
}: SalesCardsProps) {
    const fmtCurrency = useCurrencyFormatter();

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
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
            {sales.map((sale) => (
                <SaleCard
                    key={sale.id}
                    sale={sale}
                    onView={onViewSale}
                    fmtCurrency={fmtCurrency}
                />
            ))}
        </div>
    );
});
