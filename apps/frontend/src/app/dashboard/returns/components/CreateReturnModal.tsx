'use client';

import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useSaleLookup, type SaleItem } from '../hooks/useSaleLookup';
import type { CreateReturnData } from '../hooks/useReturns';

const REASON_OPTIONS = [
  { value: 'defective', label: 'Producto defectuoso' },
  { value: 'wrong-item', label: 'Producto incorrecto' },
  { value: 'not-satisfied', label: 'Cliente no satisfecho' },
  { value: 'damaged', label: 'Producto dañado' },
  { value: 'expired', label: 'Producto vencido' },
  { value: 'other', label: 'Otro motivo' },
];

const REFUND_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'other', label: 'Otro' },
];

const step3Schema = z.object({
  reason: z.enum(['defective', 'wrong-item', 'not-satisfied', 'damaged', 'expired', 'other'], {
    errorMap: () => ({ message: 'Selecciona una razón' }),
  }),
  refundMethod: z.enum(['cash', 'card', 'bank_transfer', 'other'], {
    errorMap: () => ({ message: 'Selecciona un método de reembolso' }),
  }),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

interface SelectedItem {
  saleItem: SaleItem;
  returnQty: number;
  itemReason: string;
}

interface CreateReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateReturnData) => Promise<unknown>;
  isCreating?: boolean;
}

const STEP_META = [
  { n: 1 as const, label: 'Buscar venta', description: 'Ingresa el ID de la venta original' },
  { n: 2 as const, label: 'Seleccionar productos', description: 'Elige qué devolver' },
  { n: 3 as const, label: 'Motivo y reembolso', description: 'Completa la solicitud' },
];

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mt-4 flex items-center gap-0">
      {STEP_META.map((item, index) => {
        const done = item.n < step;
        const active = item.n === step;
        return (
          <div key={item.n} className="flex flex-1 items-center">
            {/* Step circle */}
            <div className="flex flex-shrink-0 flex-col items-center">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  done
                    ? 'bg-orange-500 text-white'
                    : active
                      ? 'border-2 border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-950/30'
                      : 'border-2 border-muted bg-muted text-muted-foreground'
                }`}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.n}
              </div>
              <span
                className={`mt-0.5 hidden text-[9px] font-medium sm:block ${
                  active ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEP_META.length - 1 && (
              <div
                className={`mx-1.5 mb-3.5 h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                  item.n < step ? 'bg-orange-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CreateReturnModal({
  open,
  onOpenChange,
  onSubmit,
  isCreating = false,
}: CreateReturnModalProps) {
  const { toast } = useToast();
  const {
    sale,
    isLoading: isSearching,
    error: searchError,
    lookupSale,
    reset: resetLookup,
  } = useSaleLookup();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saleIdInput, setSaleIdInput] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});

  const resetAll = () => {
    setStep(1);
    setSaleIdInput('');
    setSelectedItems({});
    setReason('');
    setRefundMethod('');
    setNotes('');
    setStep3Errors({});
    resetLookup();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetAll();
    }
    onOpenChange(nextOpen);
  };

  const handleSearch = async () => {
    if (!saleIdInput.trim()) {
      toast({ title: 'Ingresa el ID de la venta', variant: 'destructive' });
      return null;
    }
    return lookupSale(saleIdInput.trim());
  };

  const goToStep2 = async () => {
    if (sale) {
      setStep(2);
      return;
    }
    const matchedSale = await handleSearch();
    if (matchedSale) {
      setStep(2);
    }
  };

  const toggleItem = (item: SaleItem) => {
    setSelectedItems((previous) => {
      if (previous[item.id]) {
        const next = { ...previous };
        delete next[item.id];
        return next;
      }
      return {
        ...previous,
        [item.id]: { saleItem: item, returnQty: 1, itemReason: '' },
      };
    });
  };

  const adjustQty = (itemId: string, delta: number) => {
    setSelectedItems((previous) => {
      const current = previous[itemId];
      if (!current) return previous;
      const nextQty = Math.max(1, Math.min(current.saleItem.quantity, current.returnQty + delta));
      return { ...previous, [itemId]: { ...current, returnQty: nextQty } };
    });
  };

  const setItemReason = (itemId: string, itemReason: string) => {
    setSelectedItems((previous) => ({
      ...previous,
      [itemId]: { ...previous[itemId], itemReason },
    }));
  };

  const clearStep3Error = (field: string) => {
    setStep3Errors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const selectedCount = Object.keys(selectedItems).length;
  const selectedTotal = Object.values(selectedItems).reduce(
    (sum, item) => sum + item.saleItem.unitPrice * item.returnQty,
    0
  );

  const goToStep3 = () => {
    if (!selectedCount) {
      toast({ title: 'Selecciona al menos un producto', variant: 'destructive' });
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sale) {
      toast({ title: 'Busca una venta válida antes de continuar', variant: 'destructive' });
      setStep(1);
      return;
    }

    const parsed = step3Schema.safeParse({ reason, refundMethod, notes });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.errors) {
        nextErrors[issue.path.join('.')] = issue.message;
      }
      setStep3Errors(nextErrors);
      toast({
        title: 'Completa los campos requeridos',
        description: parsed.error.errors[0]?.message,
        variant: 'destructive',
      });
      return;
    }

    setStep3Errors({});

    const items = Object.values(selectedItems).map((item) => ({
      originalSaleItemId: item.saleItem.id,
      productId: item.saleItem.productId,
      quantity: item.returnQty,
      unitPrice: item.saleItem.unitPrice,
      reason: item.itemReason.trim() || undefined,
    }));

    try {
      await onSubmit({
        originalSaleId: sale.id,
        customerId: sale.customerId || undefined,
        reason: parsed.data.reason,
        notes: parsed.data.notes || undefined,
        refundMethod: parsed.data.refundMethod,
        items,
      });

      resetAll();
      onOpenChange(false);
    } catch {
      // The hook already surfaces the error toast; keep modal state intact.
    }
  };

  const stepMeta = STEP_META.find((s) => s.n === step)!;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[580px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 dark:bg-orange-950/40">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Nueva devolución</DialogTitle>
              <DialogDescription className="text-xs">
                {stepMeta.description}
              </DialogDescription>
            </div>
          </div>
          <StepBar step={step} />
        </DialogHeader>

        {/* ── STEP 1: Buscar venta ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                ID de la venta original
              </Label>
              <div className="flex gap-2">
                <Input
                  value={saleIdInput}
                  onChange={(event) => setSaleIdInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSearch();
                    }
                  }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="flex-1 font-mono text-sm"
                  disabled={isSearching}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSearch()}
                  disabled={isSearching || !saleIdInput.trim()}
                  className="shrink-0"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Puedes usar el UUID completo o presionar{' '}
                <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Enter</kbd>{' '}
                para buscar.
              </p>
            </div>

            {searchError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {searchError}
              </div>
            )}

            {isSearching && (
              <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <div className="mt-3 space-y-1.5">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            )}

            {sale && !isSearching && (
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/10">
                <div className="flex items-center justify-between border-b border-emerald-200 px-4 py-3 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Venta encontrada
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" /> Cliente
                    </p>
                    <p className="font-medium">{sale.customerName || 'Sin cliente'}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Fecha
                    </p>
                    <p className="font-medium">{formatDate(sale.createdAt)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="mb-0.5 text-xs text-muted-foreground">Total de venta</p>
                    <p className="text-lg font-bold">{formatCurrency(sale.totalAmount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Seleccionar productos ── */}
        {step === 2 && sale && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Selecciona los productos y la cantidad a devolver:
              </p>
              {selectedCount > 0 && (
                <Badge className="border-orange-200 bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                  {selectedCount} sel. · {formatCurrency(selectedTotal)}
                </Badge>
              )}
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {sale.items.map((item) => {
                const selected = selectedItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={`cursor-pointer rounded-xl border p-3 transition-all duration-150 ${
                      selected
                        ? 'border-orange-400 bg-orange-50/70 dark:border-orange-600 dark:bg-orange-950/20'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                    onClick={() => toggleItem(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <div
                          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            selected
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.sku ? `SKU: ${item.sku} · ` : ''}
                            Disponible: {item.quantity} u. · {formatCurrency(item.unitPrice)}/u.
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>

                    {selected && (
                      <div
                        className="mt-3 space-y-2 border-t border-orange-200 pt-2 dark:border-orange-800"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Cantidad a devolver
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={selected.returnQty <= 1}
                              onClick={() => adjustQty(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">
                              {selected.returnQty}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={selected.returnQty >= item.quantity}
                              onClick={() => adjustQty(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="ml-1 text-xs text-muted-foreground">
                              / {item.quantity}
                            </span>
                          </div>
                        </div>

                        <Input
                          placeholder="Razón específica (opcional)"
                          value={selected.itemReason}
                          onChange={(event) => setItemReason(item.id, event.target.value)}
                          className="h-8 text-xs"
                          maxLength={200}
                        />

                        <p className="text-right text-xs font-semibold text-orange-700 dark:text-orange-400">
                          Subtotal: {formatCurrency(item.unitPrice * selected.returnQty)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedCount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 dark:border-orange-800 dark:bg-orange-950/30">
                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado
                  {selectedCount !== 1 ? 's' : ''}
                </span>
                <span className="font-bold text-orange-700 dark:text-orange-400">
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Motivo y reembolso ── */}
        {step === 3 && (
          <form id="step3-form" onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                Razón principal <span className="text-destructive">*</span>
              </Label>
              <Select
                value={reason}
                onValueChange={(value) => {
                  setReason(value);
                  clearStep3Error('reason');
                }}
              >
                <SelectTrigger className={step3Errors.reason ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona una razón..." />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {step3Errors.reason && (
                <p className="text-xs text-destructive">{step3Errors.reason}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Método de reembolso <span className="text-destructive">*</span>
              </Label>
              <Select
                value={refundMethod}
                onValueChange={(value) => {
                  setRefundMethod(value);
                  clearStep3Error('refundMethod');
                }}
              >
                <SelectTrigger className={step3Errors.refundMethod ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona método..." />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {step3Errors.refundMethod && (
                <p className="text-xs text-destructive">{step3Errors.refundMethod}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Notas adicionales{' '}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  clearStep3Error('notes');
                }}
                placeholder="Descripción detallada..."
                rows={3}
                maxLength={1000}
              />
              <p className="text-right text-xs text-muted-foreground">{notes.length}/1000</p>
            </div>

            {/* Summary */}
            <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resumen de devolución
              </p>
              {Object.values(selectedItems).map((item) => (
                <div key={item.saleItem.id} className="flex justify-between text-sm">
                  <span className="mr-4 truncate text-muted-foreground">
                    {item.saleItem.productName}{' '}
                    <span className="text-xs">×{item.returnQty}</span>
                  </span>
                  <span className="flex-shrink-0 font-medium">
                    {formatCurrency(item.saleItem.unitPrice * item.returnQty)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1.5 font-bold">
                <span>Total a reembolsar</span>
                <span className="text-orange-600">{formatCurrency(selectedTotal)}</span>
              </div>
            </div>
          </form>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void goToStep2()}
                disabled={isSearching || !saleIdInput.trim()}
                className="gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                  </>
                ) : sale ? (
                  <>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Buscar venta <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button onClick={goToStep3} disabled={selectedCount === 0} className="gap-2">
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button
                type="submit"
                form="step3-form"
                disabled={isCreating}
                className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Crear devolución
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
