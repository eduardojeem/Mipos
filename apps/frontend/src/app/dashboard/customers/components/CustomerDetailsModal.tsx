import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    Mail,
    Phone,
    MapPin,
    User,
    CreditCard,
    ShoppingCart,
    TrendingUp,
    Sparkles,
    Building2,
    Gift,
    Clock,
    DollarSign,
    Package,
    Receipt,
    Loader2,
    Printer
} from 'lucide-react';
import type { UICustomer } from '@/types/customer-page';
import type { PurchaseHistoryItem } from '@/lib/customer-service';
import { customerService } from '@/lib/customer-service';
import { ReceiptModal } from '@/components/pos/ReceiptModal';

interface CustomerDetailsModalProps {
    customer: UICustomer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsModal({ customer, open, onOpenChange }: CustomerDetailsModalProps) {
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState<any>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const handlePrintReceipt = (order: PurchaseHistoryItem) => {
        // Convert order to sale format for ReceiptModal
        const saleData = {
            id: order.orderNumber.replace('#', ''),
            totalAmount: order.total,
            createdAt: order.date,
            paymentMethod: 'CASH',
            items: order.products?.map(p => ({
                productName: p.name,
                quantity: p.quantity,
                unitPrice: p.price,
            })) || [],
            subtotal: order.total,
            taxAmount: 0,
            discountAmount: 0,
        };
        setSelectedSale(saleData);
        setShowReceiptModal(true);
    };

    // Fetch purchase history when modal opens
    useEffect(() => {
        if (open && customer?.id) {
            setLoadingHistory(true);
            customerService.getPurchaseHistory(customer.id, 5).then(result => {
                if (result.data) {
                    setPurchaseHistory(result.data);
                }
                setLoadingHistory(false);
            });
        }
    }, [open, customer?.id]);

    if (!customer) return null;

    const getCustomerTypeConfig = (type: string) => {
        switch (type) {
            case 'vip':
                return {
                    label: 'VIP',
                    color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                    icon: <Sparkles className="h-3 w-3" />,
                    ringColor: 'ring-purple-500'
                };
            case 'wholesale':
                return {
                    label: 'Mayorista',
                    color: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
                    icon: <Building2 className="h-3 w-3" />,
                    ringColor: 'ring-blue-500'
                };
            default:
                return {
                    label: 'Regular',
                    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
                    icon: null,
                    ringColor: 'ring-gray-400'
                };
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const typeConfig = getCustomerTypeConfig(customer.customerType);

    // Calcular promedios (simulados para el ejemplo, idealmente vendrían del backend)
    const averageOrderValue = customer.totalOrders > 0
        ? customer.totalSpent / customer.totalOrders
        : 0;

    // Progreso de fidelidad (basado en gastos, simulado)
    const loyaltyProgress = Math.min((customer.totalSpent / 10000) * 100, 100);

    // Días desde última compra
    const daysSinceLastPurchase = customer.lastPurchase
        ? Math.floor((new Date().getTime() - new Date(customer.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header with Avatar */}
                <DialogHeader className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="relative">
                            <Avatar className={`h-20 w-20 ring-4 ${typeConfig.ringColor} ring-offset-2 ring-offset-background`}>
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                                    {getInitials(customer.name)}
                                </AvatarFallback>
                            </Avatar>
                            {customer.customerType === 'vip' && (
                                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                                    <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-500 animate-pulse" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Información detallada del cliente incluyendo estadísticas de compra, contacto y datos personales
                            </DialogDescription>
                            {customer.customerCode && (
                                <p className="text-sm text-muted-foreground font-mono">{customer.customerCode}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                                <Badge className={`${typeConfig.color} flex items-center gap-1`}>
                                    {typeConfig.icon}
                                    {typeConfig.label}
                                </Badge>
                                <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                                    {customer.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Main Statistics Cards */}
                    <section>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                            <TrendingUp className="h-4 w-4" />
                            Resumen de Actividad
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Total Spent */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-5 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Total Gastado</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                    {formatCurrency(customer.totalSpent)}
                                </p>
                            </div>

                            {/* Total Orders */}
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Total Órdenes</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                    {customer.totalOrders}
                                </p>
                            </div>

                            {/* Average Order Value */}
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-5 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <CreditCard className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Promedio por Orden</p>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                    {formatCurrency(averageOrderValue)}
                                </p>
                            </div>

                            {/* Last Purchase */}
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 p-5 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                                    <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Última Compra</p>
                                {customer.lastPurchase ? (
                                    <>
                                        <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                                            {new Date(customer.lastPurchase).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        {daysSinceLastPurchase !== null && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Hace {daysSinceLastPurchase} días
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-lg font-semibold text-muted-foreground">Sin compras</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Loyalty Progress */}
                    {customer.totalOrders > 0 && (
                        <section className="bg-muted/30 p-5 rounded-xl border">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold">Nivel de Fidelidad</h3>
                                </div>
                                <Badge variant="outline" className="font-mono">
                                    {Math.round(loyaltyProgress)}%
                                </Badge>
                            </div>
                            <Progress value={loyaltyProgress} className="h-3 mb-2" />
                            <p className="text-xs text-muted-foreground">
                                {loyaltyProgress < 100
                                    ? `Faltan ${formatCurrency(10000 - customer.totalSpent)} para alcanzar el siguiente nivel`
                                    : '¡Cliente VIP! Has alcanzado el nivel máximo'}
                            </p>
                        </section>
                    )}

                    {/* Purchase History */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                <Receipt className="h-4 w-4" />
                                Historial de Compras
                            </h3>
                            {purchaseHistory.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    Últimas {purchaseHistory.length} órdenes
                                </span>
                            )}
                        </div>

                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : purchaseHistory.length > 0 ? (
                            <div className="space-y-3">
                                {purchaseHistory.map((order) => (
                                    <div
                                        key={order.orderNumber}
                                        className="p-4 bg-muted/50 rounded-lg border hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-mono text-sm font-semibold">
                                                    {order.orderNumber}
                                                </span>
                                            </div>
                                            <Badge
                                                variant={
                                                    order.status === 'completed' ? 'default' :
                                                        order.status === 'pending' ? 'secondary' :
                                                            'destructive'
                                                }
                                                className="text-xs"
                                            >
                                                {order.status === 'completed' ? 'Completada' :
                                                    order.status === 'pending' ? 'Pendiente' :
                                                        'Cancelada'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Fecha</p>
                                                <p className="font-medium">
                                                    {new Date(order.date).toLocaleDateString('es-ES', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Total</p>
                                                <p className="font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(order.total)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Artículos</p>
                                                <p className="font-medium">{order.items} items</p>
                                            </div>
                                        </div>

                                        {order.products && order.products.length > 0 && (
                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-xs text-muted-foreground mb-2">Productos:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {order.products.slice(0, 3).map((product, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {product.quantity}x {product.name}
                                                        </Badge>
                                                    ))}
                                                    {order.products.length > 3 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{order.products.length - 3} más
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Print Button */}
                                        <div className="mt-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePrintReceipt(order)}
                                                className="w-full"
                                            >
                                                <Printer className="h-4 w-4 mr-2" />
                                                Imprimir Comprobante
                                            </Button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                                <p className="text-sm text-muted-foreground">No hay historial de compras</p>
                            </div>
                        )}
                    </section>

                    <Separator />

                    {/* Contact Information */}
                    <section>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                            <User className="h-4 w-4" />
                            Información de Contacto
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customer.email && (
                                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                                    <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                                        <p className="text-sm font-medium truncate">{customer.email}</p>
                                    </div>
                                </div>
                            )}
                            {customer.phone && (
                                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                                    <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                                        <p className="text-sm font-medium">{customer.phone}</p>
                                    </div>
                                </div>
                            )}
                            {customer.address && (
                                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border md:col-span-2">
                                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">Dirección</p>
                                        <p className="text-sm font-medium">{customer.address}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Additional Info */}
                    {(customer.birthDate || customer.notes || customer.tax_id) && (
                        <>
                            <Separator />
                            <section>
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                    Información Adicional
                                </h3>
                                <div className="space-y-3">
                                    {customer.birthDate && (
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <span className="text-xs text-muted-foreground">Fecha de Nacimiento: </span>
                                                <span className="text-sm font-medium">
                                                    {new Date(customer.birthDate).toLocaleDateString('es-ES')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {customer.tax_id && (
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <span className="text-xs text-muted-foreground">NIF/CIF: </span>
                                                <span className="text-sm font-medium">{customer.tax_id}</span>
                                            </div>
                                        </div>
                                    )}
                                    {customer.notes && (
                                        <div className="p-3 bg-muted/30 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-2">Notas</p>
                                            <p className="text-sm">{customer.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    {/* Metadata */}
                    <Separator />
                    <section className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>Registrado el {new Date(customer.created_at).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Última actualización el {new Date(customer.updated_at).toLocaleDateString('es-ES')}</span>
                        </div>
                    </section>
                </div>
            </DialogContent>

            {/* Receipt Modal */}
            {showReceiptModal && selectedSale && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => setShowReceiptModal(false)}
                    saleData={selectedSale}
                    onPrint={() => window.print()}
                    onDownload={() => { }}
                />
            )}
        </Dialog>
    );
}
