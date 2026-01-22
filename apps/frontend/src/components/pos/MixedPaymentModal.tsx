'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { toast } from '@/lib/toast';
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Calculator, 
  CheckCircle, 
  AlertTriangle,
  Wallet
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  amount: number;
  details?: {
    lastFourDigits?: string;
    cardType?: string;
    authorizationCode?: string;
    reference?: string;
  };
}

interface MixedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentComplete: (payments: PaymentMethod[], cashReceived: number, change: number) => void;
}

export default function MixedPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onPaymentComplete
}: MixedPaymentModalProps) {
  const fmtCurrency = useCurrencyFormatter();
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [cashReceived, setCashReceived] = useState(0);
  const [change, setChange] = useState(0);

  // Calcular total pagado
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = totalPaid >= totalAmount;

  // Calcular vuelto solo para pagos en efectivo
  useEffect(() => {
    const cashPayment = payments.find(p => p.type === 'CASH');
    if (cashPayment && totalPaid >= totalAmount) {
      setChange(totalPaid - totalAmount);
      setCashReceived(cashPayment.amount);
    } else {
      setChange(0);
      setCashReceived(0);
    }
  }, [payments, totalPaid, totalAmount]);

  const addPayment = useCallback(() => {
    if (remainingAmount <= 0) return;
    
    const newPayment: PaymentMethod = {
      id: Date.now().toString(),
      type: 'CASH',
      amount: remainingAmount,
      details: {}
    };
    
    setPayments(prev => [...prev, newPayment]);
  }, [remainingAmount]);

  const updatePayment = useCallback((id: string, updates: Partial<PaymentMethod>) => {
    setPayments(prev => prev.map(payment => 
      payment.id === id ? { ...payment, ...updates } : payment
    ));
  }, []);

  const removePayment = useCallback((id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id));
  }, []);

  const validatePayments = useCallback(() => {
    if (payments.length === 0) {
      toast.error('Debe agregar al menos un método de pago');
      return false;
    }

    if (totalPaid < totalAmount) {
      toast.error(`Faltan ${fmtCurrency(totalAmount - totalPaid)} para completar el pago`);
      return false;
    }

    // Validar detalles específicos por tipo de pago
    for (const payment of payments) {
      if (payment.type === 'CARD') {
        if (payment.details?.lastFourDigits && payment.details.lastFourDigits.length !== 4) {
          toast.error('Los últimos 4 dígitos de la tarjeta deben ser 4 números');
          return false;
        }
      }
    }

    return true;
  }, [payments, totalPaid, totalAmount]);

  const handleConfirmPayment = () => {
    if (!validatePayments()) return;
    
    onPaymentComplete(payments, cashReceived, change);
  };

  const getPaymentIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'CASH': return <DollarSign className="w-4 h-4" />;
      case 'CARD': return <CreditCard className="w-4 h-4" />;
      case 'TRANSFER': return <Banknote className="w-4 h-4" />;
      case 'OTHER': return <Wallet className="w-4 h-4" />;
    }
  };

  const getPaymentTypeLabel = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'CASH': return 'Efectivo';
      case 'CARD': return 'Tarjeta';
      case 'TRANSFER': return 'Transferencia';
      case 'OTHER': return 'Otro';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Pago Mixto
          </DialogTitle>
          <DialogDescription>
            Combina diferentes métodos de pago para completar la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen de la venta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumen de Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Total a pagar:</span>
                <span className="font-semibold">{fmtCurrency(totalAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium text-foreground dark:text-foreground">Total pagado:</span>
                <span className={`font-semibold ${totalPaid >= totalAmount ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {fmtCurrency(totalPaid)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground dark:text-foreground">Pendiente:</span>
                <span className={remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}>
                  {fmtCurrency(remainingAmount)}
                </span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded">
                  <span className="text-foreground dark:text-foreground">Vuelto:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{fmtCurrency(change)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métodos de pago */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Métodos de Pago</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addPayment}
                disabled={remainingAmount <= 0}
                className="items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <Wallet className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No hay métodos de pago agregados</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPayment}
                  className="mt-3"
                >
                  Agregar primer pago
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Card key={payment.id} className="p-4 bg-card dark:bg-card border-border dark:border-border">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(payment.type)}
                          <select
                            value={payment.type}
                            onChange={(e) => updatePayment(payment.id, { type: e.target.value as PaymentMethod['type'] })}
                            className="text-sm font-medium border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-foreground dark:text-foreground"
                          >
                            <option value="CASH">💵 Efectivo</option>
                            <option value="CARD">💳 Tarjeta</option>
                            <option value="TRANSFER">🏦 Transferencia</option>
                            <option value="OTHER">❓ Otro</option>
                          </select>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePayment(payment.id)}
                          className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Monto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payment.amount}
                            onChange={(e) => updatePayment(payment.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="text-sm"
                            placeholder="0.00"
                          />
                        </div>

                        {payment.type === 'CARD' && (
                          <div>
                            <Label className="text-xs">Últimos 4 dígitos</Label>
                            <Input
                              type="text"
                              maxLength={4}
                              placeholder="1234"
                              value={payment.details?.lastFourDigits || ''}
                              onChange={(e) => updatePayment(payment.id, { 
                                details: { ...payment.details, lastFourDigits: e.target.value.replace(/\D/g, '') }
                              })}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {payment.type === 'TRANSFER' && (
                          <div>
                            <Label className="text-xs">Referencia</Label>
                            <Input
                              type="text"
                              placeholder="Número de referencia"
                              value={payment.details?.reference || ''}
                              onChange={(e) => updatePayment(payment.id, { 
                                details: { ...payment.details, reference: e.target.value }
                              })}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="flex-1"
              disabled={!isFullyPaid}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}