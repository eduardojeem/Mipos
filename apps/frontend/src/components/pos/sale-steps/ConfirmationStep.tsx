'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, ShoppingCart, Percent, CreditCard, Package2 } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { PaymentMethod } from '@/types';
import type { CartItem } from '@/hooks/useCart';

interface ConfirmationStepProps {
  cart: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeDue?: number;
  transferReference?: string;
}

/**
 * Step 4: Final Confirmation
 * Displays complete sale summary before processing
 */
export function ConfirmationStep({
  cart,
  subtotal,
  taxAmount,
  discountAmount,
  grandTotal,
  paymentMethod,
  cashReceived,
  changeDue,
  transferReference,
}: ConfirmationStepProps) {
  const fmtCurrency = useCurrencyFormatter();

  const paymentMethodLabels = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CARD]: 'Tarjeta',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.OTHER]: 'Otro',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Confirmar venta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Products summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Productos ({cart.length})</span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {cart.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                <span className="truncate flex-1">
                  {item.quantity}x {item.product_name}
                </span>
                <span className="font-medium ml-2">{fmtCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Financial summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{fmtCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA</span>
            <span className="font-medium">{fmtCurrency(taxAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Descuento
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                -{fmtCurrency(discountAmount)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{fmtCurrency(grandTotal)}</span>
          </div>
        </div>

        <Separator />

        {/* Payment details */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Método de pago</span>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Método</span>
              <Badge variant="outline">{paymentMethodLabels[paymentMethod]}</Badge>
            </div>
            {paymentMethod === PaymentMethod.CASH && cashReceived !== undefined && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Efectivo recibido</span>
                  <span className="font-medium">{fmtCurrency(cashReceived)}</span>
                </div>
                {changeDue !== undefined && changeDue > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cambio</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {fmtCurrency(changeDue)}
                    </span>
                  </div>
                )}
              </>
            )}
            {paymentMethod === PaymentMethod.TRANSFER && transferReference && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Referencia</span>
                <span className="font-mono text-xs">{transferReference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Final message */}
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-900 dark:text-green-100 text-center">
            ✓ Revisa los detalles y confirma para procesar la venta
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
