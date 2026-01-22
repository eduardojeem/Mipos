"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Receipt, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { getFreeShippingThreshold } from '@/lib/pos/calculations';

interface CartSummaryProps {
  subtotalWithIva: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  shippingCost?: number;
}

export function CartSummary({ subtotalWithIva, taxAmount, discountAmount, total, shippingCost }: CartSummaryProps) {
  const { config } = useBusinessConfig();
  const fmtCurrency = useCurrencyFormatter();
  const threshold = getFreeShippingThreshold(config);
  const isFreeShipping = threshold > 0 && Number(subtotalWithIva) >= threshold;
  const hasShippingValue = shippingCost !== undefined && shippingCost !== null;
  const appliedShipping = isFreeShipping ? 0 : (hasShippingValue ? Math.max(0, Number(shippingCost) || 0) : null);
  const finalTotal = appliedShipping != null ? Number(total) + Number(appliedShipping) : Number(total);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/20 dark:border-primary/30">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base flex items-center space-x-2 text-foreground dark:text-foreground">
          <Receipt className="h-4 w-4" />
          <span>Resumen de la venta</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground dark:text-muted-foreground">Subtotal:</span>
            <span className="font-medium text-foreground dark:text-foreground">{fmtCurrency(subtotalWithIva)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground dark:text-muted-foreground">
            <span>IVA incluido:</span>
            <span>{fmtCurrency(taxAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-destructive dark:text-destructive text-sm">
              <span>Descuento aplicado:</span>
              <span className="font-medium">-{fmtCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Envío:</span>
            <span className="font-medium">
              {isFreeShipping
                ? 'Gratis'
                : (appliedShipping == null ? 'A definir' : fmtCurrency(appliedShipping))}
            </span>
          </div>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-foreground dark:text-foreground">TOTAL A PAGAR:</span>
          <span className="text-xl font-bold text-primary dark:text-primary">{fmtCurrency(finalTotal)}</span>
        </div>
        <div className="text-xs text-muted-foreground dark:text-muted-foreground text-center mt-1">
          * Subtotal incluye IVA{isFreeShipping ? ' • Envío gratis' : ' • Envío configurable al cobrar'}
        </div>
      </CardContent>
    </Card>
  );
}