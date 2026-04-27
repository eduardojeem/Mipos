'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { calculateCartWithIva, type DiscountType } from '@/lib/pos/calculations';
import { validateDiscount } from '@/lib/pos/validation';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { Product, Customer } from '@/types';
import { PaymentMethod } from '@/types';
import type { CartItem } from '@/hooks/useCart';
import {
  AlertTriangle, CheckCircle, Percent, Receipt,
  Package2, CreditCard, Banknote, Smartphone, Wallet, QrCode, Trash2,
} from 'lucide-react';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { usePOSStore } from '@/store';
import { cn } from '@/lib/utils';
import { INTERNAL_TICKET_DISCLAIMER } from '@/lib/pos/internal-ticket';
import Image from 'next/image';

interface ProcessSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  initialDiscount: number;
  initialDiscountType: DiscountType;
  onConfirm: (
    discount: number,
    discountType: DiscountType,
    paymentDetails?: {
      paymentMethod?: PaymentMethod;
      transferReference?: string;
      cashReceived?: number;
      change?: number;
      mixedPayments?: Array<{
        type: PaymentMethod;
        amount: number;
        details?: { reference?: string };
      }>;
    },
    options?: { autoPrint?: boolean }
  ) => Promise<void> | void;
  customer?: Customer | null;
  paymentMethod?: PaymentMethod;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
  enableSplitPayment?: boolean;
  enableQuickPayment?: boolean;
  onRemoveItem?: (productId: string) => void;
  customers?: Customer[];
  onSelectCustomer?: (customer: Customer | null) => void;
}

// --- Payment method config ---
const PAYMENT_METHODS = [
  { value: PaymentMethod.CASH, label: 'Efectivo', icon: Banknote, color: 'green' },
  { value: PaymentMethod.CARD, label: 'Tarjeta', icon: CreditCard, color: 'blue' },
  { value: PaymentMethod.TRANSFER, label: 'Transferencia', icon: Smartphone, color: 'purple' },
  { value: PaymentMethod.QR, label: 'QR', icon: QrCode, color: 'amber' },
  { value: PaymentMethod.OTHER, label: 'Otro', icon: Wallet, color: 'gray' },
] as const;

const QUICK_CASH = [10, 20, 50, 100] as const;

export default function ProcessSaleModal({
  isOpen,
  onClose,
  cart,
  products,
  initialDiscount,
  initialDiscountType,
  onConfirm,
  customer,
  paymentMethod,
  onPaymentMethodChange,
  enableSplitPayment = false,
  onRemoveItem,
}: ProcessSaleModalProps) {
  const fmtCurrency = useCurrencyFormatter();
  const { config } = useBusinessConfig();
  const globalNotes = usePOSStore((s) => s.notes);
  const setGlobalNotes = usePOSStore((s) => s.setNotes);

  // --- State ---
  const [step, setStep] = useState<1 | 2>(1); // 1=Resumen, 2=Pago
  const [discount, setDiscount] = useState(initialDiscount ?? 0);
  const [discountType, setDiscountType] = useState<DiscountType>(initialDiscountType ?? 'PERCENTAGE');
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(paymentMethod || PaymentMethod.CASH);
  const [cashInput, setCashInput] = useState('');
  const [cashReceived, setCashReceived] = useState(0);
  const [transferRef, setTransferRef] = useState('');
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([]);
  const [localNotes, setLocalNotes] = useState(globalNotes || '');
  const [autoPrint, setAutoPrint] = useState(Boolean(config?.storeSettings?.autoPrintOnSale));

  // --- Reset on close ---
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setCashReceived(0);
      setCashInput('');
      setSelectedMethod(paymentMethod || PaymentMethod.CASH);
      setSplitEnabled(false);
      setSplitPayments([]);
      setTransferRef('');
      setErrors([]);
    }
  }, [isOpen, paymentMethod]);

  // --- Calculations ---
  const totals = useMemo(
    () => calculateCartWithIva(cart, products, discount, discountType, config),
    [cart, products, discount, discountType, config],
  );

  const changeDue = useMemo(() => {
    const change = cashReceived - totals.total;
    return Number.isFinite(change) ? Math.max(0, change) : 0;
  }, [cashReceived, totals.total]);

  const insufficientStock = useMemo(
    () => cart.filter((item) => {
      const p = products.find((pr) => String(pr.id) === String(item.product_id));
      return (Number(p?.stock_quantity ?? 0)) < item.quantity;
    }),
    [cart, products],
  );

  // --- Handlers ---
  const setCashExact = useCallback(() => {
    setCashReceived(totals.total);
    setCashInput(totals.total.toFixed(2));
  }, [totals.total]);

  const handleCashInput = useCallback((val: string) => {
    setCashInput(val);
    const num = Number(val.replace(',', '.'));
    setCashReceived(Number.isNaN(num) ? 0 : num);
  }, []);

  const { showConfirmation, ConfirmationDialog, isLoading } = useConfirmationDialog();

  const validate = useCallback(() => {
    const errs: string[] = [];
    errs.push(...validateDiscount(discount, discountType, totals.subtotalWithIva));

    if (selectedMethod === PaymentMethod.CASH && !splitEnabled) {
      if (cashReceived < totals.total) {
        errs.push(`Efectivo insuficiente: falta ${fmtCurrency(totals.total - cashReceived)}`);
      }
    }

    if (splitEnabled) {
      const splitTotal = splitPayments.reduce((s, p) => s + p.amount, 0);
      if (Math.abs(splitTotal - totals.total) > 0.01) {
        errs.push(`Pagos divididos deben sumar ${fmtCurrency(totals.total)}`);
      }
    }

    if (insufficientStock.length > 0) {
      errs.push(`Stock insuficiente: ${insufficientStock.map((i) => i.product_name).join(', ')}`);
    }

    setErrors(errs);
    return errs.length === 0;
  }, [discount, discountType, totals, selectedMethod, splitEnabled, cashReceived, splitPayments, insufficientStock, fmtCurrency]);

  const handleConfirm = useCallback(() => {
    if (!validate()) return;

    const methodLabel = PAYMENT_METHODS.find((m) => m.value === selectedMethod)?.label ?? 'Otro';
    const desc = splitEnabled
      ? `Pago dividido: ${splitPayments.map((p) => `${p.method} ${fmtCurrency(p.amount)}`).join(', ')}`
      : `Pago con ${methodLabel}`;

    showConfirmation({
      title: 'Confirmar venta',
      description: `${desc}. Total: ${fmtCurrency(totals.total)}${selectedMethod === PaymentMethod.CASH && !splitEnabled ? ` · Cambio: ${fmtCurrency(changeDue)}` : ''}`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      variant: 'info',
      onConfirm: async () => {
        if (onPaymentMethodChange && selectedMethod !== paymentMethod) {
          onPaymentMethodChange(selectedMethod);
        }
        try {
          setGlobalNotes((localNotes || '').replace(/<\/?script[^>]*>/gi, '').slice(0, 1000));
        } catch { /* ignore */ }

        const details: Parameters<typeof onConfirm>[2] = {
          paymentMethod: splitEnabled ? PaymentMethod.MIXED : selectedMethod,
        };

        if ((selectedMethod === PaymentMethod.TRANSFER || selectedMethod === PaymentMethod.QR) && transferRef) {
          details.transferReference = transferRef;
        }
        if (selectedMethod === PaymentMethod.CASH && !splitEnabled) {
          details.cashReceived = cashReceived;
          details.change = changeDue;
        }
        if (splitEnabled) {
          details.mixedPayments = splitPayments.map((p) => ({
            type: p.method,
            amount: p.amount,
            details: (p.method === PaymentMethod.TRANSFER || p.method === PaymentMethod.QR) ? { reference: transferRef || undefined } : undefined,
          }));
        }

        await onConfirm(discount, discountType, details, { autoPrint });
      },
    });
  }, [validate, selectedMethod, splitEnabled, splitPayments, totals, changeDue, fmtCurrency, showConfirmation, onPaymentMethodChange, paymentMethod, setGlobalNotes, localNotes, transferRef, cashReceived, discount, discountType, onConfirm, autoPrint]);

  // --- Keyboard ---
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'F9') { e.preventDefault(); setCashExact(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, setCashExact]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Header with total */}
        <div className="flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Receipt className="h-5 w-5 text-primary" />
              Procesar Venta
            </DialogTitle>
            <DialogDescription className="sr-only">Confirma los detalles de la venta</DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Total a pagar</span>
              <div className="text-3xl font-black text-primary tabular-nums">{fmtCurrency(totals.total)}</div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{cart.length} producto{cart.length !== 1 ? 's' : ''}</div>
              {customer && <div className="font-medium text-foreground">{customer.name}</div>}
              {totals.discountAmount > 0 && (
                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                  -{fmtCurrency(totals.discountAmount)}
                </Badge>
              )}
            </div>
          </div>
          {/* Step tabs */}
          <div className="mt-3 flex gap-1">
            {[{ id: 1 as const, label: 'Resumen' }, { id: 2 as const, label: 'Pago' }].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                  step === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Se emitirá un ticket interno temporal.</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide">
              {INTERNAL_TICKET_DISCLAIMER}
            </div>
          </div>

          {/* ── STEP 1: Resumen ── */}
          {step === 1 && (
            <>
              {/* Cart items */}
              <div className="space-y-2">
                {cart.map((item, idx) => {
                  const p = products.find((pr) => String(pr.id) === String(item.product_id));
                  const lowStock = (Number(p?.stock_quantity ?? 0)) < item.quantity;
                  return (
                    <div key={`${item.product_id}-${idx}`} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {p?.image_url ? (
                          <Image src={p.image_url} alt={item.product_name} width={36} height={36} className="object-cover" unoptimized />
                        ) : (
                          <Package2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.product_name}</span>
                          {lowStock && <Badge variant="destructive" className="text-[10px] px-1 py-0">Sin stock</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{item.quantity} × {fmtCurrency(item.price)}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-24 text-right">{fmtCurrency(item.total)}</span>
                      {onRemoveItem && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveItem(item.product_id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Totals */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-right tabular-nums">{fmtCurrency(totals.subtotalWithIva)}</span>
                <span className="text-muted-foreground">IVA incluido</span>
                <span className="text-right tabular-nums">{fmtCurrency(totals.taxAmount)}</span>
                {totals.discountAmount > 0 && (
                  <>
                    <span className="text-green-600">Descuento</span>
                    <span className="text-right tabular-nums text-green-600">-{fmtCurrency(totals.discountAmount)}</span>
                  </>
                )}
              </div>

              <Separator />

              {/* Discount */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> Descuento
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={discount || ''}
                    onChange={(e) => { setDiscount(Number(e.target.value) || 0); setErrors([]); }}
                    placeholder="0"
                    className="h-9 flex-1"
                  />
                  <Select value={discountType} onValueChange={(v) => { setDiscountType(v as DiscountType); setErrors([]); }}>
                    <SelectTrigger className="h-9 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">%</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 10, 15].map((v) => (
                    <Button key={v} type="button" variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => { setDiscount(v); setDiscountType('PERCENTAGE'); }}>
                      {v}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="sale-notes" className="text-sm">Notas</Label>
                <Input id="sale-notes" value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} placeholder="Opcional" className="h-9" />
              </div>
            </>
          )}

          {/* ── STEP 2: Pago ── */}
          {step === 2 && (
            <>
              {/* Payment methods */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const active = selectedMethod === m.value;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setSelectedMethod(m.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                        'hover:scale-[1.03] active:scale-95',
                        active
                          ? `border-${m.color}-500 bg-${m.color}-50 dark:bg-${m.color}-950/30 ring-2 ring-${m.color}-500/20`
                          : 'border-border hover:border-muted-foreground/40',
                      )}
                    >
                      <Icon className={cn('h-6 w-6', active ? `text-${m.color}-600` : 'text-muted-foreground')} />
                      <span className={cn('text-xs font-semibold', active ? `text-${m.color}-700 dark:text-${m.color}-300` : 'text-muted-foreground')}>
                        {m.label}
                      </span>
                      {active && (
                        <CheckCircle className={`h-3.5 w-3.5 text-${m.color}-600`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Cash section */}
              {selectedMethod === PaymentMethod.CASH && !splitEnabled && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="cash-received" className="text-sm">Efectivo recibido</Label>
                        <Input
                          id="cash-received"
                          type="text"
                          inputMode="decimal"
                          value={cashInput}
                          onChange={(e) => handleCashInput(e.target.value)}
                          placeholder="0.00"
                          className="h-10 text-lg font-semibold tabular-nums"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Cambio</Label>
                        <div className={cn(
                          'h-10 flex items-center justify-center rounded-md border text-lg font-bold tabular-nums',
                          changeDue > 0 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400' : 'bg-muted',
                        )}>
                          {fmtCurrency(changeDue)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button type="button" variant="secondary" size="sm" className="h-7" onClick={setCashExact}>Exacto</Button>
                      {QUICK_CASH.map((v) => (
                        <Button key={v} type="button" variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => { const n = totals.total + v; setCashInput(n.toFixed(2)); setCashReceived(n); }}>
                          +{v}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">F9 = monto exacto</p>
                  </CardContent>
                </Card>
              )}

              {/* Transfer/QR reference */}
              {(selectedMethod === PaymentMethod.TRANSFER || selectedMethod === PaymentMethod.QR) && !splitEnabled && (
                <div className="space-y-1">
                  <Label htmlFor="transfer-ref" className="text-sm">Referencia de transferencia / QR</Label>
                  <Input
                    id="transfer-ref"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="Nro. de referencia"
                    className="h-9"
                  />
                </div>
              )}

              {/* Split payment */}
              {enableSplitPayment && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pago dividido</Label>
                    <Button type="button" variant={splitEnabled ? 'default' : 'outline'} size="sm" className="h-7"
                      onClick={() => setSplitEnabled(!splitEnabled)}>
                      {splitEnabled ? 'Activado' : 'Activar'}
                    </Button>
                  </div>
                  {splitEnabled && (
                    <div className="space-y-2">
                      {splitPayments.map((p, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Select value={p.method} onValueChange={(v) => setSplitPayments((l) => l.map((it, i) => i === idx ? { ...it, method: v as PaymentMethod } : it))}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input type="number" inputMode="decimal" min={0} step="0.01" value={p.amount || ''}
                            onChange={(e) => setSplitPayments((l) => l.map((it, i) => i === idx ? { ...it, amount: Number(e.target.value) || 0 } : it))}
                            className="h-8 flex-1" />
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2"
                            onClick={() => setSplitPayments((l) => l.filter((_, i) => i !== idx))}>×</Button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <Button type="button" variant="outline" size="sm" className="h-7"
                          onClick={() => setSplitPayments((l) => [...l, { method: PaymentMethod.CASH, amount: 0 }])}>
                          + Agregar
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {fmtCurrency(splitPayments.reduce((s, p) => s + p.amount, 0))} / {fmtCurrency(totals.total)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auto print */}
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="auto-print" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} className="rounded" />
                <label htmlFor="auto-print" className="text-sm text-muted-foreground">Imprimir ticket interno al finalizar</label>
              </div>
            </>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <ul className="space-y-0.5">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t px-6 py-3 flex gap-2 justify-end bg-background">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={cart.length === 0}>
              Continuar al pago
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>Volver</Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || cart.length === 0 || insufficientStock.length > 0}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Procesando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Registrar venta
                  </span>
                )}
              </Button>
            </>
          )}
        </div>

        <ConfirmationDialog />
      </DialogContent>
    </Dialog>
  );
}
