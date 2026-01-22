'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calculateCartWithIva } from '@/lib/pos/calculations';
import { salesAPI, type CreateSaleData, type SaleResponse, type CashCalculationResponse } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { Loader2, DollarSign, Banknote, CheckCircle, AlertTriangle, Percent, Tag } from 'lucide-react';
import MixedPaymentModal from './MixedPaymentModal';

interface SaleProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
    product?: any;
  }>;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  customerId?: string;
  notes?: string;
  onSaleComplete: (sale: SaleResponse) => void;
}

export default function SaleProcessingModal({
  isOpen,
  onClose,
  cart,
  totalAmount,
  taxAmount,
  discountAmount,
  paymentMethod,
  discount,
  discountType,
  customerId,
  notes,
  onSaleComplete
}: SaleProcessingModalProps) {
  const fmtCurrency = useCurrencyFormatter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [change, setChange] = useState(0);
  const [requiresChange, setRequiresChange] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardType, setCardType] = useState('');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [showMixedPayment, setShowMixedPayment] = useState(false);
  const [mixedPayments, setMixedPayments] = useState<any[]>([]);
  const [mixedCashReceived, setMixedCashReceived] = useState(0);
  const [mixedChange, setMixedChange] = useState(0);
  const [localDiscount, setLocalDiscount] = useState<number>(discount || 0);
  const [localDiscountType, setLocalDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(discountType || 'PERCENTAGE');
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' } | null>(null);

  // Calcular vuelto automáticamente para pagos en efectivo
  useEffect(() => {
    if (paymentMethod === 'CASH' && cashReceived) {
      const cash = parseFloat(cashReceived) || 0;
      if (cash >= totalAmount) {
        setChange(cash - totalAmount);
        setRequiresChange(false);
      } else {
        setChange(0);
        setRequiresChange(true);
      }
    } else {
      setChange(0);
      setRequiresChange(false);
    }
  }, [cashReceived, totalAmount, paymentMethod]);

  const validateForm = useCallback(() => {
    if (paymentMethod === 'CASH') {
      const cash = parseFloat(cashReceived) || 0;
      if (cash < totalAmount) {
        toast.error('El efectivo recibido debe ser mayor o igual al total');
        return false;
      }
    }

    if (paymentMethod === 'CARD') {
      if (cardLastFour && (cardLastFour.length !== 4 || !/^\d{4}$/.test(cardLastFour))) {
        toast.error('Los últimos 4 dígitos de la tarjeta deben ser números');
        return false;
      }
    }

    return true;
  }, [paymentMethod, cashReceived, totalAmount, cardLastFour]);

  const prepareSaleData = useCallback((): CreateSaleData => {
    const saleData: CreateSaleData = {
      items: cart.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      paymentMethod,
      discount: localDiscount,
      discountType: localDiscountType,
      tax: taxAmount,
      notes
    };

    if (customerId) {
      saleData.customerId = customerId;
    }

    // Agregar detalles específicos del método de pago
    if (paymentMethod === 'CASH' && cashReceived) {
      saleData.cashReceived = parseFloat(cashReceived);
    }

    if (paymentMethod === 'CARD' && (cardLastFour || cardType || authorizationCode)) {
      saleData.cardDetails = {
        lastFourDigits: cardLastFour || undefined,
        cardType: cardType || undefined,
        authorizationCode: authorizationCode || undefined
      };
    }

    return saleData;
  }, [cart, paymentMethod, localDiscount, localDiscountType, taxAmount, notes, customerId, cashReceived, cardLastFour, cardType, authorizationCode]);

  const handleProcessSale = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setSaleError(null);

    try {
      // Validar stock antes de procesar
      const stockValidation = await salesAPI.validateStock(
        cart.map(item => ({ productId: item.product_id, quantity: item.quantity }))
      );

      if (!stockValidation.valid) {
        const invalidItems = stockValidation.invalidItems.map(item => 
          `- ${item.productId}: Stock disponible ${item.availableStock}, solicitado ${item.requestedQuantity}`
        ).join('\n');
        throw new Error(`Stock insuficiente para los siguientes productos:\n${invalidItems}`);
      }

      // Preparar y enviar datos de la venta
      const saleData = prepareSaleData();
      const saleResponse = await salesAPI.createSale(saleData);

      toast.success('¡Venta procesada exitosamente!');
      onSaleComplete(saleResponse);
      onClose();

    } catch (error) {
      console.error('Error processing sale:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la venta';
      setSaleError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMixedPaymentComplete = (payments: any[], cashReceived: number, change: number) => {
    setMixedPayments(payments);
    setMixedCashReceived(cashReceived);
    setMixedChange(change);
    setShowMixedPayment(false);
    
    // Procesar la venta con pagos mixtos
    handleProcessSaleWithMixedPayments(payments, cashReceived, change);
  };

  const handleProcessSaleWithMixedPayments = async (payments: any[], cashReceived: number, change: number) => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setSaleError(null);

    try {
      // Validar stock antes de procesar
      const stockValidation = await salesAPI.validateStock(
        cart.map(item => ({ productId: item.product_id, quantity: item.quantity }))
      );

      if (!stockValidation.valid) {
        const invalidItems = stockValidation.invalidItems.map(item => 
          `- ${item.productId}: Stock disponible ${item.availableStock}, solicitado ${item.requestedQuantity}`
        ).join('\n');
        throw new Error(`Stock insuficiente para los siguientes productos:\n${invalidItems}`);
      }

      // Preparar datos de la venta con pagos mixtos
      const saleData: CreateSaleData = {
        items: cart.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        paymentMethod: 'MIXED', // Método mixto especial
        discount,
        discountType,
        tax: taxAmount,
        notes,
        mixedPayments: payments.map(p => ({
          type: p.type,
          amount: p.amount,
          details: p.details
        })),
        cashReceived,
        change
      };

      if (customerId) {
        saleData.customerId = customerId;
      }

      const saleResponse = await salesAPI.createSale(saleData);

      toast.success('¡Venta procesada exitosamente con pago mixto!');
      onSaleComplete(saleResponse);
      onClose();

    } catch (error) {
      console.error('Error processing sale:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la venta';
      setSaleError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentFields = () => {
    switch (paymentMethod) {
      case 'CASH':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cash-received" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Efectivo Recibido
              </Label>
              <Input
                id="cash-received"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="mt-1"
                disabled={isProcessing}
              />
            </div>
            
            {cashReceived && (
              <div className={`p-3 rounded-lg border ${requiresChange ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Vuelto:</span>
                  <span className={`text-lg font-bold ${requiresChange ? 'text-red-600' : 'text-green-600'}`}>
                    {fmtCurrency(change)}
                  </span>
                </div>
                {requiresChange && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    El efectivo es insuficiente
                  </p>
                )}
              </div>
            )}

            {/* Botón para pago mixto */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMixedPayment(true)}
              className="w-full items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Cambiar a Pago Mixto
            </Button>
          </div>
        );

      case 'CARD':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="card-last-four">Últimos 4 dígitos</Label>
                <Input
                  id="card-last-four"
                  type="text"
                  maxLength={4}
                  placeholder="1234"
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <Label htmlFor="card-type">Tipo de Tarjeta</Label>
                <select
                  id="card-type"
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={isProcessing}
                >
                  <option value="">Seleccionar</option>
                  <option value="VISA">Visa</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="AMEX">American Express</option>
                  <option value="OTHER">Otra</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="auth-code">Código de Autorización</Label>
              <Input
                id="auth-code"
                type="text"
                placeholder="Código de autorización (opcional)"
                value={authorizationCode}
                onChange={(e) => setAuthorizationCode(e.target.value)}
                className="mt-1"
                disabled={isProcessing}
              />
            </div>
          </div>
        );

      case 'TRANSFER':
        return (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <Banknote className="w-4 h-4" />
              <span className="font-medium">Transferencia Bancaria</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Asegúrese de verificar el pago antes de completar la venta.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Procesar Venta
            </DialogTitle>
            <DialogDescription>
              Confirme los detalles de la venta antes de procesar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen de la venta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resumen de Venta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{fmtCurrency(totalAmount - taxAmount + discountAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento:</span>
                    <span>-{fmtCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>IVA:</span>
                  <span>{fmtCurrency(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{fmtCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Método de Pago:</span>
                  <Badge variant="outline">
                    {paymentMethod === 'CASH' && '💵 Efectivo'}
                    {paymentMethod === 'CARD' && '💳 Tarjeta'}
                    {paymentMethod === 'TRANSFER' && '🏦 Transferencia'}
                    {paymentMethod === 'OTHER' && '❓ Otro'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Descuento y cupón */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Percent className="w-4 h-4" /> Descuento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Descuento"
                    value={localDiscount}
                    onChange={(e) => setLocalDiscount(Number(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <select
                    value={localDiscountType}
                    onChange={(e) => setLocalDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
                    className="px-2 py-2 border border-gray-200 rounded text-sm"
                  >
                    <option value="PERCENTAGE">%</option>
                    <option value="FIXED_AMOUNT">$</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="coupon-code" className="text-sm font-medium flex items-center gap-1"><Tag className="w-3 h-3" /> Cupón</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="coupon-code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Código de cupón"
                      className="flex-1"
                      disabled={couponLoading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={couponLoading}
                      onClick={async () => {
                        const code = couponCode.trim().toUpperCase();
                        if (!code) { setCouponMessage('Ingresa un código'); return; }
                        try {
                          setCouponLoading(true);
                          setCouponMessage('');
                          const subtotalWithIva = totalAmount + (discountAmount || 0);
                          const payload = { code, subtotal: subtotalWithIva, customerId };
                          const res = await fetch('/api/coupons/validate', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok || data?.success === false) {
                            const msg = data?.message || data?.error || 'Cupón inválido';
                            setCouponMessage(String(msg));
                            return;
                          }
                          const result = data?.data ?? data;
                          const discountTypeServer = (result?.discountType ?? 'PERCENTAGE') as 'PERCENTAGE' | 'FIXED_AMOUNT';
                          const discountAmountServer = Number(result?.discountAmount ?? 0);
                          if (!discountAmountServer || discountAmountServer <= 0) {
                            const msg = 'El cupón no aplica descuento';
                            setCouponMessage(msg);
                            return;
                          }
                          setAppliedCoupon({ code, discountAmount: discountAmountServer, discountType: discountTypeServer });
                          setLocalDiscountType(discountTypeServer);
                          setLocalDiscount(discountAmountServer);
                        } catch (error: any) {
                          setCouponMessage(error?.message || 'Error al validar cupón');
                        } finally {
                          setCouponLoading(false);
                        }
                      }}
                    >Aplicar</Button>
                    {appliedCoupon && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage(''); setLocalDiscount(0); setLocalDiscountType('PERCENTAGE'); }}
                      >Limpiar</Button>
                    )}
                  </div>
                  {couponMessage && <p className="text-xs text-destructive mt-1">{couponMessage}</p>}
                  {appliedCoupon && (
                    <p className="text-xs text-green-700 mt-1">
                      Cupón aplicado: {appliedCoupon.code} ({appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountAmount}%` : fmtCurrency(appliedCoupon.discountAmount)})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campos de pago específicos */}
            {renderPaymentFields()}

            {/* Error de procesamiento */}
            {saleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{saleError}</p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleProcessSale}
                className="flex-1"
                disabled={isProcessing || (paymentMethod === 'CASH' && requiresChange)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Venta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mixed Payment Modal */}
      <MixedPaymentModal
        isOpen={showMixedPayment}
        onClose={() => setShowMixedPayment(false)}
        totalAmount={totalAmount}
        onPaymentComplete={handleMixedPaymentComplete}
      />
    </>
  );
}