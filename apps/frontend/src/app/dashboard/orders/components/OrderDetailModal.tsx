'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/utils/formatters';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import type { Order } from '@/hooks/useOptimizedOrders';
import { ORDER_STATUSES, PAYMENT_METHODS, STATUS_FLOW } from '@/lib/orders/constants';
import { getOrderStatusSelectOptions } from '@/lib/orders/status-transitions';
import Image from 'next/image';
import {
  Clock,
  Copy,
  CreditCard,
  Hash,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  User,
  XCircle,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (orderId: string, status: string) => void;
  isUpdating?: boolean;
  loading?: boolean;
}

function StatusTimeline({ current }: { current: string }) {
  const currentIdx = STATUS_FLOW.indexOf(current as keyof typeof ORDER_STATUSES);
  const isCancelled = current === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/20">
        <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        <span className="text-sm font-medium text-rose-800 dark:text-rose-300">Este pedido fue cancelado</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" role="list" aria-label="Progreso del pedido">
      {STATUS_FLOW.map((step, idx) => {
        const meta = ORDER_STATUSES[step];
        const Icon = meta.icon;
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1" role="listitem">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isCompleted
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{meta.label}</span>
            </div>
            {idx < STATUS_FLOW.length - 1 && (
              <div
                className={`h-0.5 w-3 rounded-full ${
                  idx < currentIdx ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {/* Eliminado el ternario redundante (value : value) */}
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getThermalRecipientFontSize(value: string): string {
  const length = value.trim().length;

  if (length <= 18) return '30px';
  if (length <= 28) return '24px';
  if (length <= 40) return '20px';
  return '17px';
}

function getThermalAddressFontSize(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const length = normalized.length;

  if (length <= 36) return '22px';
  if (length <= 60) return '18px';
  if (length <= 90) return '15px';
  return '13px';
}

export function OrderDetailModal({
  order,
  open,
  onOpenChange,
  onStatusChange,
  isUpdating,
  loading = false,
}: OrderDetailModalProps) {
  const { config } = useBusinessConfig();

  if (!open && !order) return null;

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl rounded-2xl border-border/60 p-0">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-10 text-center text-muted-foreground">
            <RefreshCw className={`h-8 w-8 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <div>
              <p className="font-medium text-foreground">Cargando detalle del pedido</p>
              <p className="mt-1 text-sm">Estamos consultando la informacion mas reciente.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const meta = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.PENDING;
  const StatusIcon = meta.icon;
  const createdDate = new Date(order.created_at);
  const updatedDate = order.updated_at ? new Date(order.updated_at) : null;
  const statusOptions = getOrderStatusSelectOptions(order.status);
  const shippingAddress = order.customer_address || 'Sin direccion registrada';

  const handleCopyOrderNumber = () => {
    void navigator.clipboard.writeText(order.order_number);
  };

  /**
   * Abre la vista del pedido en una nueva pestaña preparada para imprimir
   * Evita que `window.print()` imprima toda la página del dashboard.
   */
  const handlePrint = () => {
    const printContent = document.getElementById('order-detail-printable');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Pedido ${order.order_number}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .subtitle { color: #555; font-size: 13px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
            .section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
            .section h2 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
            .label { color: #555; }
            .total { font-size: 16px; font-weight: 700; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintShippingInfo = () => {
    const printWindow = window.open('', '_blank', 'width=720,height=640');
    if (!printWindow) return;

    const recipientFontSize = getThermalRecipientFontSize(order.customer_name);
    const addressFontSize = getThermalAddressFontSize(shippingAddress);
    const shippingPhone = order.customer_phone || 'Sin telefono';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Etiqueta de envio</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 1.5mm;
            }
            body {
              font-family: system-ui, sans-serif;
              margin: 0;
              padding: 0;
              color: #111;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              box-sizing: border-box;
              width: 77mm;
              max-width: 77mm;
              margin: 0 auto;
              padding: 1.5mm 1mm 1mm;
            }
            .field + .field {
              margin-top: 1.8mm;
            }
            .field-label {
              font-size: 9px;
              line-height: 1.1;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #52525b;
              margin-bottom: 0.8mm;
            }
            .recipient {
              font-size: ${recipientFontSize};
              line-height: 1.08;
              font-weight: 800;
              letter-spacing: -0.02em;
              word-break: break-word;
              white-space: pre-wrap;
            }
            .address {
              font-size: ${addressFontSize};
              line-height: 1.14;
              font-weight: 700;
              word-break: break-word;
              white-space: pre-wrap;
            }
            .phone {
              font-size: 16px;
              line-height: 1.15;
              font-weight: 700;
              word-break: break-word;
            }
            @media print {
              html, body {
                width: 80mm;
              }
            }
            @media screen {
              body {
                padding: 16px;
                background: #f4f4f5;
              }
              .sheet {
                background: #fff;
                box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.08);
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="field">
              <div class="field-label">Cliente</div>
              <div class="recipient">${escapeHtml(order.customer_name)}</div>
            </div>
            <div class="field">
              <div class="field-label">Direccion</div>
              <div class="address">${escapeHtml(shippingAddress)}</div>
            </div>
            <div class="field">
              <div class="field-label">Telefono</div>
              <div class="phone">${escapeHtml(shippingPhone)}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border-border/60 p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-6 pb-4 pt-6 backdrop-blur-sm">
          <DialogHeader className="space-y-3">
            <div className="flex flex-col gap-3">
              <DialogTitle className="sr-only">Detalle del pedido {order.order_number}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  className="group inline-flex items-center gap-2 rounded-xl border border-border/60 bg-zinc-50 px-3.5 py-2 font-mono transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                  aria-label={`Copiar numero de pedido ${order.order_number}`}
                >
                  {(() => {
                    const parts = order.order_number.match(/^([A-Z]{2,4})-(.+)$/);
                    const prefix = parts ? parts[1] : null;
                    const rest = parts ? parts[2] : order.order_number;
                    return (
                      <>
                        {prefix && <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{prefix}</span>}
                        <span className="text-base font-semibold text-foreground">{rest}</span>
                      </>
                    );
                  })()}
                  <Copy className="h-3.5 w-3.5 text-muted-foreground/0 transition-colors group-hover:text-blue-500" />
                </button>
                <Badge variant="outline" className={`gap-1.5 border px-3 py-1.5 text-sm ${meta.modalClassName}`}>
                  <StatusIcon className="h-4 w-4" />
                  {meta.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(createdDate, "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })}
              </p>
            </div>
            <StatusTimeline current={order.status} />
          </DialogHeader>
        </div>

        {/* Contenido (también sirve como fuente de impresión) */}
        <div id="order-detail-printable" className="space-y-1 px-6 pb-6">
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-border/60 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Cliente
              </h3>
              <div className="space-y-0">
                <InfoRow icon={User} label="Nombre" value={order.customer_name} />
                <InfoRow icon={Mail} label="Email" value={order.customer_email} />
                <InfoRow icon={Phone} label="Telefono" value={order.customer_phone} />
                <InfoRow icon={MapPin} label="Direccion" value={order.customer_address || 'Sin direccion registrada'} />
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-border/60 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Detalles de la orden
              </h3>
              <div className="space-y-0">
                <InfoRow icon={Hash} label="Origen" value={order.order_source || 'MANUAL'} />
                <InfoRow
                  icon={CreditCard}
                  label="Metodo de pago"
                  value={PAYMENT_METHODS[order.payment_method] || order.payment_method}
                />
                <InfoRow
                  icon={Clock}
                  label="Ultima actualizacion"
                  value={updatedDate ? format(updatedDate, "d MMM yyyy · HH:mm", { locale: es }) : '—'}
                />
                {order.notes && <InfoRow icon={ShoppingBag} label="Notas" value={order.notes} />}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Items */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-orange-600" />
              Productos ({order.order_items.length})
            </h3>
            <div className="space-y-2">
              {order.order_items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-white px-4 py-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {item.products?.image_url ? (
                      <Image
                        src={item.products.image_url}
                        alt={item.product_name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} × {formatPrice(item.unit_price, config)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatPrice(item.subtotal, config)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-sky-600" />
              Historial de estados
            </h3>
            {order.order_status_history && order.order_status_history.length > 0 ? (
              <div className="space-y-2">
                {order.order_status_history.map((entry) => {
                  const entryMeta =
                    ORDER_STATUSES[entry.status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.PENDING;
                  const EntryIcon = entryMeta.icon;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <EntryIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium">{entryMeta.label}</span>
                        </div>
                        {entry.notes ? (
                          <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {entry.changed_at
                          ? format(new Date(entry.changed_at), "d MMM yyyy · HH:mm", { locale: es })
                          : 'Sin fecha'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No hay historial disponible para este pedido.
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="rounded-xl border border-border/60 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal, config)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Envio</span>
                <span>{order.shipping_cost > 0 ? formatPrice(order.shipping_cost, config) : 'Gratis'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between pt-1 text-lg font-semibold">
                <span>Total</span>
                <span className="text-blue-600 dark:text-blue-400">{formatPrice(order.total, config)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Package className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintShippingInfo}>
                <MapPin className="mr-2 h-4 w-4" />
                Imprimir envio
              </Button>
            </div>
            {onStatusChange && statusOptions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cambiar estado:</span>
                <Select
                  value={order.status}
                  onValueChange={(value) => onStatusChange(order.id, value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
