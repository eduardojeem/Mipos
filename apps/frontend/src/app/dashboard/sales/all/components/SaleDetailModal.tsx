'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Hash, Copy, Printer, RotateCcw, AlertCircle, RefreshCw, Package, RotateCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sale } from './SalesDataTable';
import {
  formatStatus, formatPaymentMethod, formatSaleType, getStatusBadgeVariant,
} from '@/lib/sales-formatters';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  alreadyReturned?: number;
  product?: { id: string; name: string; sku: string };
}

interface FetchedDetail {
  items: SaleItem[];
  itemsError: string | null;
}

export function SaleDetailModal({ sale, open, onClose }: SaleDetailModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useQuery<FetchedDetail>({
    queryKey: ['sale-detail', sale?.id],
    queryFn: async (): Promise<FetchedDetail> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createSupabaseClient() as any;

      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select('id, sale_id, product_id, quantity, unit_price, total_price, discount_amount, products(id, name, sku)')
        .eq('sale_id', sale!.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: SaleItem[] = (itemsData ?? []).map((item: any) => ({
        ...item,
        product: item.products ?? null,
        products: undefined,
      }));

      return {
        items,
        itemsError: itemsError ? itemsError.message : null,
      };
    },
    enabled: open && !!sale?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!sale) return null;

  const shortId = sale.id.slice(0, 8).toUpperCase();

  // Use freshly fetched items; fall back to whatever the list already loaded
  const items: SaleItem[] =
    detail?.items ??
    (sale.items as SaleItem[] | undefined) ??
    [];

  const itemsLoadError = detail?.itemsError;
  const hasItems = items.length > 0;
  const hasPartialReturns = items.some((i) => (i.alreadyReturned ?? 0) > 0);

  const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
  const saleDiscount = sale.discount_amount ?? 0;
  const totalTax = sale.tax_amount ?? 0;
  const total = sale.total_amount;

  const copySaleId = () => {
    navigator.clipboard?.writeText(sale.id).then(
      () => toast({ description: 'ID copiado.' }),
      () => toast({ description: 'No se pudo copiar.', variant: 'destructive' }),
    );
  };

  const handleStartReturn = () => {
    onClose();
    router.push(`/dashboard/returns?from=${encodeURIComponent(sale.id)}`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dateStr = format(new Date(sale.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es });
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Comprobante ${shortId}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:32px 40px}
        @media print{body{padding:0}}
        .header{text-align:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px}
        .header h1{font-size:22px;font-weight:700}
        .header .ref{font-size:12px;color:#555;margin-top:4px;font-family:monospace}
        .header .status{display:inline-block;margin-top:8px;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;border:1.5px solid #111}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;margin-bottom:20px;font-size:12px}
        .meta-label{color:#666}
        .meta-value{font-weight:500}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12.5px}
        thead tr{border-bottom:1.5px solid #111}
        tbody tr{border-bottom:1px solid #e0e0e0}
        tbody tr:last-child{border-bottom:none}
        th{padding:7px 8px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.3px;color:#444}
        td{padding:8px;vertical-align:middle}
        .r{text-align:right}
        .sku{font-size:10px;color:#888;display:block}
        .disc{color:#c0392b}
        .totals{border-top:1.5px solid #111;padding-top:12px;margin-left:auto;width:220px}
        .tr{display:flex;justify-content:space-between;padding:3px 0;font-size:12.5px}
        .tr.muted span:first-child{color:#666}
        .tr.disc{color:#c0392b}
        .tr.final{font-weight:700;font-size:15px;border-top:1px solid #ccc;margin-top:6px;padding-top:8px}
        .footer{margin-top:28px;text-align:center;font-size:10.5px;color:#999;border-top:1px solid #e0e0e0;padding-top:12px}
      </style>
    </head><body>
      <div class="header">
        <h1>Comprobante de Venta</h1>
        <div class="ref">Ref: #${shortId}</div>
        <div class="status">${formatStatus(sale.status)}</div>
      </div>
      <div class="meta">
        <span class="meta-label">Fecha</span><span class="meta-value">${dateStr}</span>
        <span class="meta-label">Cliente</span><span class="meta-value">${sale.customer?.name ?? 'Sin cliente'}</span>
        ${sale.customer?.email ? `<span class="meta-label">Email</span><span class="meta-value">${sale.customer.email}</span>` : ''}
        ${sale.customer?.phone ? `<span class="meta-label">Teléfono</span><span class="meta-value">${sale.customer.phone}</span>` : ''}
        <span class="meta-label">Método de pago</span><span class="meta-value">${formatPaymentMethod(sale.payment_method)}</span>
      </div>
      <table>
        <thead><tr>
          <th>Producto</th><th class="r">Cant.</th><th class="r">Precio u.</th><th class="r">Desc.</th><th class="r">Total</th>
        </tr></thead>
        <tbody>
          ${items.map((item) => `<tr>
            <td>${item.product?.name ?? `Producto ${item.product_id.slice(0, 8)}`}${item.product?.sku ? `<span class="sku">SKU: ${item.product.sku}</span>` : ''}</td>
            <td class="r">${item.quantity}</td>
            <td class="r">${formatCurrency(item.unit_price)}</td>
            <td class="r disc">${item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '—'}</td>
            <td class="r">${formatCurrency(item.total_price)}</td>
          </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">Sin productos</td></tr>'}
        </tbody>
      </table>
      <div class="totals">
        <div class="tr muted"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${saleDiscount > 0 ? `<div class="tr disc"><span>Descuento</span><span>-${formatCurrency(saleDiscount)}</span></div>` : ''}
        ${totalTax > 0 ? `<div class="tr muted"><span>Impuesto</span><span>${formatCurrency(totalTax)}</span></div>` : ''}
        <div class="tr final"><span>Total</span><span>${formatCurrency(total)}</span></div>
      </div>
      <div class="footer">Generado el ${format(new Date(), "d/MM/yyyy 'a las' HH:mm", { locale: es })} · ID: ${sale.id}</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">

        {/* Radix requires DialogTitle for a11y — keep it sr-only since we render our own header */}
        <DialogHeader className="sr-only">
          <DialogTitle>Venta #{shortId}</DialogTitle>
          <DialogDescription>
            Detalle de la venta #{shortId} — productos, totales y acciones disponibles.
          </DialogDescription>
        </DialogHeader>

        {/* ── Visible header ── */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b shrink-0 pr-12">
          <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-base tracking-tight">Venta #{shortId}</span>
          <button
            onClick={copySaleId}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            title="Copiar ID completo"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <Badge variant={getStatusBadgeVariant(sale.status)} className="ml-auto">
            {formatStatus(sale.status)}
          </Badge>
        </div>

        {/* ── Info strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 px-6 py-4 bg-muted/30 border-b shrink-0 text-sm">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Fecha</p>
            <p className="font-medium">{format(new Date(sale.created_at), "d MMM yyyy", { locale: es })}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), "HH:mm", { locale: es })}</p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Cliente</p>
            {sale.customer ? (
              <>
                <p className="font-medium truncate">{sale.customer.name}</p>
                {(sale.customer.email || sale.customer.phone) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {sale.customer.phone ?? sale.customer.email}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">Sin cliente</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Pago</p>
            <p className="font-medium">{formatPaymentMethod(sale.payment_method)}</p>
            <p className="text-xs text-muted-foreground">{formatSaleType(sale.sale_type)}</p>
          </div>

          {sale.notes && (
            <div className="col-span-full">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Notas</p>
              <p className="italic text-muted-foreground">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Items section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Productos</span>
                {hasPartialReturns && (
                  <Badge variant="secondary" className="gap-1 text-xs py-0">
                    <RotateCw className="h-3 w-3" />
                    Con devoluciones
                  </Badge>
                )}
              </div>
              {(isError || itemsLoadError) && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => refetch()}>
                  <RefreshCw className="h-3 w-3" />
                  Reintentar
                </Button>
              )}
            </div>

            {/* Loading state — only if no fallback items available */}
            {isLoading && !hasItems ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>

            ) : (isError || itemsLoadError) && !hasItems ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>No se pudieron cargar los productos.</span>
              </div>

            ) : hasItems ? (
              <div className="rounded-md border divide-y">
                {items.map((item) => {
                  const returned = item.alreadyReturned ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      {/* Name + SKU */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight truncate">
                          {item.product?.name ?? `Producto ${item.product_id.slice(0, 8)}`}
                        </p>
                        {item.product?.sku && (
                          <p className="text-xs text-muted-foreground mt-0.5">SKU {item.product.sku}</p>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="shrink-0 text-center w-10">
                        <span className="font-medium">×{item.quantity}</span>
                        {returned > 0 && (
                          <p className="text-[10px] leading-tight text-amber-600 mt-0.5">
                            {returned} dev.
                          </p>
                        )}
                      </div>

                      {/* Unit price */}
                      <div className="shrink-0 w-20 text-right text-muted-foreground">
                        {formatCurrency(item.unit_price)}
                      </div>

                      {/* Discount (only shown when > 0) */}
                      {item.discount_amount > 0 ? (
                        <div className="shrink-0 w-16 text-right text-red-600 text-xs">
                          -{formatCurrency(item.discount_amount)}
                        </div>
                      ) : (
                        <div className="shrink-0 w-16 text-right text-muted-foreground/40">—</div>
                      )}

                      {/* Line total */}
                      <div className="shrink-0 w-20 text-right font-semibold">
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <p className="text-sm text-muted-foreground py-2">Sin productos registrados.</p>
            ) : null}
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-[260px] text-sm space-y-1.5 pt-1">
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
            <Separator className="my-0.5" />
            <div className="flex justify-between gap-8 font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleStartReturn}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Devolver
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
