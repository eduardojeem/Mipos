'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, User, Calendar, DollarSign, CreditCard, Package, Hash, Printer, Share2 } from 'lucide-react';
import { Sale } from './SalesDataTable';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    case 'REFUNDED':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'Completada';
    case 'PENDING':
      return 'Pendiente';
    case 'CANCELLED':
      return 'Cancelada';
    case 'REFUNDED':
      return 'Reembolsada';
    default:
      return status;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'CASH':
      return 'Efectivo';
    case 'CARD':
      return 'Tarjeta';
    case 'TRANSFER':
      return 'Transferencia';
    case 'DIGITAL_WALLET':
      return 'Billetera Digital';
    case 'OTHER':
      return 'Otro';
    default:
      return method;
  }
};

const getSaleTypeLabel = (type: string) => {
  switch (type) {
    case 'RETAIL':
      return 'Minorista';
    case 'WHOLESALE':
      return 'Mayorista';
    default:
      return type;
  }
};

export function SaleDetailModal({ sale, open, onClose }: SaleDetailModalProps) {
  if (!sale) return null;

  const subtotal = sale.items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  const totalDiscount = (sale.discount_amount || 0) + (sale.items?.reduce((sum, item) => sum + (item.discount_amount || 0), 0) || 0);
  const totalTax = sale.tax_amount || 0;
  const total = sale.total_amount;

  const handlePrint = () => {
    const printContent = document.getElementById('sale-detail-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detalle de Venta #${sale.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-section { margin-bottom: 15px; }
            .info-label { font-weight: bold; margin-bottom: 5px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total-final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Detalle de Venta #${sale.id}</h1>
            <p>Fecha: ${format(new Date(sale.created_at), 'PPP', { locale: es })}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-section">
              <div class="info-label">Cliente:</div>
              <div>${sale.customer ? `${sale.customer.name}${sale.customer.email ? ` (${sale.customer.email})` : ''}` : 'Cliente no registrado'}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Método de Pago:</div>
              <div>${getPaymentMethodLabel(sale.payment_method)}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Estado:</div>
              <div>${getStatusLabel(sale.status)}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Tipo de Venta:</div>
              <div>${getSaleTypeLabel(sale.sale_type)}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Descuento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items?.map(item => `
                <tr>
                  <td>
                    ${item.product?.name || `Producto ${item.product_id}`}
                    ${item.product?.sku ? `<br><small>SKU: ${item.product.sku}</small>` : ''}
                  </td>
                  <td>${item.quantity}</td>
                  <td>$${item.unit_price.toFixed(2)}</td>
                  <td>${item.discount_amount > 0 ? `$${item.discount_amount.toFixed(2)}` : '-'}</td>
                  <td>$${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5">No hay productos</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${totalDiscount > 0 ? `
              <div class="total-row">
                <span>Descuento:</span>
                <span>-$${totalDiscount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${totalTax > 0 ? `
              <div class="total-row">
                <span>Impuesto:</span>
                <span>$${totalTax.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>

          ${sale.notes ? `
            <div style="margin-top: 20px;">
              <div class="info-label">Notas:</div>
              <div>${sale.notes}</div>
            </div>
          ` : ''}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleShare = async () => {
    const shareData = {
      title: `Detalle de Venta #${sale.id}`,
      text: `Venta realizada el ${format(new Date(sale.created_at), 'PPP', { locale: es })} por un total de $${total.toFixed(2)}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    const shareText = `Detalle de Venta #${sale.id}\n` +
      `Fecha: ${format(new Date(sale.created_at), 'PPP', { locale: es })}\n` +
      `Cliente: ${sale.customer ? sale.customer.name : 'Cliente no registrado'}\n` +
      `Total: $${total.toFixed(2)}\n` +
      `Estado: ${getStatusLabel(sale.status)}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Información de la venta copiada al portapapeles');
      }).catch(() => {
        promptShare(shareText);
      });
    } else {
      promptShare(shareText);
    }
  };

  const promptShare = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Información de la venta copiada al portapapeles');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Detalles de la Venta #{sale.id}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div id="sale-detail-content" className="space-y-6">
          {/* Sale Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Cliente</p>
                  {sale.customer ? (
                    <div>
                      <p className="text-sm">{sale.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{sale.customer.email}</p>
                      {sale.customer.phone && (
                        <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Cliente no registrado</p>
                  )}
                </div>
              </div>

              {/* Date Info */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Fecha y Hora</p>
                  <p className="text-sm">
                    {format(new Date(sale.created_at), 'PPP', { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.created_at), 'p', { locale: es })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Payment Info */}
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Información de Pago</p>
                  <p className="text-sm">{getPaymentMethodLabel(sale.payment_method)}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(sale.status)}>
                      {getStatusLabel(sale.status)}
                    </Badge>
                    <Badge variant="outline">
                      {getSaleTypeLabel(sale.sale_type)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Total Info */}
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Total</p>
                  <p className="text-2xl font-bold">${sale.total_amount.toFixed(2)}</p>
                  {sale.notes && (
                    <p className="text-xs text-muted-foreground italic">{sale.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <h3 className="font-medium">Productos</h3>
            </div>

            {sale.items && sale.items.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Producto</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Cantidad</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Precio Unit.</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Descuento</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, index) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2 text-sm">
                          <div>
                            <p className="font-medium">
                              {item.product?.name || `Producto ${item.product_id}`}
                            </p>
                            {item.product?.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {item.discount_amount > 0 ? `$${item.discount_amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          ${item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay productos en esta venta</p>
            )}
          </div>

          <Separator />

          {/* Totals Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Descuento:</span>
                <span className="text-red-600">-${totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Impuesto:</span>
                <span>${totalTax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {sale.updated_at !== sale.created_at && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                Última actualización: {format(new Date(sale.updated_at), 'PPp', { locale: es })}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}