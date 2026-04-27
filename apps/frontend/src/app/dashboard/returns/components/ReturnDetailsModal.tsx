'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
  Package,
  Phone,
  RotateCcw,
  User,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import api from '@/lib/api';
import type { Return } from '../hooks/useReturns';

const logger = createLogger('ReturnDetailsModal');

interface ReturnDetailsModalProps {
  return: Return;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, status: string, notes?: string) => Promise<unknown>;
  onProcess: (id: string) => Promise<unknown>;
  isUpdating?: boolean;
}

const STATUS_CFG = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  },
  approved: {
    label: 'Aprobada',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
  },
  processed: {
    label: 'Procesada',
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  },
  completed: {
    label: 'Procesada',
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  },
  rejected: {
    label: 'Rechazada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  },
} as const;

const REFUND_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  bank_transfer: 'Transferencia',
  other: 'Otro',
};

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Solicitud', icon: RotateCcw },
  { key: 'approved', label: 'Aprobada', icon: CheckCircle },
  { key: 'processed', label: 'Procesada', icon: Package },
];

function getTimelineStep(status: string): number {
  if (status === 'rejected') return -1;
  if (status === 'pending') return 0;
  if (status === 'approved') return 1;
  if (status === 'processed' || status === 'completed') return 2;
  return 0;
}

export function ReturnDetailsModal({
  return: selectedReturn,
  open,
  onOpenChange,
  onUpdate,
  onProcess,
  isUpdating = false,
}: ReturnDetailsModalProps) {
  const [notes, setNotes] = useState(selectedReturn.notes || '');
  const [details, setDetails] = useState<Return | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const activeReturn = details?.id === selectedReturn.id ? details : selectedReturn;

  useEffect(() => {
    setNotes(activeReturn.notes || '');
  }, [activeReturn.id, activeReturn.notes]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDetails(true);
    setDetails(null);

    api
      .get(`/returns/${selectedReturn.id}`)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data as any;
        const fullReturn = payload?.id ? payload : payload?.return;
        if (fullReturn?.id) setDetails(fullReturn);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error('Error fetching return details:', error);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedReturn.id]);

  const cfg = STATUS_CFG[activeReturn.status as keyof typeof STATUS_CFG];
  const Icon = cfg?.icon ?? Clock;
  const timelineStep = getTimelineStep(activeReturn.status);

  const handleUpdate = async (status: string) => {
    try {
      await onUpdate(activeReturn.id, status, notes || undefined);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating return:', error);
    }
  };

  // ✅ FIX: Always call onProcess (POST /:id/process) — never bypass via onUpdate
  const handleProcess = async () => {
    try {
      await onProcess(activeReturn.id);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error processing return:', error);
    }
  };

  const refundLabel = REFUND_LABEL[activeReturn.refundMethod] || activeReturn.refundMethod || '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                Devolución #{activeReturn.returnNumber}
              </DialogTitle>
              <DialogDescription>Creada el {formatDate(activeReturn.createdAt)}</DialogDescription>
            </div>
            {cfg && (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {loadingDetails && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando detalles…
            </div>
          )}

          {activeReturn.status !== 'rejected' && (
            <div className="flex items-center">
              {TIMELINE_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const done = index <= timelineStep;
                const active = index === timelineStep;

                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-shrink-0 flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                          done
                            ? 'border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/30'
                            : 'border-muted-foreground/30 bg-muted text-muted-foreground'
                        } ${active ? 'ring-4 ring-orange-200 ring-offset-1 dark:ring-orange-900/40' : ''}`}
                      >
                        <StepIcon className="h-3.5 w-3.5" />
                      </div>
                      <span
                        className={`mt-1 text-[10px] font-semibold ${
                          done ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`mx-2 mb-4 h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                          index < timelineStep ? 'bg-orange-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeReturn.status === 'rejected' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Esta devolución fue rechazada</span>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Cliente
              </div>
              <p className="font-semibold">{activeReturn.customerName || '-'}</p>
              {activeReturn.customerEmail && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {activeReturn.customerEmail}
                </p>
              )}
              {activeReturn.customerPhone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {activeReturn.customerPhone}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Venta original
              </div>
              <p className="font-mono text-xs font-semibold">
                #{activeReturn.saleId?.slice(0, 8).toUpperCase() || '-'}
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Método de reembolso
              </div>
              <p className="font-semibold">{refundLabel}</p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Monto total
              </div>
              <p className="text-lg font-bold">{formatCurrency(activeReturn.totalAmount)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold">
              <Package className="h-4 w-4 text-muted-foreground" />
              Productos a devolver
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {activeReturn.items.length} {activeReturn.items.length === 1 ? 'producto' : 'productos'}
              </span>
            </h4>
            {activeReturn.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin productos registrados</p>
            ) : (
              <div className="space-y-1.5">
                {activeReturn.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        ×{item.quantity}
                        {item.sku ? ` · SKU: ${item.sku}` : ''}
                        {item.reason ? ` · ${item.reason}` : ''}
                      </p>
                    </div>
                    <p className="ml-4 flex-shrink-0 text-sm font-semibold">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold">Razón principal</h4>
            <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
              {activeReturn.reason || '-'}
            </p>
          </div>

          {(activeReturn.status === 'pending' || activeReturn.status === 'approved') && (
            <div className="space-y-1.5">
              <Label htmlFor="modal-notes" className="text-sm font-semibold">
                Agregar nota
              </Label>
              <Textarea
                id="modal-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Comentario sobre esta devolución..."
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          {activeReturn.processedAt && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm dark:border-purple-800 dark:bg-purple-950/20">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Información de procesamiento
              </p>
              <p className="text-purple-800 dark:text-purple-300">
                Procesada el {formatDate(activeReturn.processedAt)}
              </p>
              {activeReturn.processedBy && (
                <p className="text-purple-600 dark:text-purple-400">Por: {activeReturn.processedBy}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cerrar
          </Button>

          {activeReturn.status === 'pending' && (
            <>
              <Button
                variant="outline"
                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => void handleUpdate('rejected')}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Rechazar
              </Button>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleUpdate('approved')}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Aprobar
              </Button>
            </>
          )}

          {activeReturn.status === 'approved' && (
            <Button
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={() => void handleProcess()}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              Procesar devolución
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

