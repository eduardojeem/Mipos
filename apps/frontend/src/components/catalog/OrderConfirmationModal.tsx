'use client';

import React from 'react';
import { CheckCircle, Copy, CreditCard, Package, User } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/utils/formatters';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
}

function formatPaymentMethod(method: string) {
  return {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
  }[method] || method;
}

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  orderId,
  customerName,
  customerEmail,
  total,
  paymentMethod,
  orderDate,
}: OrderConfirmationModalProps) {
  const { config } = useBusinessConfig();
  const { toast } = useToast();

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      toast({ title: 'Numero copiado', description: 'Guardalo para consultar el estado del pedido.' });
    } catch {
      toast({ title: 'No se pudo copiar', description: orderId, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 bg-white dark:bg-slate-950">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Pedido registrado</h2>
              <p className="text-sm text-emerald-100">Tu numero de seguimiento ya esta listo.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Numero de pedido</p>
                <p className="mt-2 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{orderId}</p>
              </div>
              <button type="button" onClick={handleCopyOrderId} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{customerName}</p>
                <p className="text-slate-500 dark:text-slate-400">{customerEmail}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{formatPaymentMethod(paymentMethod)}</p>
                <p className="text-slate-500 dark:text-slate-400">Metodo de pago elegido</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{formatPrice(total, config)}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  Registrado el {new Date(orderDate).toLocaleString('es-ES')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
            Guarda este numero para seguir el pedido. El negocio puede usarlo para confirmar pago, entrega y estado.
          </div>

          <button type="button" onClick={onClose} className="w-full rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3 text-sm font-medium text-white">
            Seguir comprando
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
