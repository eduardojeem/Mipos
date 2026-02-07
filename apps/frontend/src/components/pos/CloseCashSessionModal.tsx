'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Wallet, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CloseCashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { closingAmount: number; notes?: string }) => void;
  isLoading?: boolean;
  sessionData?: {
    openingAmount: number;
    openedAt: string;
    expectedBalance?: number;
  };
}

export default function CloseCashSessionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  sessionData,
}: CloseCashSessionModalProps) {
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ closingAmount?: string; notes?: string }>({});

  // Calcular diferencia
  const difference = useMemo(() => {
    const closing = parseFloat(closingAmount) || 0;
    const expected = sessionData?.expectedBalance || sessionData?.openingAmount || 0;
    return closing - expected;
  }, [closingAmount, sessionData]);

  const hasDifference = Math.abs(difference) > 0.01;
  const isShort = difference < 0;
  const isOver = difference > 0;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setClosingAmount('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  // Validaciones
  const validate = () => {
    const newErrors: { closingAmount?: string; notes?: string } = {};

    if (!closingAmount || closingAmount.trim() === '') {
      newErrors.closingAmount = 'El monto de cierre es requerido';
    } else {
      const amount = parseFloat(closingAmount);
      if (isNaN(amount)) {
        newErrors.closingAmount = 'Ingresa un monto válido';
      } else if (amount < 0) {
        newErrors.closingAmount = 'El monto no puede ser negativo';
      }
    }

    if (notes && notes.length > 500) {
      newErrors.notes = 'Las notas no pueden exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;

    onConfirm({
      closingAmount: parseFloat(closingAmount),
      notes: notes.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-red-500 to-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Cerrar Caja</h2>
                <p className="text-sm text-white/80">Registra el conteo final de efectivo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Session Info */}
          {sessionData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Monto Inicial</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(sessionData.openingAmount)}
                </p>
              </div>

              {sessionData.expectedBalance !== undefined && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">Balance Esperado</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(sessionData.expectedBalance)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Closing Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Monto Final en Caja <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                $
              </span>
              <input
                type="number"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0.00"
                disabled={isLoading}
                className={`w-full pl-8 pr-4 py-3 text-lg font-semibold bg-white dark:bg-slate-800 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.closingAmount
                    ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
                step="0.01"
                min="0"
              />
            </div>
            {errors.closingAmount && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4" />
                <span>{errors.closingAmount}</span>
              </p>
            )}
          </div>

          {/* Difference Alert */}
          {closingAmount && !errors.closingAmount && hasDifference && (
            <div
              className={`p-4 rounded-xl border-2 ${
                isShort
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <div className="flex items-start space-x-3">
                {isShort ? (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${isShort ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                    {isShort ? 'Faltante Detectado' : 'Sobrante Detectado'}
                  </p>
                  <p className={`text-sm mt-1 ${isShort ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                    Diferencia: <span className="font-bold">{formatCurrency(Math.abs(difference))}</span>
                  </p>
                  <p className={`text-xs mt-2 ${isShort ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {isShort
                      ? 'El monto contado es menor al esperado. Por favor verifica el conteo.'
                      : 'El monto contado es mayor al esperado. Por favor verifica el conteo.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega observaciones sobre el cierre de caja..."
              disabled={isLoading}
              rows={3}
              maxLength={500}
              className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.notes
                  ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            <div className="flex items-center justify-between mt-2">
              {errors.notes ? (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errors.notes}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Puedes agregar detalles sobre faltantes, sobrantes o incidencias
                </p>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {notes.length}/500
              </span>
            </div>
          </div>

          {/* Summary Card */}
          {closingAmount && !errors.closingAmount && (
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Resumen de Cierre</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Monto Final:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(parseFloat(closingAmount))}
                  </span>
                </div>
                {sessionData?.expectedBalance !== undefined && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Balance Esperado:</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(sessionData.expectedBalance)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-300 dark:border-slate-600">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Diferencia:</span>
                        <span
                          className={`font-bold ${
                            Math.abs(difference) < 0.01
                              ? 'text-green-600 dark:text-green-400'
                              : isShort
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}
                        >
                          {difference >= 0 ? '+' : ''}
                          {formatCurrency(difference)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Presiona <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-xs font-mono">Enter</kbd> para confirmar
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !closingAmount}
                className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Cerrando...</span>
                  </span>
                ) : (
                  'Cerrar Caja'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
