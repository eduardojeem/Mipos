import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    CalendarDays,
    Trophy,
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
    Star,
    DollarSign,
    Package,
    Receipt,
    Scissors,
    ArrowUpRight,
    Loader2,
    Printer
} from 'lucide-react';
import type { UICustomer } from '@/types/customer-page';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { useCustomerDetail } from '@/hooks/useOptimizedCustomers';
import {
    buildInternalTicketMetadata,
    formatSaleReferenceNumber,
    type PosInternalTicket,
} from '@/lib/pos/internal-ticket';

interface CustomerDetailsModalProps {
    customer: UICustomer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type PurchaseHistoryItem = NonNullable<UICustomer['purchaseHistory']>[number];
type AppointmentHistoryItem = NonNullable<UICustomer['appointmentHistory']>[number];
export function CustomerDetailsModal({ customer: baseCustomer, open, onOpenChange }: CustomerDetailsModalProps) {
    const router = useRouter();
    const customerDetail = useCustomerDetail(baseCustomer?.id ?? '', {
        enabled: open && Boolean(baseCustomer?.id)
    });
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState<PosInternalTicket | null>(null);
    const formatCurrency = useCurrencyFormatter();
    const customer = customerDetail.data ?? baseCustomer;
    const purchaseHistory = customer?.purchaseHistory ?? [];
    const appointmentHistory = customer?.appointmentHistory ?? [];
    const loyalty = customer?.loyalty ?? null;
    const activitySummary = customer?.activitySummary ?? null;
    const loadingHistory = customerDetail.isLoading;

    const handlePrintReceipt = (order: PurchaseHistoryItem) => {
        // Convert order to sale format for ReceiptModal
        const saleId = order.orderNumber.replace('#', '');
        const metadata = buildInternalTicketMetadata(saleId);
        const saleData: PosInternalTicket = {
            id: saleId,
            saleNumber: formatSaleReferenceNumber(saleId),
            ...metadata,
            totalAmount: order.total,
            createdAt: order.date,
            paymentMethod: 'CASH',
            items: order.products?.map((p, index) => ({
                id: `${saleId}-${index}`,
                productId: '',
                productName: p.name,
                quantity: p.quantity,
                unitPrice: p.price,
                totalPrice: p.quantity * p.price,
                discountAmount: 0,
            })) || [],
            subtotal: order.total,
            taxAmount: 0,
            discountAmount: 0,
            status: 'COMPLETED',
            customer: customer ? {
                name: customer.name,
                phone: customer.phone || undefined,
                email: customer.email || undefined,
            } : null,
        };
        setSelectedSale(saleData);
        setShowReceiptModal(true);
    };

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

    // Días desde última compra
    const daysSinceLastPurchase = customer.lastPurchase
        ? Math.floor((new Date().getTime() - new Date(customer.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const getAppointmentStatusConfig = (status: AppointmentHistoryItem['status']) => {
        switch (status) {
            case 'CONFIRMED':
                return { label: 'Confirmado', variant: 'secondary' as const };
            case 'COMPLETED':
                return { label: 'Atendido', variant: 'default' as const };
            case 'CANCELLED':
                return { label: 'Cancelado', variant: 'destructive' as const };
            case 'NO_SHOW':
                return { label: 'No vino', variant: 'outline' as const };
            default:
                return { label: 'Reservado', variant: 'outline' as const };
        }
    };

    const getLoyaltyTxLabel = (type?: string) => {
        switch (type) {
            case 'EARNED':
                return 'Puntos ganados';
            case 'REDEEMED':
                return 'Puntos canjeados';
            case 'BONUS':
                return 'Bono';
            case 'ADJUSTMENT':
                return 'Ajuste';
            case 'EXPIRED':
                return 'Puntos expirados';
            default:
                return 'Sin movimientos';
        }
    };

    const handleCreateAppointment = () => {
        const params = new URLSearchParams();
        params.set('openNewAppointment', '1');
        params.set('customerId', customer.id);
        params.set('customerName', customer.name);
        if (customer.phone) params.set('customerPhone', customer.phone);
        if (customer.email) params.set('customerEmail', customer.email);
        onOpenChange(false);
        router.push(`/dashboard/agenda?${params.toString()}`);
    };

    const handleOpenLoyaltyHistory = () => {
        const params = new URLSearchParams();
        params.set('customerId', customer.id);
        params.set('customerName', customer.name);
        onOpenChange(false);
        router.push(`/dashboard/loyalty?${params.toString()}`);
    };

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
                                    <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-500" />
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
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" onClick={handleCreateAppointment}>
                                    <CalendarDays className="h-4 w-4 mr-2" />
                                    Nuevo turno
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleOpenLoyaltyHistory}>
                                    <Gift className="h-4 w-4 mr-2" />
                                    Ver puntos
                                </Button>
                                {activitySummary?.nextAppointment ? (
                                    <Badge variant="secondary" className="h-9 px-3 text-xs">
                                        <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                                        Próximo turno: {new Date(activitySummary.nextAppointment.date).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                        })}
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    <section>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                            <TrendingUp className="h-4 w-4" />
                            Resumen Combinado
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-5 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Valor Total del Cliente</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                    {formatCurrency(activitySummary?.totalCustomerValue ?? customer.totalSpent)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Compras + servicios cobrados
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Compras Registradas</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                    {customer.totalOrders}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Última compra {customer.lastPurchase
                                        ? new Date(customer.lastPurchase).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })
                                        : 'sin registrar'}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-5 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <Scissors className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                    <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Turnos Atendidos</p>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                    {activitySummary?.completedAppointments ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Facturación servicios: {formatCurrency(activitySummary?.totalServiceRevenue ?? 0)}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 p-5 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <Gift className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                    <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Puntos Actuales</p>
                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                                    {loyalty?.currentPoints ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {loyalty?.programName || 'Sin programa activo'}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 p-5 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <CalendarDays className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Próximo Turno</p>
                                {activitySummary?.nextAppointment ? (
                                    <>
                                        <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                                            {new Date(activitySummary.nextAppointment.date).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {activitySummary.nextAppointment.serviceName}
                                            {activitySummary.nextAppointment.staffName ? ` · ${activitySummary.nextAppointment.staffName}` : ''}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-lg font-semibold text-muted-foreground">Sin turno agendado</p>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950 p-5 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                                    <Scissors className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Último Turno / No-Show</p>
                                {activitySummary?.lastCompletedAppointment ? (
                                    <>
                                        <p className="text-lg font-semibold text-rose-700 dark:text-rose-400">
                                            {new Date(activitySummary.lastCompletedAppointment.date).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {activitySummary.lastCompletedAppointment.serviceName} · No-show: {activitySummary.noShowCount}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-lg font-semibold text-muted-foreground">Sin turnos atendidos</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="outline">Servicios cobrados: {formatCurrency(activitySummary?.totalServiceRevenue ?? 0)}</Badge>
                            <Badge variant="outline">Cancelados: {activitySummary?.cancelledAppointments ?? 0}</Badge>
                            <Badge variant="outline">No-show: {activitySummary?.noShowCount ?? 0}</Badge>
                            {daysSinceLastPurchase !== null ? (
                                <Badge variant="outline">Última compra hace {daysSinceLastPurchase} días</Badge>
                            ) : null}
                        </div>
                    </section>

                    <section className="bg-muted/30 p-5 rounded-xl border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Gift className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Programa de Fidelidad</h3>
                            </div>
                            {loyalty?.currentTier?.name ? (
                                <Badge variant="outline" className="font-medium">
                                    <Trophy className="h-3.5 w-3.5 mr-1" />
                                    {loyalty.currentTier.name}
                                </Badge>
                            ) : null}
                        </div>

                        {loyalty ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div className="rounded-lg border bg-background p-4">
                                        <p className="text-xs text-muted-foreground mb-1">Programa</p>
                                        <p className="font-semibold">{loyalty.programName}</p>
                                    </div>
                                    <div className="rounded-lg border bg-background p-4">
                                        <p className="text-xs text-muted-foreground mb-1">Puntos actuales</p>
                                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{loyalty.currentPoints}</p>
                                    </div>
                                    <div className="rounded-lg border bg-background p-4">
                                        <p className="text-xs text-muted-foreground mb-1">Total ganados</p>
                                        <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{loyalty.totalPointsEarned}</p>
                                    </div>
                                    <div className="rounded-lg border bg-background p-4">
                                        <p className="text-xs text-muted-foreground mb-1">Total canjeados</p>
                                        <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">{loyalty.totalPointsRedeemed}</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-background p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                            <p className="text-sm font-medium">Progreso de nivel</p>
                                            <p className="text-xs text-muted-foreground">
                                                {loyalty.currentTier
                                                    ? `Nivel actual: ${loyalty.currentTier.name}`
                                                    : 'Cliente enrolado sin nivel asignado'}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            {Math.round(loyalty.progressToNextTier ?? 0)}%
                                        </Badge>
                                    </div>
                                    <Progress value={loyalty.progressToNextTier ?? 0} className="h-3 mb-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {loyalty.nextTier
                                            ? `Faltan ${loyalty.pointsToNextTier ?? 0} puntos para ${loyalty.nextTier.name}`
                                            : 'Ya alcanzó el nivel más alto del programa'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-lg border bg-background p-4">
                                        <p className="text-xs text-muted-foreground mb-1">Última actividad loyalty</p>
                                        <p className="font-medium">
                                            {loyalty.lastActivityDate
                                                ? new Date(loyalty.lastActivityDate).toLocaleString('es-ES', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : 'Sin actividad registrada'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-background p-4">
                                        <p className="text-xs text-muted-foreground mb-1">Último movimiento</p>
                                        {loyalty.lastTransaction ? (
                                            <>
                                                <p className="font-medium">
                                                    {getLoyaltyTxLabel(loyalty.lastTransaction.type)} · {loyalty.lastTransaction.points} pts
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {loyalty.lastTransaction.description || 'Movimiento de puntos'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="font-medium text-muted-foreground">Sin transacciones</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed bg-background p-6 text-center">
                                <Star className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="font-medium">Sin programa de fidelidad activo para este cliente</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Cuando el cliente tenga compras o turnos cobrados vinculados a loyalty, sus puntos y nivel aparecerán aquí.
                                </p>
                            </div>
                        )}
                    </section>

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
                                                Imprimir ticket
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

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                <CalendarDays className="h-4 w-4" />
                                Historial de Turnos
                            </h3>
                            {appointmentHistory.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    Últimos {appointmentHistory.length} turnos
                                </span>
                            )}
                        </div>

                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : appointmentHistory.length > 0 ? (
                            <div className="space-y-3">
                                {appointmentHistory.map((appointment) => {
                                    const statusConfig = getAppointmentStatusConfig(appointment.status);

                                    return (
                                        <div
                                            key={appointment.id}
                                            className="p-4 bg-muted/50 rounded-lg border hover:border-primary/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Scissors className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-semibold text-sm truncate">
                                                            {appointment.serviceName}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {appointment.staffName || 'Profesional por definir'}
                                                    </p>
                                                </div>
                                                <Badge variant={statusConfig.variant} className="text-xs shrink-0">
                                                    {statusConfig.label}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Fecha</p>
                                                    <p className="font-medium">
                                                        {new Date(appointment.date).toLocaleDateString('es-ES', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Horario</p>
                                                    <p className="font-medium">
                                                        {new Date(appointment.startAt).toLocaleTimeString('es-ES', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })} - {new Date(appointment.endAt).toLocaleTimeString('es-ES', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Precio</p>
                                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(appointment.price)}
                                                    </p>
                                                </div>
                                            </div>

                                            {appointment.notes && (
                                                <div className="mt-3 pt-3 border-t">
                                                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                                                    <p className="text-sm">{appointment.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                                <p className="text-sm text-muted-foreground">No hay historial de turnos</p>
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
                    {(customer.birthDate || customer.notes || customer.tax_id || customer.ruc) && (
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
                                    {customer.ruc && (
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <span className="text-xs text-muted-foreground">RUC: </span>
                                                <span className="text-sm font-medium">{customer.ruc}</span>
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
