'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';

interface OpenCashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, notes?: string) => void;
  isLoading?: boolean;
}

const QUICK_AMOUNTS = [
  { label: '50.000', value: 50000 },
  { label: '100.000', value: 100000 },
  { label: '200.000', value: 200000 },
  { label: '500.000', value: 500000 },
];

export default function OpenCashSessionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: OpenCashSessionModalProps) {
  const fmtCurrency = useCurrencyFormatter();
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleAmountChange = useCallback((value: string) => {
    // Solo permitir números y punto decimal
    const sanitized = value.replace(/[^\d.]/g, '');
    setAmount(sanitized);
    setErrors([]);
  }, []);

  const handleQuickAmount = useCallback((value: number) => {
    setAmount(value.toString());
    setErrors([]);
  }, []);

  const validate = useCallback(() => {
    const errs: string[] = [];
    const numAmount = Number(amount);

    if (!amount || amount.trim() === '') {
      errs.push('Debe ingresar un monto de apertura');
    } else if (isNaN(numAmount)) {
      errs.push('El monto debe ser un número válido');
    } else if (numAmount < 0) {
      errs.push('El monto debe ser positivo');
    } else if (numAmount > 10000000) {
      errs.push('El monto de apertura es demasiado alto');
    }

    setErrors(errs);
    return errs.length === 0;
  }, [amount]);

  const handleConfirm = useCallback(() => {
    if (!validate()) return;

    const numAmount = Number(amount);
    onConfirm(numAmount, notes.trim() || undefined);
  }, [amount, notes, validate, onConfirm]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setAmount('');
      setNotes('');
      setErrors([]);
      onClose();
    }
  }, [isLoading, onClose]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  }, [handleConfirm, handleClose]);

  const numAmount = Number(amount) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <Wallet className="h-6 w-6" />
            </div>
            Abrir Sesión de Caja
          </DialogTitle>
          <DialogDescription>
            Ingresa el monto inicial con el que comenzarás la jornada de ventas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Quick Amount Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Montos Rápidos
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {QUICK_AMOUNTS.map((quick) => (
                <button
                  key={quick.value}
                  type="button"
                  onClick={() => handleQuickAmount(quick.value)}
                  disabled={isLoading}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    Number(amount) === quick.value
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30 shadow-lg shadow-green-500/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/10",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <DollarSign className={cn(
                    "h-5 w-5 transition-colors",
                    Number(amount) === quick.value
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-600 dark:text-gray-400"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold transition-colors",
                    Number(amount) === quick.value
                      ? "text-green-700 dark:text-green-300"
                      : "text-gray-700 dark:text-gray-300"
                  )}>
                    {quick.label}
                  </span>
                  {Number(amount) === quick.value && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-600 rounded-full p-0.5 shadow-lg animate-in zoom-in duration-200">
                        <CheckCircle2 className="h-3 w-3 text-white" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="opening-amount" className="text-sm font-semibold">
              Monto de Apertura *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="opening-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "pl-10 text-lg font-semibold h-14",
                  errors.length > 0 && "border-destructive focus-visible:ring-destructive"
                )}
                autoFocus
              />
            </div>
            {numAmount > 0 && (
              <p className="text-sm text-muted-foreground">
                Monto: <span className="font-semibold text-foreground">{fmtCurrency(numAmount)}</span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="opening-notes" className="text-sm font-semibold">
              Notas (Opcional)
            </Label>
            <Textarea
              id="opening-notes"
              placeholder="Ej: Apertura de caja - Turno mañana"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              maxLength={200}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/200 caracteres
            </p>
          </div>

          {/* Summary Card */}
          {numAmount > 0 && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Resumen de Apertura
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">Monto inicial:</span>
                        <span className="font-bold text-green-900 dark:text-green-100">
                          {fmtCurrency(numAmount)}
                        </span>
                      </div>
                      {notes && (
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-300">Notas:</span>
                          <span className="font-medium text-green-900 dark:text-green-100 text-right max-w-[200px] truncate">
                            {notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {errors.map((error, i) => (
                  <p key={i} className="text-sm font-medium">{error}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !amount || Number(amount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Abriendo...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Abrir Caja
              </>
            )}
          </Button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> para confirmar •{' '}
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> para cancelar
        </div>
      </DialogContent>
    </Dialog>
  );
}
