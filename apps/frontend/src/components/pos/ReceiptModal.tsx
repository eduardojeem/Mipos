'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle,
  Copy,
  Download,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getPaymentMethodLabel,
  INTERNAL_TICKET_LABEL,
  type PosInternalTicket,
} from '@/lib/pos/internal-ticket';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: PosInternalTicket | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    saleId?: string;
    saleNumber?: string;
  } | null;
  onPrint: () => void;
  onDownload: () => void;
  businessInfo?: {
    name: string;
    address?: string;
    phone?: string;
    taxId?: string;
    logo?: string;
    email?: string;
    website?: string;
  };
  thermalPrinter?: boolean;
  autoPrint?: boolean;
  autoShare?: { whatsapp?: boolean; email?: boolean; recipientEmail?: string; recipientPhone?: string };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const ReceiptModal: React.FC<ReceiptModalProps> = React.memo(({
  isOpen,
  onClose,
  saleData,
  invoice = null,
  onPrint,
  onDownload,
  businessInfo = {
    name: 'Mi Negocio',
    address: '',
    phone: '',
    taxId: '',
    email: '',
    website: '',
  },
  thermalPrinter = false,
  autoPrint = false,
  autoShare,
}) => {
  const fmtCurrency = useCurrencyFormatter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  // Cualquier acción en curso bloquea las otras para evitar dobles
  // descargas, popups encimados, prints duplicados, etc.
  const isAnyActionRunning = isPrinting || isDownloading;
  const [csatScore, setCsatScore] = useState<number | null>(null);
  const [csatSubmitted, setCsatSubmitted] = useState(false);
  const autoPrintHandledRef = useRef(false);
  const autoShareHandledRef = useRef(false);

  // --- Memoized derived data ---
  const business = useMemo(() => ({
    name: businessInfo.name || 'Mi Negocio',
    address: businessInfo.address || '',
    phone: businessInfo.phone || '',
    taxId: businessInfo.taxId || '',
    email: businessInfo.email || '',
    website: businessInfo.website || '',
    logo: businessInfo.logo || '',
  }), [businessInfo]);

  const items = useMemo(() => (Array.isArray(saleData?.items) ? saleData.items : []), [saleData]);
  const subtotal = Number(saleData?.subtotal || 0);
  const discount = Number(saleData?.discountAmount || 0);
  const tax = Number(saleData?.taxAmount || 0);
  const total = Number(saleData?.totalAmount || 0);

  // --- Callbacks ---
  const formatDate = useCallback((dateString: string) =>
    new Date(dateString).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }), []);

  const renderPaymentDetailsText = useCallback(() => {
    if (!saleData) return '';
    if (saleData.paymentMethod === 'MIXED' && Array.isArray(saleData.mixedPayments)) {
      return saleData.mixedPayments
        .map((part) => {
          const reference = part.details?.reference ? ` · Ref ${part.details.reference}` : '';
          return `${getPaymentMethodLabel(part.type)}: ${fmtCurrency(part.amount)}${reference}`;
        })
        .join('\n');
    }

    const details: string[] = [`Método de pago: ${getPaymentMethodLabel(saleData.paymentMethod)}`];

    if (saleData.paymentMethod === 'CASH' && typeof saleData.cashReceived === 'number') {
      details.push(`Entregado: ${fmtCurrency(saleData.cashReceived)}`);
      details.push(`Vuelto: ${fmtCurrency(saleData.change || 0)}`);
    }

    if (saleData.transferReference) {
      details.push(`Referencia: ${saleData.transferReference}`);
    }

    return details.join('\n');
  }, [saleData, fmtCurrency]);

  const generateTicketText = useCallback(() => {
    if (!saleData) return '';
    const businessLines = [
      business.name,
      business.address,
      business.phone,
      business.email,
      business.taxId ? `RUC/ID: ${business.taxId}` : '',
    ].filter(Boolean);

    const itemLines = items.map((item) => (
      `${item.quantity}x ${item.productName} (${fmtCurrency(item.unitPrice)}) = ${fmtCurrency(item.totalPrice)}`
    ));

    return [
      ...businessLines,
      '--------------------------------',
      `${INTERNAL_TICKET_LABEL.toUpperCase()} ${saleData.documentNumber}`,
      `ID Venta: ${saleData.saleNumber || saleData.id}`,
      saleData.documentDisclaimer,
      saleData.documentDescription,
      `Fecha: ${formatDate(saleData.createdAt)}`,
      saleData.cashier ? `Cajero: ${saleData.cashier}` : '',
      saleData.customer?.name ? `Cliente: ${saleData.customer.name}` : '',
      '--------------------------------',
      ...itemLines,
      '--------------------------------',
      `Subtotal: ${fmtCurrency(subtotal)}`,
      discount > 0 ? `Descuento: -${fmtCurrency(discount)}` : '',
      `IVA: ${fmtCurrency(tax)}`,
      `TOTAL: ${fmtCurrency(total)}`,
      '--------------------------------',
      renderPaymentDetailsText(),
      saleData.notes ? `Notas: ${saleData.notes}` : '',
      '--------------------------------',
      'Gracias por su compra.',
    ].filter(Boolean).join('\n');
  }, [saleData, business, items, subtotal, discount, tax, total, formatDate, renderPaymentDetailsText, fmtCurrency]);

  const buildTicketHtml = useCallback(() => {
    if (!saleData) return '';
    const itemRows = items.map((item) => `
      <div class="item">
        <div class="item-name">${escapeHtml(item.productName)}</div>
        <div class="item-meta">
          <span>${item.quantity} x ${escapeHtml(fmtCurrency(item.unitPrice))}</span>
          <span>${escapeHtml(fmtCurrency(item.totalPrice))}</span>
        </div>
      </div>
    `).join('');

    const paymentRows = saleData.paymentMethod === 'MIXED' && Array.isArray(saleData.mixedPayments)
      ? saleData.mixedPayments.map((part) => `
          <div class="row">
            <span>${escapeHtml(getPaymentMethodLabel(part.type))}</span>
            <span>${escapeHtml(fmtCurrency(part.amount))}</span>
          </div>
          ${part.details?.reference ? `<div class="meta">Ref: ${escapeHtml(part.details.reference)}</div>` : ''}
        `).join('')
      : `
          <div class="row">
            <span>Método de pago</span>
            <span>${escapeHtml(getPaymentMethodLabel(saleData.paymentMethod))}</span>
          </div>
          ${saleData.paymentMethod === 'CASH' && typeof saleData.cashReceived === 'number' ? `
            <div class="row">
              <span>Entregado</span>
              <span>${escapeHtml(fmtCurrency(saleData.cashReceived))}</span>
            </div>
            <div class="row">
              <span>Vuelto</span>
              <span>${escapeHtml(fmtCurrency(saleData.change || 0))}</span>
            </div>
          ` : ''}
          ${saleData.transferReference ? `
            <div class="meta">Referencia: ${escapeHtml(saleData.transferReference)}</div>
          ` : ''}
        `;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(INTERNAL_TICKET_LABEL)} ${escapeHtml(saleData.documentNumber)}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: 58mm;
              height: auto !important;
              overflow: visible !important;
            }
          }
          html, body {
            height: auto;
            overflow: visible;
          }
          body {
            font-family: 'Lucida Console', 'Consolas', monospace;
            font-size: 12px;
            font-weight: 500;
            line-height: 1.5;
            margin: 0;
            padding: 2mm;
            width: 58mm;
            max-width: 58mm;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .header, .footer { text-align: center; }
          .business-name { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
          .business-meta { font-size: 10px; font-weight: 600; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.6;
          }
          .meta { font-size: 9px; font-weight: 500; }
          .item { margin-bottom: 3px; }
          .item-name { font-weight: 800; font-size: 11px; }
          .item-meta {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 600;
          }
          .totals .total {
            font-size: 14px;
            font-weight: 900;
            border-top: 1px dashed #000;
            padding-top: 3px;
            margin-top: 3px;
          }
          .footer { margin-top: 5px; font-size: 9px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${escapeHtml(business.name)}</div>
          ${business.address ? `<div class="business-meta">${escapeHtml(business.address)}</div>` : ''}
          ${business.phone ? `<div class="business-meta">Tel: ${escapeHtml(business.phone)}</div>` : ''}
          ${business.taxId ? `<div class="business-meta">RUC: ${escapeHtml(business.taxId)}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="row">
          <span><strong>${escapeHtml(INTERNAL_TICKET_LABEL)}</strong></span>
          <span><strong>${escapeHtml(saleData.documentNumber)}</strong></span>
        </div>
        <div class="row">
          <span>ID Venta</span>
          <span>${escapeHtml(saleData.saleNumber || saleData.id)}</span>
        </div>
        <div class="row">
          <span>Fecha</span>
          <span>${escapeHtml(formatDate(saleData.createdAt))}</span>
        </div>
        ${saleData.cashier ? `<div class="row"><span>Cajero</span><span>${escapeHtml(saleData.cashier)}</span></div>` : ''}
        ${saleData.customer?.name ? `<div class="row"><span>Cliente</span><span>${escapeHtml(saleData.customer.name)}</span></div>` : ''}

        <div class="divider"></div>

        ${itemRows}

        <div class="divider"></div>

        <div class="totals">
          <div class="row">
            <span>Subtotal</span>
            <span>${escapeHtml(fmtCurrency(subtotal))}</span>
          </div>
          ${discount > 0 ? `
            <div class="row">
              <span>Descuento</span>
              <span>-${escapeHtml(fmtCurrency(discount))}</span>
            </div>
          ` : ''}
          <div class="row">
            <span>IVA</span>
            <span>${escapeHtml(fmtCurrency(tax))}</span>
          </div>
          <div class="row total">
            <span>TOTAL</span>
            <span>${escapeHtml(fmtCurrency(total))}</span>
          </div>
        </div>

        <div class="divider"></div>

        ${paymentRows}

        ${saleData.notes ? `<div class="meta">Nota: ${escapeHtml(saleData.notes)}</div><div class="divider"></div>` : ''}

        <div class="footer">
          <div>Gracias por su compra</div>
          <div class="muted">${escapeHtml(saleData.documentDisclaimer)}</div>
        </div>
      </body>
      </html>
    `;
  }, [saleData, business, items, subtotal, discount, tax, total, formatDate, fmtCurrency]);

  const handleWhatsAppShare = useCallback(() => {
    const text = generateTicketText();
    const phone = autoShare?.recipientPhone?.replace(/[^0-9]/g, '') || '';
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(text)}`, '_blank');
  }, [autoShare?.recipientPhone, generateTicketText]);

  const handleEmailShare = useCallback(() => {
    if (!saleData) return;
    const subject = `${INTERNAL_TICKET_LABEL} ${saleData.documentNumber} - ${business.name}`;
    const body = generateTicketText();
    const recipient = autoShare?.recipientEmail || '';
    window.open(
      `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank',
    );
  }, [autoShare?.recipientEmail, business.name, saleData, generateTicketText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateTicketText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Ticket copiado al portapapeles');
    } catch (error) {
      console.error('Error al copiar ticket interno:', error);
      toast.error('No se pudo copiar', {
        description: 'Tu navegador bloqueó el acceso al portapapeles.',
      });
    }
  }, [generateTicketText]);

  const handleNativeShare = useCallback(async () => {
    if (!saleData) return;
    if (!navigator.share) {
      // En desktop no hay native share — explicamos el fallback en lugar
      // de copiar silenciosamente (UX antes era ambigua).
      toast.info('Copiamos el ticket al portapapeles', {
        description: 'Tu navegador no soporta compartir nativo. Pegalo donde lo necesites.',
      });
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: `${INTERNAL_TICKET_LABEL} ${saleData.documentNumber}`,
        text: generateTicketText(),
      });
    } catch (error) {
      // AbortError = user canceló, no es un fallo real
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error al compartir ticket interno:', error);
      toast.error('No se pudo compartir');
    }
  }, [saleData, generateTicketText, handleCopy]);

  const handleTicketDownload = useCallback(async () => {
    if (!saleData || isAnyActionRunning) return;
    setIsDownloading(true);
    try {
      const html = buildTicketHtml();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ticket-interno_${saleData.documentNumber}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      onDownload();
      toast.success('Ticket descargado');
    } catch (error) {
      console.error('Error al descargar ticket interno:', error);
      toast.error('No se pudo descargar el ticket');
    } finally {
      setIsDownloading(false);
    }
  }, [saleData, buildTicketHtml, onDownload, isAnyActionRunning]);

  const handleOpenInvoice = useCallback(() => {
    if (!invoice?.id) return;
    window.open(`/dashboard/invoicing/${encodeURIComponent(invoice.id)}`, '_blank');
  }, [invoice?.id]);

  const handleThermalPrint = useCallback(async () => {
    if (isAnyActionRunning) return;
    setIsPrinting(true);
    try {
      const printWindow = window.open('', '_blank', 'width=240,height=400');
      if (!printWindow) {
        toast.error('No se pudo abrir la ventana de impresión', {
          description: 'Permití pop-ups para este sitio en tu navegador y reintentá.',
        });
        return;
      }

      const html = buildTicketHtml();
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
      }, 200);
      onPrint();
    } catch (error) {
      console.error('Error al imprimir ticket interno:', error);
      toast.error('No se pudo imprimir el ticket');
    } finally {
      setIsPrinting(false);
    }
  }, [buildTicketHtml, onPrint, isAnyActionRunning]);

  // --- Effects ---
  useEffect(() => {
    autoPrintHandledRef.current = false;
    autoShareHandledRef.current = false;
  }, [saleData?.id, isOpen]);

  // Cerrar con tecla Esc — esperado por usuarios de teclado y mejora
  // accesibilidad del modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!saleData || !isOpen || !autoPrint || !thermalPrinter || autoPrintHandledRef.current) return;
    autoPrintHandledRef.current = true;
    void handleThermalPrint();
  }, [autoPrint, isOpen, saleData, thermalPrinter, handleThermalPrint]);

  useEffect(() => {
    if (!saleData || !isOpen || autoShareHandledRef.current || !autoShare) return;

    const shouldShareWhatsApp = Boolean(autoShare.whatsapp);
    const shouldShareEmail = Boolean(autoShare.email);
    if (!shouldShareWhatsApp && !shouldShareEmail) return;

    autoShareHandledRef.current = true;

    if (shouldShareWhatsApp) handleWhatsAppShare();
    if (shouldShareEmail) handleEmailShare();
  }, [autoShare, isOpen, saleData, handleWhatsAppShare, handleEmailShare]);

  // --- Render ---
  if (!isOpen || !saleData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internal-ticket-title"
        >
          {/* Header fijo — no se achica, no scrollea. */}
          <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 px-6 py-8 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_40%)]" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-xl backdrop-blur-md">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      ¡Venta Exitosa!
                    </span>
                  </div>
                  <h2 id="internal-ticket-title" className="mt-1 text-2xl font-black tracking-tight">
                    {INTERNAL_TICKET_LABEL} {saleData.documentNumber}
                  </h2>
                  <p className="mt-1 text-sm text-emerald-50 opacity-90">
                    Transacción completada y registrada correctamente.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/20 hover:text-white active:scale-90"
                aria-label="Cerrar ticket"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scroll wrapper — contiene cuerpo del recibo + acciones (footer)
              en UN solo container scrollable. Antes el ScrollArea solo
              scrolleaba el cuerpo y el footer competía por espacio,
              comprimiendo la vista del ticket que se va a imprimir.
              Ahora todo (recibo + botones de acción + CSAT) scrollea
              junto, y el header colorido queda fijo arriba. */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
            <div className="p-5 sm:p-6">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-6 text-center">
                  {business.logo && (
                    <img
                      src={business.logo}
                      alt={business.name}
                      className="mx-auto mb-4 h-14 w-auto object-contain"
                    />
                  )}
                  <h3 className="text-xl font-bold text-slate-900">{business.name}</h3>
                  {business.address && <p className="mt-1 text-sm text-slate-500">{business.address}</p>}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {business.phone && <span>{business.phone}</span>}
                    {business.email && <span>{business.email}</span>}
                    {business.taxId && <span>RUC/ID: {business.taxId}</span>}
                  </div>

                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-800">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em]">{saleData.documentSubtitle}</p>
                    <p className="mt-2 text-base font-bold">{saleData.documentDisclaimer}</p>
                    <p className="mt-2 text-xs leading-5 text-red-700/90">{saleData.documentDescription}</p>
                  </div>
                  {invoice && (
                    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-left text-sky-900">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                        <FileText className="h-4 w-4" />
                        Factura generada
                      </div>
                      <p className="mt-2 text-base font-bold">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-sky-800/80">
                        La factura quedó vinculada a esta venta y está lista para impresión desde el módulo de facturación.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 border-b border-slate-100 px-6 py-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Ticket</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{saleData.documentNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Fecha</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(saleData.createdAt)}</p>
                  </div>
                  {saleData.cashier && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Cajero</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{saleData.cashier}</p>
                    </div>
                  )}
                  {saleData.customer?.name && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Cliente</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{saleData.customer.name}</p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Detalle de venta</h4>
                    <span className="text-xs font-medium text-slate-400">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{item.productName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.quantity} x {fmtCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <div className="text-right text-sm font-semibold text-slate-900">
                            {fmtCurrency(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-5" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{fmtCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Descuento</span>
                        <span>-{fmtCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>IVA</span>
                      <span>{fmtCurrency(tax)}</span>
                    </div>
                    <div className="mt-3 flex justify-between rounded-2xl bg-slate-900 px-4 py-3 text-base font-bold text-white">
                      <span>Total</span>
                      <span>{fmtCurrency(total)}</span>
                    </div>
                  </div>

                  <Separator className="my-5" />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Pago</h4>

                    {saleData.paymentMethod === 'MIXED' && Array.isArray(saleData.mixedPayments) ? (
                      <div className="space-y-2">
                        {saleData.mixedPayments.map((part, index) => (
                          <div key={`${part.type}-${index}`} className="rounded-2xl border border-slate-100 px-4 py-3">
                            <div className="flex justify-between text-sm font-medium text-slate-900">
                              <span>{getPaymentMethodLabel(part.type)}</span>
                              <span>{fmtCurrency(part.amount)}</span>
                            </div>
                            {part.details?.reference && (
                              <p className="mt-1 text-xs text-slate-500">Referencia: {part.details.reference}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-100 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {getPaymentMethodLabel(saleData.paymentMethod)}
                          </span>
                          {saleData.paymentMethod === 'CASH' && typeof saleData.cashReceived === 'number' && (
                            <span className="text-xs text-slate-500">
                              Entregado {fmtCurrency(saleData.cashReceived)} · Vuelto {fmtCurrency(saleData.change || 0)}
                            </span>
                          )}
                        </div>
                        {saleData.transferReference && (
                          <p className="mt-2 text-xs text-slate-500">Referencia: {saleData.transferReference}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {saleData.notes && (
                    <>
                      <Separator className="my-5" />
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Notas</h4>
                        <p className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {saleData.notes}
                        </p>
                      </div>
                    </>
                  )}

                  <Separator className="my-5" />

                  <div className="rounded-2xl bg-slate-100 px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-slate-900">Conserve este ticket como referencia interna de la compra.</p>
                    <p className="mt-1 text-xs text-slate-500">{saleData.documentDisclaimer}</p>
                    {business.website && <p className="mt-2 text-xs text-slate-500">{business.website}</p>}
                  </div>
                </div>
              </div>
            </div>
            {/* Acciones — dentro del mismo scroll container que el cuerpo
                para que el ticket (lo que se imprime) siempre tenga su
                espacio sin competir con los botones. */}
            <div className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 sm:px-6">
            {invoice && (
              <Button variant="outline" className="w-full" onClick={handleOpenInvoice}>
                <FileText className="mr-2 h-4 w-4" />
                Abrir factura {invoice.invoiceNumber}
              </Button>
            )}
            <div className="grid grid-cols-4 gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex h-auto flex-col gap-1 py-2" onClick={handleWhatsAppShare}>
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-[10px]">WhatsApp</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar ticket interno por WhatsApp</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex h-auto flex-col gap-1 py-2" onClick={handleEmailShare}>
                      <Mail className="h-5 w-5" />
                      <span className="text-[10px]">Email</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar ticket interno por email</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex h-auto flex-col gap-1 py-2" onClick={handleCopy}>
                      {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                      <span className="text-[10px]">{copied ? 'Copiado' : 'Copiar'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar texto del ticket interno</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex h-auto flex-col gap-1 py-2" onClick={handleNativeShare}>
                      <Share2 className="h-5 w-5" />
                      <span className="text-[10px]">Compartir</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compartir ticket interno</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleTicketDownload} disabled={isAnyActionRunning}>
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? 'Descargando...' : 'Descargar ticket'}
              </Button>
              <Button className="flex-1" onClick={thermalPrinter ? handleThermalPrint : onPrint} disabled={isAnyActionRunning}>
                <Printer className="mr-2 h-4 w-4" />
                {isPrinting ? 'Imprimiendo...' : 'Imprimir ticket'}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-medium text-slate-900">Evaluación de caja</div>
              {!csatSubmitted ? (
                <div className="mt-3 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Button
                      key={score}
                      variant={csatScore === score ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCsatScore(score)}
                    >
                      {score}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!saleData) return;
                      try {
                        localStorage.setItem(`csat:${saleData.id}`, String(csatScore ?? ''));
                      } catch {}
                      setCsatSubmitted(true);
                    }}
                  >
                    Enviar
                  </Button>
                </div>
              ) : (
                <div className="mt-2 text-sm text-emerald-600">Gracias por su respuesta</div>
              )}
            </div>

            {/* Botón "Listo" prominente — el cierre principal del modal.
                Antes solo había un X chiquito en el header; el cajero
                buscaba algo claro al final del flow. */}
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              <Check className="mr-2 h-4 w-4" />
              Listo
            </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

ReceiptModal.displayName = 'ReceiptModal';
