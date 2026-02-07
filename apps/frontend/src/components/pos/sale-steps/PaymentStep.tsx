'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote, Smartphone, Wallet } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentStepProps {
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  grandTotal: number;
  cashReceived: number;
  onCashReceivedChange: (amount: number) => void;
  changeDue: number;
  transferReference: string;
  onTransferReferenceChange: (ref: string) => void;
}

/**
 * Step 3: Payment Method Selection
 * Handles payment method selection and cash/transfer details
 */
export function PaymentStep({
  selectedPaymentMethod,
  onPaymentMethodChange,
  grandTotal,
  cashReceived,
  onCashReceivedChange,
  changeDue,
  transferReference,
  onTransferReferenceChange,
}: PaymentStepProps) {
  const fmtCurrency = useCurrencyFormatter();

  const paymentMethods = [
    { value: PaymentMethod.CASH, label: 'Efectivo', icon: Banknote, color: 'bg-green-500' },
    { value: PaymentMethod.CARD, label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-500' },
    { value: PaymentMethod.TRANSFER, label: 'Transferencia', icon: Smartphone, color: 'bg-purple-500' },
    { value: PaymentMethod.OTHER, label: 'Otro', icon: Wallet, color: 'bg-gray-500' },
  ];

  // Quick cash amounts
  const quickAmounts = [
    grandTotal,
    Math.ceil(grandTotal / 10000) * 10000,
    Math.ceil(grandTotal / 20000) * 20000,
    Math.ceil(grandTotal / 50000) * 50000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= grandTotal);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Método de pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment method selection */}
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPaymentMethod === method.value;

            return (
              <button
                key={method.value}
                onClick={() => onPaymentMethodChange(method.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', method.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium">{method.label}</span>
                {isSelected && (
                  <Badge variant="default" className="text-xs">
                    Seleccionado
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Cash payment details */}
        {selectedPaymentMethod === PaymentMethod.CASH && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Efectivo recibido</Label>
              <Input
                type="number"
                min={grandTotal}
                step="1000"
                value={cashReceived || ''}
                onChange={(e) => onCashReceivedChange(Number(e.target.value))}
                placeholder={fmtCurrency(grandTotal)}
                className="text-lg font-semibold"
              />
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => onCashReceivedChange(amount)}
                  className="text-xs"
                >
                  {fmtCurrency(amount)}
                </Button>
              ))}
            </div>

            {/* Change due */}
            {cashReceived >= grandTotal && (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <span className="text-sm font-medium">Cambio a devolver</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {fmtCurrency(changeDue)}
                </span>
              </div>
            )}

            {cashReceived > 0 && cashReceived < grandTotal && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <span className="text-sm font-medium text-destructive">Falta</span>
                <span className="text-lg font-bold text-destructive">
                  {fmtCurrency(grandTotal - cashReceived)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Transfer payment details */}
        {selectedPaymentMethod === PaymentMethod.TRANSFER && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Referencia de transferencia</Label>
              <Input
                type="text"
                value={transferReference}
                onChange={(e) => onTransferReferenceChange(e.target.value)}
                placeholder="Ej: TRF-123456"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el número de referencia o comprobante de la transferencia
              </p>
            </div>
          </div>
        )}

        {/* Total to pay */}
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">Total a pagar</span>
          <span className="text-2xl font-bold text-primary">
            {fmtCurrency(grandTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
