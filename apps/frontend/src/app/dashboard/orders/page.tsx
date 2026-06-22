'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/utils/formatters';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import { useCurrentOrganizationName } from '@/hooks/use-current-organization';
import type { Order } from '@/hooks/useOptimizedOrders';
import {
  useOptimizedOrders,
  useOrderDetail,
  useOrderStats,
  useUpdateOrderPaymentStatus,
  useUpdateOrderStatus,
} from '@/hooks/useOptimizedOrders';
import { CreateOrderModal } from './components/CreateOrderModal';
import { OrderDetailModal } from './components/OrderDetailModal';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, TERMINAL_STATUSES } from '@/lib/orders/constants';
import {
  canTransitionOrderStatus,
  getAllowedOrderStatusTransitions,
  getOrderStatusSelectOptions,
  isKnownOrderStatus,
} from '@/lib/orders/status-transitions';
import type { OrderStatus } from '@/lib/orders/status-transitions';
import {
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  User,
} from 'lucide-react';

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.PENDING;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 border ${meta.listClassName}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function OrderNumber({ value, size = 'default' }: { value: string; size?: 'default' | 'sm' }) {
  const { toast } = useToast();
  const parts = value.match(/^([A-Z]{2,4})-(.+)$/);
  const prefix = parts ? parts[1] : null;
  const rest = parts ? parts[2] : value;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(value);
    toast({ title: 'Copiado', description: `${value} copiado al portapapeles.` });
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-zinc-50 font-mono transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 ${isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}
      aria-label={`Copiar numero de pedido ${value}`}
    >
      {prefix && (
        <span className={`font-semibold text-blue-600 dark:text-blue-400 ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
          {prefix}
        </span>
      )}
      <span className="text-foreground">{rest}</span>
      <Copy className={`text-muted-foreground/0 transition-colors group-hover:text-blue-500 ${isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
    </button>
  );
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportOrdersCsv(orders: Order[]) {
  const rows = [
    ['Numero', 'Estado', 'Cliente', 'Email', 'Telefono', 'Fecha', 'Pago', 'Total'],
    ...orders.map((order) => [
      order.order_number,
      order.status,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.created_at,
      PAYMENT_METHODS[order.payment_method] || order.payment_method,
      order.total,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  // Necesario para Firefox
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const WORKFLOW_FILTERS: Array<{
  value: string;
  label: string;
  description: string;
  statKey?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped';
}> = [
  { value: 'PENDING', label: 'Por confirmar', description: 'Pedidos nuevos', statKey: 'pending' },
  { value: 'CONFIRMED', label: 'Confirmados', description: 'Listos para preparar', statKey: 'confirmed' },
  { value: 'PREPARING', label: 'Preparando', description: 'En armado', statKey: 'preparing' },
  { value: 'READY', label: 'Listos', description: 'Para enviar o retirar', statKey: 'ready' },
  { value: 'SHIPPED', label: 'En camino', description: 'Despachados', statKey: 'shipped' },
  { value: 'ALL', label: 'Todos', description: 'Historial completo' },
];

function StatusWorkflowBar({
  value,
  stats,
  onChange,
}: {
  value: string;
  stats?: { pending?: number; confirmed?: number; preparing?: number; ready?: number; shipped?: number };
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
      {WORKFLOW_FILTERS.map((item) => {
        const active = value === item.value;
        const meta = ORDER_STATUSES[item.value as keyof typeof ORDER_STATUSES];
        const Icon = meta?.icon || ShoppingBag;
        const count = item.statKey ? Number(stats?.[item.statKey] || 0) : undefined;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-xl border px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-800 dark:hover:bg-blue-950/20 ${
              active
                ? 'border-blue-300 bg-blue-50 shadow-sm dark:border-blue-800 dark:bg-blue-950/30'
                : 'border-border/60 bg-background'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon className={active ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-muted-foreground'} />
                {item.label}
              </span>
              {typeof count === 'number' ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  active ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {count}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const key = String(status || 'PENDING').toUpperCase();
  const meta = PAYMENT_STATUSES[key] || PAYMENT_STATUSES.PENDING;
  return (
    <Badge variant="outline" className={`gap-1 border ${meta.className}`}>
      {meta.label}
    </Badge>
  );
}

function isManualPaymentPending(order: Order) {
  return ['CASH', 'TRANSFER'].includes(order.payment_method) && (order.payment_status || 'PENDING') === 'PENDING';
}

function isTransferPaymentPending(order: Order) {
  return order.payment_method === 'TRANSFER' && (order.payment_status || 'PENDING') === 'PENDING';
}

function getPaymentConfirmationLabel(order: Order) {
  const completionStatus = getPaymentCompletionStatus(order);
  if (order.payment_method === 'CASH' && completionStatus === 'DELIVERED') {
    return order.fulfillment_type === 'PICKUP' ? 'Cobrar y marcar retirado' : 'Cobrar y marcar entregado';
  }
  if (order.payment_method === 'CASH') return 'Confirmar efectivo';
  if (order.payment_method === 'TRANSFER') return 'Confirmar transferencia';
  return 'Confirmar pago';
}

function getPaymentCompletionStatus(order: Order): OrderStatus | undefined {
  if (!isManualPaymentPending(order)) return undefined;
  if (order.payment_method !== 'CASH') return undefined;

  if (order.fulfillment_type === 'PICKUP' && order.status === 'READY') {
    return 'DELIVERED';
  }

  if (order.fulfillment_type !== 'PICKUP' && order.status === 'SHIPPED') {
    return 'DELIVERED';
  }

  return undefined;
}

function getPrimaryNextStatus(status: string, isPickup = false): OrderStatus | null {
  const transitions = getAllowedOrderStatusTransitions(status);
  if (isPickup && status === 'READY' && transitions.includes('DELIVERED')) {
    return 'DELIVERED';
  }
  return transitions.find((next) => next !== 'CANCELLED') || null;
}

function getStatusOptionsForOrder(status: string, isPickup: boolean): OrderStatus[] {
  const options = getOrderStatusSelectOptions(status);
  return isPickup && status === 'READY' ? options.filter((option) => option !== 'SHIPPED') : options;
}

function getPrimaryActionLabel(status: string, nextStatus: OrderStatus, isPickup: boolean) {
  if (isPickup) {
    if (nextStatus === 'READY') return 'Listo para retiro';
    if (nextStatus === 'DELIVERED') return 'Marcar retirado';
  }

  if (nextStatus === 'SHIPPED') return 'Enviar pedido';
  return ORDER_STATUSES[nextStatus].label;
}

function getWhatsAppHref(phone: string, orderNumber: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Tu pedido ${orderNumber} esta listo para retirar.`)}`;
}

function getTransferProofWhatsAppHref(phone: string, orderNumber: string, total: number, config: Parameters<typeof formatPrice>[1]) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const message = `Hola, estamos revisando tu pedido ${orderNumber}. Para confirmar la transferencia de ${formatPrice(total, config)}, por favor envianos el comprobante por este chat.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function getTransferConfirmedWhatsAppHref(phone: string, orderNumber: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const message = `Hola, ya confirmamos la transferencia de tu pedido ${orderNumber}. Vamos a continuar con la preparacion.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// OrderRow — componente extraído para evitar JSX de 800 chars en línea
// ---------------------------------------------------------------------------

interface OrderRowProps {
  order: Order;
  isSelected: boolean;
  isUpdating: boolean;
  onSelect: (id: string) => void;
  onOpenDetail: (orderId: string) => void;
  onStatusChangeRequest: (orderId: string, status: string) => void;
  onConfirmPayment: (order: Order) => void;
}

function OrderRow({ order, isSelected, isUpdating, onSelect, onOpenDetail, onStatusChangeRequest, onConfirmPayment }: OrderRowProps) {
  const { config } = useBusinessConfig();
  const isPickup = order.fulfillment_type === 'PICKUP';
  const isPaymentPending = isManualPaymentPending(order);
  const isTransferPending = isTransferPaymentPending(order);
  const statusOptions = getStatusOptionsForOrder(order.status, isPickup);
  const primaryNextStatus = getPrimaryNextStatus(order.status, isPickup);
  const paymentCompletionStatus = getPaymentCompletionStatus(order);
  const isMissingAddress = !isPickup && !order.customer_address?.trim();
  const whatsappHref = isPickup ? getWhatsAppHref(order.customer_phone, order.order_number) : null;
  const transferProofHref = isTransferPending
    ? getTransferProofWhatsAppHref(order.customer_phone, order.order_number, order.total, config)
    : null;
  const transferConfirmedHref =
    order.payment_method === 'TRANSFER' && (order.payment_status || 'PENDING') === 'PAID'
      ? getTransferConfirmedWhatsAppHref(order.customer_phone, order.order_number)
      : null;

  return (
    <div className={`border-l-4 px-6 py-5 transition-colors ${
      isSelected ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/10' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
    }`}>
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto]">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(order.id)}
          className="mt-1"
        />
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <OrderNumber value={order.order_number} />
                <StatusBadge status={order.status} />
                <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                  {order.order_source === 'MANUAL' ? 'Manual' : order.order_source === 'WEB' ? 'Web' : (order.order_source || 'Manual')}
                </Badge>
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  {isPickup ? 'Retiro en local' : 'Delivery'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Creado el {format(new Date(order.created_at), 'PPp', { locale: es })}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xl font-semibold">{formatPrice(order.total, config)}</p>
              <p className="text-sm text-muted-foreground">
                {order.order_items.length} {order.order_items.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-[1.1fr_0.8fr_1.2fr]">
            <div className="space-y-1 rounded-lg border border-border/50 bg-white p-3 dark:bg-zinc-900/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              {order.customer_email ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{order.customer_email}</span>
                </div>
              ) : null}
              {order.customer_phone ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{order.customer_phone}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-1 rounded-lg border border-border/50 bg-white p-3 dark:bg-zinc-900/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pago</p>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{PAYMENT_METHODS[order.payment_method] || order.payment_method}</span>
              </div>
              <PaymentStatusBadge status={order.payment_status} />
              {isTransferPending ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Confirmar el dinero antes de preparar o entregar.
                </p>
              ) : isPaymentPending ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Marcar como cobrado cuando recibas el efectivo.
                </p>
              ) : null}
              <p className="text-muted-foreground">Subtotal: {formatPrice(order.subtotal, config)}</p>
              <p className="text-muted-foreground">
                {isPickup ? 'Retiro: sin costo' : `Envio: ${formatPrice(order.shipping_cost, config)}`}
              </p>
            </div>

            <div className={`space-y-1 rounded-lg border p-3 ${
              isMissingAddress
                ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100'
                : 'border-border/50 bg-white dark:bg-zinc-900/40'
            }`}>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                {isPickup ? 'Retiro' : 'Entrega'}
              </p>
              <div className="flex items-start gap-2 text-muted-foreground">
                {isPickup ? <Package className="mt-0.5 h-4 w-4" /> : <MapPin className="mt-0.5 h-4 w-4" />}
                <span>{isPickup ? 'Cliente retira en el local' : order.customer_address || 'Sin direccion registrada'}</span>
              </div>
              {isPickup && order.status === 'READY' ? (
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Avisar al cliente y marcar como retirado cuando se entregue.
                </p>
              ) : null}
              {isMissingAddress ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Completa la direccion antes de despachar.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {order.order_items.slice(0, 4).map((item) => (
              <Badge key={item.id} variant="secondary">
                {item.quantity}x {item.product_name}
              </Badge>
            ))}
            {order.order_items.length > 4 ? (
              <Badge variant="outline">+{order.order_items.length - 4} mas</Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:w-44">
          {primaryNextStatus ? (
            <Button
              onClick={() => onStatusChangeRequest(order.id, primaryNextStatus)}
              disabled={isUpdating || isTransferPending || (isPaymentPending && primaryNextStatus === 'DELIVERED')}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isUpdating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {getPrimaryActionLabel(order.status, primaryNextStatus, isPickup)}
            </Button>
          ) : null}
          {isPaymentPending ? (
            <Button
              variant={paymentCompletionStatus ? 'default' : 'outline'}
              onClick={() => onConfirmPayment(order)}
              disabled={isUpdating}
              className={
                paymentCompletionStatus
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {getPaymentConfirmationLabel(order)}
            </Button>
          ) : null}
          {transferProofHref ? (
            <Button variant="outline" asChild>
              <a href={transferProofHref} target="_blank" rel="noreferrer">
                <Phone className="mr-2 h-4 w-4" />
                Pedir comprobante
              </a>
            </Button>
          ) : null}
          {transferConfirmedHref ? (
            <Button variant="outline" asChild>
              <a href={transferConfirmedHref} target="_blank" rel="noreferrer">
                <Phone className="mr-2 h-4 w-4" />
                Avisar pago
              </a>
            </Button>
          ) : null}
          {whatsappHref && order.status === 'READY' ? (
            <Button variant="outline" asChild>
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <Phone className="mr-2 h-4 w-4" />
                Avisar retiro
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenDetail(order.id)}>
            <Eye className="mr-2 h-4 w-4" />
            Detalle
          </Button>
          <Select
            value={order.status}
            onValueChange={(value) => onStatusChangeRequest(order.id, value)}
            disabled={isUpdating || statusOptions.length <= 1}
          >
            <SelectTrigger>
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Actualizando...</span>
                </div>
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((statusKey) => (
                <SelectItem key={statusKey} value={statusKey}>
                  {ORDER_STATUSES[statusKey].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OrdersAdminPage() {
  const organizationId = useCurrentOrganizationId();
  const organizationName = useCurrentOrganizationName();
  const { config } = useBusinessConfig();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'MANUAL_PENDING' | 'TRANSFER_PENDING' | 'CASH_PENDING'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEB' | 'MANUAL'>('ALL');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'total' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Confirmación de estado crítico
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; status: string } | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoizamos los parámetros para evitar que el objeto inline
  // invalide el useMemo interno del hook en cada render.
  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: PAGE_SIZE,
      status: statusFilter,
      search: debouncedSearchTerm,
      dateRange,
      sortBy,
      sortOrder,
      paymentMethod:
        paymentFilter === 'MANUAL_PENDING'
          ? 'MANUAL'
          : paymentFilter === 'TRANSFER_PENDING'
          ? 'TRANSFER'
          : paymentFilter === 'CASH_PENDING'
            ? 'CASH'
            : 'ALL',
      paymentStatus: paymentFilter === 'ALL' ? 'ALL' : 'PENDING',
      orderSource: sourceFilter,
    }),
    [currentPage, statusFilter, debouncedSearchTerm, dateRange, sortBy, sortOrder, paymentFilter, sourceFilter]
  );

  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useOptimizedOrders(queryParams);
  const { data: selectedOrder, isLoading: selectedOrderLoading } = useOrderDetail(selectedOrderId);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useOrderStats();
  const updateStatusMutation = useUpdateOrderStatus();
  const updatePaymentStatusMutation = useUpdateOrderPaymentStatus();

  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData?.orders]);
  const totalPages = ordersData?.pagination.totalPages || 1;
  const totalCount = ordersData?.pagination.total || 0;
  const allVisibleIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedOrders.includes(id));
  const selectedVisibleOrders = useMemo(
    () => orders.filter((order) => selectedOrders.includes(order.id)),
    [orders, selectedOrders]
  );
  const bulkStatusOptions = useMemo(() => {
    if (!selectedVisibleOrders.length) {
      return [];
    }

    return selectedVisibleOrders
      .map((order) => getAllowedOrderStatusTransitions(order.status))
      .reduce<OrderStatus[]>((common, transitions, index) => {
        if (index === 0) {
          return [...transitions];
        }

        return common.filter((status) => transitions.includes(status));
      }, []);
  }, [selectedVisibleOrders]);
  const selectedOrderSummary = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const resolvedSelectedOrder = selectedOrder || selectedOrderSummary;
  const actionQueueCount =
    Number(stats?.pending || 0) +
    Number(stats?.confirmed || 0) +
    Number(stats?.preparing || 0) +
    Number(stats?.ready || 0);
  const sourceFilterMeta = useMemo(() => {
    switch (sourceFilter) {
      case 'WEB':
        return {
          title: 'Canal web',
          description: 'Pedidos creados desde el catalogo publico y el carrito online.',
          icon: Globe,
          badgeClassName: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300',
        };
      case 'MANUAL':
        return {
          title: 'Canal manual',
          description: 'Pedidos cargados desde dashboard, mostrador o gestion interna.',
          icon: Building2,
          badgeClassName: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300',
        };
      default:
        return {
          title: 'Todos los canales',
          description: 'Vista unificada para pedidos web y pedidos creados manualmente.',
          icon: ShoppingBag,
          badgeClassName: 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300',
        };
    }
  }, [sourceFilter]);
  const SourceFilterIcon = sourceFilterMeta.icon;

  const markUpdating = useCallback((ids: string[], enabled: boolean) => {
    setUpdatingIds((current) =>
      enabled ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id))
    );
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, paymentFilter, sourceFilter, dateRange, sortBy, sortOrder]);

  // Deselect orders that are no longer visible
  useEffect(() => {
    setSelectedOrders((current) => current.filter((id) => allVisibleIds.includes(id)));
  }, [allVisibleIds]);

  const getCurrentOrderStatus = useCallback(
    (orderId: string) => {
      if (selectedOrder?.id === orderId) {
        return selectedOrder.status;
      }

      return orders.find((order) => order.id === orderId)?.status || null;
    },
    [orders, selectedOrder]
  );

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
        <Card className="mx-auto max-w-4xl border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <Building2 className="h-6 w-6 text-zinc-500" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Selecciona una organizacion</h2>
              <p className="mt-2 text-sm text-muted-foreground">Necesitas una organizacion activa para gestionar pedidos.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchOrders(), refetchStats()]);
      toast({ title: 'Vista actualizada', description: 'Los pedidos y metricas fueron recargados.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo recargar la informacion.', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      markUpdating([orderId], true);
      await updateStatusMutation.mutateAsync({ orderId, status });
      toast({
        title: 'Estado actualizado',
        description: `Pedido marcado como ${ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label || status}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el pedido.',
        variant: 'destructive',
      });
    } finally {
      markUpdating([orderId], false);
    }
  };

  const handleConfirmPayment = async (order: Order) => {
    const completionStatus = getPaymentCompletionStatus(order);
    try {
      markUpdating([order.id], true);
      await updatePaymentStatusMutation.mutateAsync({
        orderId: order.id,
        paymentStatus: 'PAID',
        status:
          completionStatus ||
          (order.payment_method === 'TRANSFER' && order.status === 'PENDING' ? 'CONFIRMED' : undefined),
      });
      toast({
        title: order.payment_method === 'CASH' ? 'Efectivo confirmado' : 'Transferencia confirmada',
        description:
          completionStatus === 'DELIVERED'
            ? order.fulfillment_type === 'PICKUP'
              ? 'El pago quedo confirmado y el pedido fue marcado como retirado.'
              : 'El pago quedo confirmado y el pedido fue marcado como entregado.'
            : order.payment_method === 'TRANSFER' && order.status === 'PENDING'
            ? 'El pago quedo confirmado y el pedido paso a confirmado.'
            : 'El pago del pedido quedo confirmado.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo confirmar el pago',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      markUpdating([order.id], false);
    }
  };

  // Intercepta el cambio de estado y muestra confirmación si es crítico
  const handleStatusChangeRequest = (orderId: string, status: string) => {
    const currentStatus = getCurrentOrderStatus(orderId);
    if (!currentStatus || currentStatus === status) {
      return;
    }

    const currentOrder =
      resolvedSelectedOrder?.id === orderId
        ? resolvedSelectedOrder
        : orders.find((order) => order.id === orderId);
    const isPendingTransfer = currentOrder ? isTransferPaymentPending(currentOrder) : false;
    const isManualPaymentFinalizationBlocked =
      status === 'DELIVERED' && currentOrder ? isManualPaymentPending(currentOrder) : false;

    if (isPendingTransfer && status !== 'CANCELLED') {
      toast({
        title: 'Transferencia pendiente',
        description: 'Confirma el pago antes de avanzar el pedido.',
        variant: 'destructive',
      });
      return;
    }

    if (isManualPaymentFinalizationBlocked) {
      toast({
        title: 'Pago pendiente',
        description: 'Para cerrar este pedido, usa la accion de cobro para confirmar el pago y marcarlo como entregado.',
        variant: 'destructive',
      });
      return;
    }

    if (!canTransitionOrderStatus(currentStatus, status)) {
      toast({
        title: 'Cambio no permitido',
        description: `No se puede cambiar un pedido de ${ORDER_STATUSES[currentStatus as keyof typeof ORDER_STATUSES]?.label || currentStatus} a ${ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label || status}.`,
        variant: 'destructive',
      });
      return;
    }

    if (TERMINAL_STATUSES.has(status)) {
      setPendingStatusChange({ orderId, status });
    } else {
      void handleStatusChange(orderId, status);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!selectedOrders.length) return;
    if (!isKnownOrderStatus(status) || !bulkStatusOptions.includes(status)) {
      toast({
        title: 'Cambio no permitido',
        description: 'Los pedidos seleccionados no comparten una transicion valida hacia ese estado.',
        variant: 'destructive',
      });
      return;
    }

    // Confirmación para bulk de estado crítico
    if (TERMINAL_STATUSES.has(status)) {
      setPendingStatusChange({ orderId: '__bulk__', status });
      return;
    }

    await executeBulkStatusChange(status, selectedOrders);
  };

  const executeBulkStatusChange = async (status: string, ids: string[]) => {
    setBulkUpdating(true);
    markUpdating(ids, true);
    const results = await Promise.allSettled(
      ids.map((orderId) => updateStatusMutation.mutateAsync({ orderId, status }))
    );
    const failed = results
      .map((result, index) => ({ result, id: ids[index] }))
      .filter((entry) => entry.result.status === 'rejected')
      .map((entry) => entry.id);
    markUpdating(ids, false);
    setSelectedOrders(failed);
    setBulkUpdating(false);
    toast({
      title: failed.length ? 'Actualizacion parcial' : 'Pedidos actualizados',
      description: failed.length
        ? `${results.length - failed.length} pedidos actualizados, ${failed.length} con error.`
        : `${results.length} pedidos actualizados.`,
      variant: failed.length ? 'destructive' : 'default',
    });
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) return;
    const { orderId, status } = pendingStatusChange;
    setPendingStatusChange(null);

    if (orderId === '__bulk__') {
      void executeBulkStatusChange(status, selectedOrders);
    } else {
      void handleStatusChange(orderId, status);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setSourceFilter('ALL');
    setDateRange('all');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
    setSelectedOrders([]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pedidos del canal digital</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona cumplimiento, cambios de estado y altas manuales desde una sola vista.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                <Building2 className="h-3.5 w-3.5" />
                {organizationName ? `Organizacion activa: ${organizationName}` : 'Organizacion activa'}
              </Badge>
              <Badge variant="outline" className={`gap-1.5 ${sourceFilterMeta.badgeClassName}`}>
                <SourceFilterIcon className="h-3.5 w-3.5" />
                {sourceFilterMeta.title}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={ordersLoading || statsLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                orders.length
                  ? exportOrdersCsv(orders)
                  : toast({ title: 'Sin datos', description: 'No hay pedidos para exportar.', variant: 'destructive' })
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => setShowCreateOrder(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva orden
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/60 shadow-sm dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Pedidos totales</p>
              <p className="mt-1 text-2xl font-semibold">{statsLoading && !stats ? '...' : stats?.total || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Requieren accion</p>
              <p className="mt-1 text-2xl font-semibold">{statsLoading && !stats ? '...' : actionQueueCount}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Pedidos hoy</p>
              <p className="mt-1 text-2xl font-semibold">{statsLoading && !stats ? '...' : stats?.todayOrders || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Ingresos hoy</p>
              <p className="mt-1 text-2xl font-semibold">
                {statsLoading && !stats ? '...' : formatPrice(stats?.todayRevenue || 0, config)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-sky-200/80 shadow-sm dark:border-sky-900/40 dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                <Globe className="h-4 w-4" />
                <p className="text-sm font-medium">Web hoy</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {statsLoading && !stats ? '...' : stats?.webTodayOrders || 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedidos creados desde el catalogo publico en esta organizacion.
              </p>
            </CardContent>
          </Card>
          <Card className="border-violet-200/80 shadow-sm dark:border-violet-900/40 dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                <Building2 className="h-4 w-4" />
                <p className="text-sm font-medium">Manual hoy</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {statsLoading && !stats ? '...' : stats?.manualTodayOrders || 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedidos cargados desde dashboard, mostrador o gestion interna.
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200/80 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Package className="h-4 w-4" />
                <p className="text-sm font-medium">Pendientes web</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {statsLoading && !stats ? '...' : stats?.webPendingOrders || 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cola operativa del canal online que aun requiere accion del equipo.
              </p>
            </CardContent>
          </Card>
        </div>

        <StatusWorkflowBar value={statusFilter} stats={stats} onChange={setStatusFilter} />

        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SourceFilterIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">{sourceFilterMeta.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{sourceFilterMeta.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sourceFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setSourceFilter('ALL')}
                className={sourceFilter === 'ALL' ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200' : ''}
              >
                Todos
              </Button>
              <Button
                variant={sourceFilter === 'WEB' ? 'default' : 'outline'}
                onClick={() => setSourceFilter('WEB')}
                className={sourceFilter === 'WEB' ? 'bg-sky-600 text-white hover:bg-sky-700' : ''}
              >
                <Globe className="mr-2 h-4 w-4" />
                Web
              </Button>
              <Button
                variant={sourceFilter === 'MANUAL' ? 'default' : 'outline'}
                onClick={() => setSourceFilter('MANUAL')}
                className={sourceFilter === 'MANUAL' ? 'bg-violet-600 text-white hover:bg-violet-700' : ''}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Manual
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 xl:grid-cols-[1.5fr_repeat(5,minmax(0,190px))]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por numero, cliente, email o notas..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
                <SelectTrigger>
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los periodos</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Ultima semana</SelectItem>
                  <SelectItem value="month">Ultimo mes</SelectItem>
                  <SelectItem value="year">Ultimo ano</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  {Object.entries(ORDER_STATUSES).map(([key, status]) => (
                    <SelectItem key={key} value={key}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as typeof paymentFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los pagos</SelectItem>
                  <SelectItem value="MANUAL_PENDING">Pagos manuales pendientes</SelectItem>
                  <SelectItem value="CASH_PENDING">Efectivo pendiente</SelectItem>
                  <SelectItem value="TRANSFER_PENDING">Transferencias pendientes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
                <SelectTrigger>
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los origenes</SelectItem>
                  <SelectItem value="WEB">Solo web</SelectItem>
                  <SelectItem value="MANUAL">Solo manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Fecha</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="status">Estado</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
              </Button>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex flex-wrap gap-2">
                {statusFilter !== 'ALL' ? (
                  <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                    Estado activo
                  </Badge>
                ) : null}
                {dateRange !== 'all' ? (
                  <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                    Periodo activo
                  </Badge>
                ) : null}
                {paymentFilter !== 'ALL' ? (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {paymentFilter === 'TRANSFER_PENDING'
                      ? 'Transferencias pendientes'
                      : paymentFilter === 'CASH_PENDING'
                        ? 'Efectivo pendiente'
                        : 'Pagos manuales pendientes'}
                  </Badge>
                ) : null}
                {sourceFilter !== 'ALL' ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    {sourceFilter === 'WEB' ? 'Origen web' : 'Origen manual'}
                  </Badge>
                ) : null}
                {debouncedSearchTerm ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Busqueda activa
                  </Badge>
                ) : null}
              </div>
              <Button variant="ghost" onClick={handleResetFilters}>
                Restablecer filtros
              </Button>
            </div>
            {selectedOrders.length ? (
              <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedOrders.length} pedidos seleccionados
                </p>
                <div className="flex gap-2">
                  <Select
                    onValueChange={handleBulkStatusChange}
                    disabled={bulkUpdating || bulkStatusOptions.length === 0}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder={bulkStatusOptions.length ? 'Cambiar estado' : 'Sin transiciones validas'} />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkStatusOptions.map((statusKey) => (
                        <SelectItem key={statusKey} value={statusKey}>
                          {ORDER_STATUSES[statusKey].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setSelectedOrders([])} disabled={bulkUpdating}>
                    Limpiar
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Lista */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                Pedidos
                <span className="text-muted-foreground">
                  ({totalCount})
                </span>
              </CardTitle>
              <Button
                variant="outline"
                onClick={() =>
                  setSelectedOrders((current) =>
                    allVisibleSelected
                      ? current.filter((id) => !allVisibleIds.includes(id))
                      : Array.from(new Set([...current, ...allVisibleIds]))
                  )
                }
                disabled={!orders.length}
              >
                {allVisibleSelected ? 'Deseleccionar pagina' : 'Seleccionar pagina'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="py-16 text-center text-muted-foreground">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
                Cargando pedidos...
              </div>
            ) : !orders.length ? (
              <div className="px-6 py-16 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
                <h3 className="text-lg font-semibold">
                  {sourceFilter === 'WEB' ? 'No se encontraron pedidos web' : 'No se encontraron pedidos'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {sourceFilter === 'WEB'
                    ? 'Verifica si el pedido se creo en esta misma organizacion activa o cambia el canal a "Todos" para comparar.'
                    : 'Ajusta los filtros o crea una nueva orden manual.'}
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Button variant="outline" onClick={handleResetFilters}>
                    Limpiar filtros
                  </Button>
                  <Button
                    onClick={() => setShowCreateOrder(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Crear orden
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isSelected={selectedOrders.includes(order.id)}
                    isUpdating={bulkUpdating || updatingIds.includes(order.id)}
                    onSelect={(id) =>
                      setSelectedOrders((current) =>
                        current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
                      )
                    }
                    onOpenDetail={setSelectedOrderId}
                    onStatusChangeRequest={handleStatusChangeRequest}
                    onConfirmPayment={handleConfirmPayment}
                  />
                ))}
              </div>
            )}

            {/* Paginación — siempre muestra el total, controles cuando hay más de 1 página */}
            <div className="flex flex-col gap-4 border-t border-border/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                {totalCount === 0
                  ? 'Sin resultados'
                  : totalPages > 1
                    ? `Mostrando ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalCount)} de ${totalCount} pedidos`
                    : `${totalCount} ${totalCount === 1 ? 'pedido' : 'pedidos'}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <OrderDetailModal
          order={resolvedSelectedOrder}
          open={Boolean(selectedOrderId)}
          onOpenChange={(open) => !open && setSelectedOrderId(null)}
          onStatusChange={handleStatusChangeRequest}
          onPaymentStatusChange={handleConfirmPayment}
          isUpdating={selectedOrderId ? updatingIds.includes(selectedOrderId) : false}
          loading={Boolean(selectedOrderId) && selectedOrderLoading && !resolvedSelectedOrder}
        />

        <CreateOrderModal open={showCreateOrder} onOpenChange={setShowCreateOrder} />

        {/* Diálogo de confirmación para estados críticos */}
        <AlertDialog
          open={Boolean(pendingStatusChange)}
          onOpenChange={(open) => !open && setPendingStatusChange(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Confirmar cambio a &ldquo;
                {pendingStatusChange
                  ? ORDER_STATUSES[pendingStatusChange.status as keyof typeof ORDER_STATUSES]?.label
                  : ''}
                &rdquo;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingStatusChange?.status === 'CANCELLED'
                  ? 'Esta accion cancela el pedido. El cliente no sera notificado automaticamente.'
                  : 'Esta accion marca el pedido como entregado. Es un estado terminal y no se puede deshacer facilmente.'}
                {pendingStatusChange?.orderId === '__bulk__'
                  ? ` Se aplicara a ${selectedOrders.length} pedidos seleccionados.`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStatusChange}
                className={
                  pendingStatusChange?.status === 'CANCELLED'
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
