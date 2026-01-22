'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, Share2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Sale } from '@/types';

interface SaleModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SaleModal({ sale, isOpen, onClose }: SaleModalProps) {
  if (!sale) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('sale-modal-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detalle de Venta #${sale.id.slice(-8).toUpperCase()}</title>
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
            <h1>Detalle de Venta #${sale.id.slice(-8).toUpperCase()}</h1>
            <p>Fecha: ${formatDate(sale.created_at)}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-section">
              <div class="info-label">Cliente:</div>
              <div>${sale.customer?.name || 'Cliente general'}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Método de Pago:</div>
              <div>${getPaymentMethodText(sale.payment_method)}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Estado:</div>
              <div>${getStatusText(sale.status)}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Vendedor:</div>
              <div>${sale.user?.name || 'N/A'}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items?.map(item => `
                <tr>
                  <td>${item.product?.name || 'Producto'}</td>
                  <td>${item.product?.sku || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unit_price)}</td>
                  <td>${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5">No hay productos</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(sale.total_amount - sale.tax_amount)}</span>
            </div>
            ${sale.discount_amount > 0 ? `
              <div class="total-row">
                <span>Descuento:</span>
                <span>-${formatCurrency(sale.discount_amount)}</span>
              </div>
            ` : ''}
            ${sale.tax_amount > 0 ? `
              <div class="total-row">
                <span>Impuestos:</span>
                <span>${formatCurrency(sale.tax_amount)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span>Total:</span>
              <span>${formatCurrency(sale.total_amount)}</span>
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
      title: `Detalle de Venta #${sale.id.slice(-8).toUpperCase()}`,
      text: `Venta realizada el ${formatDate(sale.created_at)} por un total de ${formatCurrency(sale.total_amount)}`,
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
    const shareText = `Detalle de Venta #${sale.id.slice(-8).toUpperCase()}\n` +
      `Fecha: ${formatDate(sale.created_at)}\n` +
      `Cliente: ${sale.customer?.name || 'Cliente general'}\n` +
      `Total: ${formatCurrency(sale.total_amount)}\n` +
      `Estado: ${getStatusText(sale.status)}`;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'CARD':
        return 'Tarjeta';
      case 'TRANSFER':
        return 'Transferencia';
      case 'OTHER':
        return 'Otro';
      default:
        return method;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la Venta #{sale.id.slice(-8).toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div id="sale-modal-content" className="space-y-6">
          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de la Venta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID de Venta</p>
                  <p className="font-medium">#{sale.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{sale.customer?.name || 'Cliente general'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(sale.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={getStatusColor(sale.status)}>
                    {getStatusText(sale.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <p className="font-medium">{getPaymentMethodText(sale.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{sale.user?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">{formatCurrency(sale.total_amount - sale.tax_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(sale.total_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sale Items */}
          {sale.items && sale.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Productos Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sale.items.map((item, index) => (
                    <div key={item.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product?.name || 'Producto'}</h4>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.product?.sku || 'N/A'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Cantidad</p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Precio Unit.</p>
                        <p className="font-medium">{formatCurrency(item.unit_price)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-bold">{formatCurrency(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.total_amount - sale.tax_amount)}</span>
                </div>
                {sale.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(sale.discount_amount)}</span>
                  </div>
                )}
                {sale.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Impuestos:</span>
                    <span>{formatCurrency(sale.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(sale.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {sale.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{sale.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
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