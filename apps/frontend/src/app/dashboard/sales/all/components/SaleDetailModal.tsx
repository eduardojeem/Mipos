'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  User, Calendar, DollarSign, CreditCard, Package, Hash, Printer, RotateCcw,
  Copy, AlertCircle, UserCheck, RotateCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sale } from './SalesDataTable';
import { createLogger } from '@/lib/logger';
import { formatStatus, formatPaymentMethod, formatSaleType, getStatusBadgeVariant } from '@/lib/sales-formatters';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

interface ProductImage {
  id: string;
  url: string;
}

interface DetailItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  alreadyReturned?: number;
  product?: { id: string; name: string; sku: string; images?: ProductImage[] };
}

interface SaleDetailResponse {
  sale: {
    saleItems?: DetailItem[];
    user?: { id: string; fullName: string; email: string };
    updated_at?: string;
    [key: string]: any;
  };
}

const logger = createLogger('SaleDetailModal');

export function SaleDetailModal({ sale, open, onClose }: SaleDetailModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: detail,
    isLoading: loadingDetail,
    isError: errorDetail,
  } = useQuery<SaleDetailResponse>({
    queryKey: ['sale-detail', sale?.id],
    queryFn: () => api.get<SaleDetailResponse>(`/sales/${sale!.id}`).then((r) => r.data),
    enabled: open && !!sale?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (!sale) return null;

  const items: DetailItem[] = detail?.sale?.saleItems ?? (sale.items as DetailItem[] | undefined) ?? [];
  const cashier = detail?.sale?.user;

  const handleStartReturn = () => {
    onClose();
    router.push(`/dashboard/returns?from=${encodeURIComponent(sale.id)}`);
  };

  // Use total_price (already accounts for item-level discounts) so subtotal is accurate
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const saleDiscount = sale.discount_amount || 0;
  const totalTax = sale.tax_amount || 0;
  const total = sale.total_amount;

  const copySaleId = () => {
    navigator.clipboard?.writeText(sale.id).then(
      () => toast({ description: 'ID copiado al portapapeles.' }),
      () => toast({ description: 'No se pudo copiar.', variant: 'destructive' }),
    );
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const shortId = sale.id.slice(0, 8).toUpperCase();
    const dateStr = format(new Date(sale.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es });

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Comprobante ${shortId}</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:32px 40px}
          @media print{body{padding:0}}

          /* Header */
          .header{text-align:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px}
          .header h1{font-size:22px;font-weight:700;letter-spacing:.5px}
          .header .ref{font-size:12px;color:#555;margin-top:4px;font-family:monospace}
          .header .status{display:inline-block;margin-top:8px;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;border:1.5px solid #111}

          /* Meta */
          .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:20px;font-size:12px}
          .meta-row{display:contents}
          .meta-label{color:#666}
          .meta-value{font-weight:500}

          /* Items table */
          table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12.5px}
          thead tr{border-bottom:1.5px solid #111}
          tbody tr{border-bottom:1px solid #e0e0e0}
          tbody tr:last-child{border-bottom:none}
          th{padding:7px 8px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.3px;color:#444}
          td{padding:8px 8px;vertical-align:middle}
          .td-right{text-align:right}
          .sku{font-size:10px;color:#888;display:block}
          .disc{color:#c0392b}

          /* Totals */
          .totals{border-top:1.5px solid #111;padding-top:12px;margin-left:auto;width:240px}
          .total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12.5px}
          .total-row.muted span:first-child{color:#666}
          .total-row.disc{color:#c0392b}
          .total-row.final{font-weight:700;font-size:15px;border-top:1px solid #ccc;margin-top:6px;padding-top:8px}

          /* Footer */
          .footer{margin-top:28px;text-align:center;font-size:10.5px;color:#999;border-top:1px solid #e0e0e0;padding-top:12px}
        </style>
      </head><body>
        <div class="header">
          <h1>Comprobante de Venta</h1>
          <div class="ref">Ref: #${shortId}</div>
          <div class="status">${formatStatus(sale.status)}</div>
        </div>

        <div class="meta">
          <span class="meta-label">Fecha</span>
          <span class="meta-value">${dateStr}</span>

          <span class="meta-label">Cliente</span>
          <span class="meta-value">${sale.customer ? sale.customer.name : 'Sin cliente registrado'}</span>

          ${sale.customer?.email ? `<span class="meta-label">Email</span><span class="meta-value">${sale.customer.email}</span>` : ''}
          ${sale.customer?.phone ? `<span class="meta-label">Teléfono</span><span class="meta-value">${sale.customer.phone}</span>` : ''}

          <span class="meta-label">Método de pago</span>
          <span class="meta-value">${formatPaymentMethod(sale.payment_method)}</span>

          ${cashier ? `<span class="meta-label">Cajero</span><span class="meta-value">${cashier.fullName}</span>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th class="td-right">Cant.</th>
              <th class="td-right">Precio u.</th>
              <th class="td-right">Desc.</th>
              <th class="td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.map((item) => `
                <tr>
                  <td>
                    ${item.product?.name || `Producto ${item.product_id.slice(0, 8)}`}
                    ${item.product?.sku ? `<span class="sku">SKU: ${item.product.sku}</span>` : ''}
                  </td>
                  <td class="td-right">${item.quantity}</td>
                  <td class="td-right">${formatCurrency(item.unit_price)}</td>
                  <td class="td-right disc">${item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '—'}</td>
                  <td class="td-right">${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">Sin productos</td></tr>'
            }
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row muted"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
          ${saleDiscount > 0 ? `<div class="total-row disc"><span>Descuento</span><span>-${formatCurrency(saleDiscount)}</span></div>` : ''}
          ${totalTax > 0 ? `<div class="total-row muted"><span>Impuesto</span><span>${formatCurrency(totalTax)}</span></div>` : ''}
          <div class="total-row final"><span>Total</span><span>${formatCurrency(total)}</span></div>
        </div>

        <div class="footer">
          Generado el ${format(new Date(), "d/MM/yyyy 'a las' HH:mm", { locale: es })}
          &nbsp;·&nbsp; ID: ${sale.id}
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const hasPartialReturns = items.some((i) => (i.alreadyReturned ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Hash className="h-5 w-5 shrink-0" />
            <span>Venta #{sale.id.slice(0, 8)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={copySaleId}
              title="Copiar ID completo"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Badge variant={getStatusBadgeVariant(sale.status)} className="ml-auto">
              {formatStatus(sale.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meta grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Left: client + date */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Cliente</p>
                  {sale.customer ? (
                    <>
                      <p className="text-sm">{sale.customer.name}</p>
                      {sale.customer.email && (
                        <p className="text-xs text-muted-foreground">{sale.customer.email}</p>
                      )}
                      {sale.customer.phone && (
                        <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin cliente registrado</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Fecha</p>
                  <p className="text-sm">{format(new Date(sale.created_at), 'PPP', { locale: es })}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), 'p', { locale: es })}</p>
                </div>
              </div>
            </div>

            {/* Right: payment + cashier */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Pago</p>
                  <p className="text-sm">{formatPaymentMethod(sale.payment_method)}</p>
                  <Badge variant="outline" className="mt-1">{formatSaleType(sale.sale_type)}</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                  {sale.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">{sale.notes}</p>
                  )}
                </div>
              </div>

              {/* Cashier — only shown once detail loads */}
              {cashier && (
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Cajero</p>
                    <p className="text-sm">{cashier.fullName}</p>
                    <p className="text-xs text-muted-foreground">{cashier.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5" />
              <h3 className="font-medium">Productos</h3>
              {hasPartialReturns && (
                <Badge variant="secondary" className="gap-1">
                  <RotateCw className="h-3 w-3" />
                  Con devoluciones
                </Badge>
              )}
            </div>

            {loadingDetail ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
              </div>
            ) : errorDetail ? (
              <div className="flex items-center gap-2 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No se pudo cargar el detalle de productos. Intenta cerrar y volver a abrir.
              </div>
            ) : items.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Producto</th>
                      <th className="px-4 py-2 text-right font-medium">Cant.</th>
                      <th className="px-4 py-2 text-right font-medium">Precio</th>
                      <th className="px-4 py-2 text-right font-medium">Desc.</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const returned = item.alreadyReturned ?? 0;
                      const firstImage = item.product?.images?.[0];
                      return (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              {firstImage && (
                                <img
                                  src={firstImage.url}
                                  alt=""
                                  className="h-9 w-9 rounded object-cover shrink-0 border"
                                />
                              )}
                              <div>
                                <p className="font-medium leading-tight">
                                  {item.product?.name || `Producto ${item.product_id.slice(0, 8)}`}
                                </p>
                                {item.product?.sku && (
                                  <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span>{item.quantity}</span>
                            {returned > 0 && (
                              <p className="text-xs text-amber-600 whitespace-nowrap">
                                {returned} devuelto{returned > 1 ? 's' : ''}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-right text-red-600">
                            {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin productos registrados</p>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5 text-sm max-w-xs ml-auto">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {saleDiscount > 0 && (
              <div className="flex justify-between gap-8 text-red-600">
                <span>Descuento</span>
                <span>-{formatCurrency(saleDiscount)}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Impuesto</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
            )}
            <div className="flex justify-between gap-8 font-bold text-base border-t pt-2 mt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleStartReturn}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Devolver
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
