'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Copy, CreditCard, MessageCircle, Package, Search, User } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useToast } from '@/components/ui/use-toast';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { formatPrice } from '@/utils/formatters';
import { formatPaymentMethod } from '@/lib/orders/payment-methods';

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
  const router = useRouter();
  const { tenantHref } = useTenantPublicRouting();
  const brandPrimary = config.branding?.primaryColor || '#0f766e';

  const businessWhatsApp = (config?.contact?.whatsapp || config?.contact?.phone || '').replace(/\D/g, '');
  const whatsappHref = businessWhatsApp
    ? `https://wa.me/${businessWhatsApp}?text=${encodeURIComponent(
        `Hola, mi pedido es ${orderId}. Total: ${formatPrice(total, config)}.`,
      )}`
    : null;

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      toast({ title: 'Numero copiado', description: 'Guardalo para consultar el estado del pedido.' });
    } catch {
      toast({ title: 'No se pudo copiar', description: orderId, variant: 'destructive' });
    }
  };

  const handleTrackOrder = () => {
    onClose();
    router.push(tenantHref(`/orders/track?orderNumber=${encodeURIComponent(orderId)}`));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-md gap-0 overflow-hidden p-0 bg-white dark:bg-slate-950"
      >
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

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTrackOrder}
              className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white transition-transform hover:brightness-110"
              style={{ backgroundColor: brandPrimary }}
            >
              <Search className="h-4 w-4" />
              Ver estado del pedido
            </button>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar por WhatsApp
              </a>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
