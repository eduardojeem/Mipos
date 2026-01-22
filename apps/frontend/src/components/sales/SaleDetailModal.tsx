import { memo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Receipt,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    CreditCard,
    Package,
    Tag,
    FileText,
    Printer,
    Download,
    Copy,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Banknote,
    Smartphone,
    Wallet,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { Sale } from '@/types';
import { cn } from '@/lib/utils';

interface SaleDetailModalProps {
    sale: Sale | null;
    isOpen: boolean;
    onClose: () => void;
    onPrint?: (sale: Sale) => void;
    onDownload?: (sale: Sale) => void;
}

export const SaleDetailModal = memo(function SaleDetailModal({
    sale,
    isOpen,
    onClose,
    onPrint,
    onDownload,
}: SaleDetailModalProps) {
    const fmtCurrency = useCurrencyFormatter();

    if (!sale) return null;

    const statusConfig = {
        COMPLETED: {
            label: 'Completada',
            icon: CheckCircle2,
            className: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
        },
        PENDING: {
            label: 'Pendiente',
            icon: Clock,
            className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
        },
        CANCELLED: {
            label: 'Cancelada',
            icon: XCircle,
            className: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
        },
        REFUNDED: {
            label: 'Reembolsada',
            icon: AlertCircle,
            className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
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

    const items = Array.isArray(sale.items)
      ? sale.items
      : Array.isArray((sale as any).sale_items)
        ? (sale as any).sale_items
        : [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const discountAmount = Number(sale.discount_amount || 0);
    const taxAmount = Number(sale.tax_amount || 0);
    const baseForTax = Math.max(subtotal - discountAmount, 0);
    const taxPercent = baseForTax > 0 ? (taxAmount / baseForTax) * 100 : 0;
    const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

    const handleCopyId = () => {
        navigator.clipboard.writeText(sale.id);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Receipt className="h-6 w-6 text-primary" />
                        Detalles de Venta
                    </DialogTitle>
                    <DialogDescription>
                        Información completa de la transacción
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Info */}
                    <Card id="sale-details-header">
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">ID de Venta:</span>
                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                            #{sale.id.slice(-8)}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyId}
                                            className="h-6 w-6 p-0"
                                            aria-label="Copiar ID"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(sale.created_at)} •{' '}
                                        {new Date(sale.created_at).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                </div>
                                <Badge className={cn('flex items-center gap-1', status.className)}>
                                    <StatusIcon className="h-4 w-4" />
                                    {status.label}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <PaymentIcon className={cn('h-5 w-5', payment.color)} />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Método de Pago</p>
                                        <p className="font-semibold">{payment.label}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Items</p>
                                        <p className="font-semibold">{items.length}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Tag className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Tipo</p>
                                        <p className="font-semibold">{String(sale.sale_type || 'RETAIL')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                                    <Tag className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="font-bold text-primary">{fmtCurrency(sale.total_amount)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    {sale.customer && (
                        <Card id="sale-details-customer">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Información del Cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Nombre</p>
                                            <p className="font-medium">{sale.customer.name}</p>
                                        </div>
                                    </div>
                                    {sale.customer.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Email</p>
                                                <p className="font-medium">{sale.customer.email}</p>
                                            </div>
                                        </div>
                                    )}
                                    {sale.customer.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Teléfono</p>
                                                <p className="font-medium">{sale.customer.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {sale.customer.address && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Dirección</p>
                                                <p className="font-medium">{sale.customer.address}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Items */}
                    <Card id="sale-details-items">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Productos ({Array.isArray(items) ? items.length : 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left">SKU</th>
                                            <th className="px-4 py-2 text-left">Producto</th>
                                            <th className="px-4 py-2 text-right">Cant.</th>
                                            <th className="px-4 py-2 text-right">Precio</th>
                                            <th className="px-4 py-2 text-right">Desc.</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item: any, index: number) => {
                                            const sku = item.product?.sku || item.product_id || 'N/A';
                                            const qty = Number(item.quantity || 0);
                                            const unit = Number(item.unit_price || 0);
                                            const discount = Number(item.discount_amount || 0);
                                            const lineTotal = qty * unit - discount;
                                            return (
                                                <tr key={item.id || index} className="hover:bg-muted/50">
                                                    <td className="px-4 py-2 font-mono">{sku}</td>
                                                    <td className="px-4 py-2">{item.product?.name || 'Producto'}</td>
                                                    <td className="px-4 py-2 text-right">{qty}</td>
                                                    <td className="px-4 py-2 text-right">{fmtCurrency(unit)}</td>
                                                    <td className="px-4 py-2 text-right text-red-600">{discount > 0 ? `-${fmtCurrency(discount)}` : '—'}</td>
                                                    <td className="px-4 py-2 text-right font-medium">{fmtCurrency(lineTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <Separator className="my-4" />

                            <div id="sale-details-summary" className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{fmtCurrency(subtotal)}</span>
                                </div>
                                {sale.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Descuento ({discountPercent.toFixed(1)}%)</span>
                                        <span className="font-medium text-red-600">-{fmtCurrency(discountAmount)}</span>
                                    </div>
                                )}
                                {sale.tax_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">IVA ({taxPercent.toFixed(1)}%)</span>
                                        <span className="font-medium">{fmtCurrency(taxAmount)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-primary">{fmtCurrency(sale.total_amount)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Info */}
                    {(sale.notes || sale.coupon_code) && (
                        <Card id="sale-details-extra">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Información Adicional
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {sale.coupon_code && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Cupón Aplicado</p>
                                        <Badge variant="secondary" className="font-mono">
                                            {sale.coupon_code}
                                        </Badge>
                                    </div>
                                )}
                                {sale.notes && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Notas</p>
                                        <p className="text-sm bg-muted p-3 rounded-lg">{sale.notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div id="sale-details-actions" className="flex items-center justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Cerrar
                        </Button>
                        {onDownload && (
                            <Button variant="outline" onClick={() => onDownload(sale)}>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                            </Button>
                        )}
                        {onPrint && (
                            <Button onClick={() => onPrint(sale)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});
