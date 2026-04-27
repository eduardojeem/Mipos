'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Calendar, DollarSign, CreditCard, Package, Hash, Printer } from 'lucide-react';
import { Sale } from './SalesDataTable';
import { createLogger } from '@/lib/logger';
import { formatStatus, formatPaymentMethod, formatSaleType, getStatusBadgeVariant } from '@/lib/sales-formatters';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

const logger = createLogger('SaleDetailModal');

export function SaleDetailModal({ sale, open, onClose }: SaleDetailModalProps) {
  if (!sale) return null;

  const subtotal = sale.items?.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) || 0;
  const totalDiscount =
    (sale.discount_amount || 0) +
    (sale.items?.reduce((sum, item) => sum + (item.discount_amount || 0), 0) || 0);
  const totalTax = sale.tax_amount || 0;
  const total = sale.total_amount;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Venta #${sale.id}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:20px}
          table{width:100%;border-collapse:collapse;margin:16px 0}
          th,td{border:1px solid #ddd;padding:8px;text-align:left}
          th{background:#f5f5f5}
          .total-row{display:flex;justify-content:space-between;margin:4px 0}
          .total-final{font-weight:bold;font-size:1.1em;border-top:2px solid #000;padding-top:8px}
        </style>
      </head><body>
        <h2>Venta #${sale.id}</h2>
        <p>Fecha: ${format(new Date(sale.created_at), 'PPP p', { locale: es })}</p>
        <p>Cliente: ${sale.customer ? sale.customer.name : 'Sin cliente'}</p>
        <p>Método: ${formatPaymentMethod(sale.payment_method)} | Estado: ${formatStatus(sale.status)}</p>
        <table>
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
          <tbody>
            ${
              sale.items
                ?.map(
                  (item) =>
                    `<tr>
                      <td>${item.product?.name || item.product_id}${item.product?.sku ? ` (${item.product.sku})` : ''}</td>
                      <td>${item.quantity}</td>
                      <td>${item.unit_price.toFixed(2)}</td>
                      <td>${item.total_price.toFixed(2)}</td>
                    </tr>`,
                )
                .join('') || '<tr><td colspan="4">Sin productos</td></tr>'
            }
          </tbody>
        </table>
        <div class="total-row"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
        ${totalDiscount > 0 ? `<div class="total-row"><span>Descuento:</span><span>-${totalDiscount.toFixed(2)}</span></div>` : ''}
        ${totalTax > 0 ? `<div class="total-row"><span>Impuesto:</span><span>${totalTax.toFixed(2)}</span></div>` : ''}
        <div class="total-row total-final"><span>Total:</span><span>${total.toFixed(2)}</span></div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleCopyInfo = () => {
    const text = [
      `Venta #${sale.id}`,
      `Fecha: ${format(new Date(sale.created_at), 'PPP p', { locale: es })}`,
      `Cliente: ${sale.customer?.name || 'Sin cliente'}`,
      `Total: ${total.toFixed(2)}`,
      `Estado: ${formatStatus(sale.status)}`,
    ].join('\n');

    navigator.clipboard?.writeText(text).catch(() => {
      logger.log('Clipboard not available');
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Venta #{sale.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left column */}
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

            {/* Right column */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Pago</p>
                  <p className="text-sm">{formatPaymentMethod(sale.payment_method)}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={getStatusBadgeVariant(sale.status)}>
                      {formatStatus(sale.status)}
                    </Badge>
                    <Badge variant="outline">{formatSaleType(sale.sale_type)}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Total</p>
                  <p className="text-2xl font-bold">${total.toFixed(2)}</p>
                  {sale.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">{sale.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5" />
              <h3 className="font-medium">Productos</h3>
            </div>

            {sale.items && sale.items.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
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
                    {sale.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2">
                          <p className="font-medium">{item.product?.name || `Producto ${item.product_id.slice(0, 8)}`}</p>
                          {item.product?.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          {item.discount_amount > 0 ? `-$${item.discount_amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">${item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin productos (carga el detalle para verlos)</p>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impuesto</span>
                <span>${totalTax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
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
