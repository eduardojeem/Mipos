import React, { useState, useRef, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Printer,
  CheckCircle,
  Share2,
  MessageCircle,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { SaleResponse } from '../../lib/api';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: SaleResponse | null;
  onPrint: () => void;
  onDownload: () => void;
  businessInfo?: {
    name: string;
    address: string;
    phone: string;
    taxId: string;
    logo?: string;
    email?: string;
    website?: string;
  };
  thermalPrinter?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = React.memo(({
  isOpen,
  onClose,
  saleData,
  onPrint,
  onDownload,
  businessInfo = {
    name: 'Mi Negocio',
    address: 'Dirección del negocio',
    phone: 'Teléfono: 000-000-000',
    taxId: 'NIF: 00000000A',
    email: 'contacto@minegocio.com',
    website: 'www.minegocio.com'
  },
  thermalPrinter = false
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fmtCurrency = useCurrencyFormatter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [csatScore, setCsatScore] = useState<number | null>(null);
  const [csatSubmitted, setCsatSubmitted] = useState(false);

  // Cálculos robustos memorizados
  const { subtotal, tax, discount, total } = useMemo(() => {
    if (!saleData) return { subtotal: 0, tax: 0, discount: 0, total: 0 };

    // 1. Obtener valores finales de la BD (Fuente de la verdad)
    const totalVal = Number(saleData.totalAmount || 0);
    const taxVal = Number(saleData.taxAmount || 0);
    const discountVal = Number(saleData.discountAmount || 0);

    // 2. Calcular Subtotal hacia atrás para asegurar consistencia matemática visual
    // Si Total = Subtotal - Descuento + Impuesto
    // Entonces: Subtotal = Total + Descuento - Impuesto
    const calculatedSubtotal = totalVal + discountVal - taxVal;

    return {
      subtotal: calculatedSubtotal,
      tax: taxVal,
      discount: discountVal,
      total: totalVal
    };
  }, [saleData]);

  if (!isOpen || !saleData) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const buildQR = async () => {
      if (!saleData) return;
      const text = `Venta #${saleData.id} - ${fmtCurrency(total)}`;
      try {
        const url = await QRCode.toDataURL(text, { width: 128, margin: 0 });
        setQrDataUrl(url);
      } catch {}
    };
    buildQR();
  }, [saleData, total]);

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'CASH': return 'Efectivo';
      case 'CARD': return 'Tarjeta';
      case 'TRANSFER': return 'Transferencia';
      case 'OTHER': return 'Otro';
      default: return type;
    }
  };

  // Generar texto plano del recibo para compartir
  const generateReceiptText = () => {
    const itemsList = saleData.items.map(item =>
      `${item.quantity}x ${item.productName} (${fmtCurrency(item.unitPrice)}) = ${fmtCurrency(item.quantity * item.unitPrice)}`
    ).join('\n');

    return `
*${businessInfo.name}*
${businessInfo.address}
--------------------------------
*RECIBO #${saleData.id.slice(-8).toUpperCase()}*
Fecha: ${formatDate(saleData.createdAt)}
--------------------------------
${itemsList}
--------------------------------
Subtotal: ${fmtCurrency(subtotal)}
${discount > 0 ? `Descuento: -${fmtCurrency(discount)}\n` : ''}IVA: ${fmtCurrency(tax)}
*TOTAL: ${fmtCurrency(total)}*
--------------------------------
Método de pago: ${saleData.paymentMethod === 'MIXED' ? 'Mixto' : getPaymentTypeLabel(saleData.paymentMethod)}
--------------------------------
¡Gracias por su compra!
    `.trim();
  };

  const handleWhatsAppShare = () => {
    const text = generateReceiptText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmailShare = () => {
    const text = generateReceiptText();
    const subject = `Recibo de compra - ${businessInfo.name}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recibo ${businessInfo.name}`,
          text: generateReceiptText(),
        });
      } catch (err) {
        console.error('Error al compartir:', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleThermalPrint = async () => {
    setIsPrinting(true);
    try {
      const thermalReceipt = createThermalReceipt();
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      if (printWindow) {
        printWindow.document.write(thermalReceipt);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
      onPrint();
    } catch (error) {
      console.error('Error printing:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const createThermalReceipt = (): string => {
    const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`Venta #${saleData.id} - ${fmtCurrency(total)}`)}`;
    const qrUrl = qrDataUrl || fallbackQr;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recibo</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 5mm; width: 80mm; color: #000; }
          .header { text-align: center; margin-bottom: 10px; }
          .bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .item-row { margin-bottom: 4px; }
          .item-name { font-weight: bold; }
          .item-details { display: flex; justify-content: space-between; padding-left: 10px; font-size: 11px; }
          .total-section { margin-top: 10px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          .qr-container { text-align: center; margin-top: 10px; display: flex; justify-content: center; }
          img { width: 120px; height: 120px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="${businessInfo.name}" style="max-height:50px;margin-bottom:6px;" />` : ''}
          <div class="bold text-lg">${businessInfo.name}</div>
          <div>${businessInfo.address}</div>
          ${businessInfo.phone ? `<div>${businessInfo.phone}</div>` : ''}
          ${businessInfo.taxId ? `<div>ID Fiscal: ${businessInfo.taxId}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span>Recibo:</span>
          <span>#${saleData.id.slice(-8).toUpperCase()}</span>
        </div>
        <div class="row">
          <span>Fecha:</span>
          <span>${formatDate(saleData.createdAt)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div>
          ${saleData.items.map((item) => `
            <div class="item-row">
              <div class="item-name">${item.productName}</div>
              <div class="item-details">
                <span>${item.quantity} x ${fmtCurrency(item.unitPrice)}</span>
                <span>${fmtCurrency(item.quantity * item.unitPrice)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="divider"></div>
        
        <div class="total-section">
          <div class="row">
            <span>Subtotal:</span>
            <span>${fmtCurrency(subtotal)}</span>
          </div>
          ${discount > 0 ? `
          <div class="row">
            <span>Descuento:</span>
            <span>-${fmtCurrency(discount)}</span>
          </div>` : ''}
          <div class="row">
            <span>IVA:</span>
            <span>${fmtCurrency(tax)}</span>
          </div>
          <div class="row bold text-lg" style="margin-top: 5px;">
            <span>TOTAL:</span>
            <span>${fmtCurrency(total)}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        ${saleData.paymentMethod === 'MIXED' && Array.isArray(saleData.mixedPayments) ? `
          ${saleData.mixedPayments.map((p) => `
            <div class="row"><span>${getPaymentTypeLabel(p.type)}:</span><span>${fmtCurrency(p.amount)}</span></div>
            ${p.details?.lastFourDigits ? `<div class="row"><span>Tarjeta:</span><span>**** ${p.details.lastFourDigits}${p.details.cardType ? ' ' + p.details.cardType : ''}</span></div>` : ''}
            ${p.details?.authorizationCode ? `<div class="row"><span>Autorización:</span><span>${p.details.authorizationCode}</span></div>` : ''}
            ${p.details?.reference ? `<div class="row"><span>Ref:</span><span>${p.details.reference}</span></div>` : ''}
          `).join('')}
        ` : `
          <div class="row"><span>Pago:</span><span>${getPaymentTypeLabel(saleData.paymentMethod)}</span></div>
          ${saleData.paymentMethod === 'CASH' && typeof saleData.cashReceived === 'number' ? `
            <div class="row"><span>Entregado:</span><span>${fmtCurrency(saleData.cashReceived)}</span></div>
            <div class="row"><span>Vuelto:</span><span>${fmtCurrency(saleData.change || 0)}</span></div>
          ` : ''}
        `}
        
        <div class="qr-container">
          <img src="${qrUrl}" alt="QR Code" />
        </div>
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePDFDownload = async () => {
    setIsDownloading(true);
    try {
      const receiptContent = createThermalReceipt();
      const blob = new Blob([receiptContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket_${saleData.id.slice(-8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownload();
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setIsDownloading(false);
    }
  };

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
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-modal-title"
        >
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 dark:bg-white/5 transform -skew-y-6 origin-top-left scale-150"></div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-white dark:bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-700 shadow-lg relative z-10"
            >
              <CheckCircle size={32} strokeWidth={3} />
            </motion.div>

            <h2 id="receipt-modal-title" className="text-2xl font-bold relative z-10 text-white dark:text-white">¡Venta Exitosa!</h2>
            <p className="text-blue-100 dark:text-blue-200 relative z-10">Recibo #{saleData.id.slice(-8).toUpperCase()}</p>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 dark:hover:bg-white/10 p-2 rounded-full transition-colors z-20"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cuerpo del Recibo (Scrollable) */}
          <ScrollArea className="flex-1 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="p-6">
              {/* Tarjeta de Recibo Visual */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 relative overflow-hidden">
                {/* Decoración de borde dentado (simulado) */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-600 dark:via-purple-600 dark:to-pink-600"></div>

                <div className="text-center mb-6">
                  {businessInfo.logo && (
                    <img
                      src={businessInfo.logo}
                      alt={businessInfo.name}
                      className="mx-auto mb-2 h-12 w-auto object-contain"
                    />
                  )}
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{businessInfo.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{businessInfo.address}</p>
                  {businessInfo.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{businessInfo.phone}</p>
                  )}
                  {businessInfo.taxId && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">ID Fiscal: {businessInfo.taxId}</p>
                  )}
                  {businessInfo.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{businessInfo.email}</p>
                  )}
                  {businessInfo.website && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{businessInfo.website}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(saleData.createdAt)}</p>
                </div>

                <Separator className="my-4" />

                {/* Lista de Productos */}
                <div className="space-y-3 mb-6">
                  {saleData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm group">
                      <div className="flex-1 pr-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.productName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} x {fmtCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="font-semibold text-gray-700 dark:text-gray-300">
                        {fmtCurrency(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Totales */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>{fmtCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Descuento</span>
                      <span>-{fmtCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>IVA</span>
                    <span>{fmtCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span>Total</span>
                    <span>{fmtCurrency(total)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                  {saleData.paymentMethod === 'MIXED' && Array.isArray(saleData.mixedPayments) ? (
                    <div className="space-y-2">
                      <div className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400">Pago Mixto</span>
                      </div>
                      <div className="mt-2 space-y-2 text-sm">
                        {saleData.mixedPayments.map((p, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-700">{getPaymentTypeLabel(p.type)}</span>
                              <span className="font-medium">{fmtCurrency(p.amount)}</span>
                            </div>
                            {(p.details?.lastFourDigits || p.details?.authorizationCode || p.details?.reference || p.details?.cardType) && (
                              <div className="flex justify-between text-[11px] text-gray-500">
                                <span>
                                  {p.details?.cardType ? `Tarjeta ${p.details.cardType}` : (p.details?.reference ? 'Referencia' : (p.details?.authorizationCode ? 'Autorización' : ''))}
                                </span>
                                <span>
                                  {p.details?.lastFourDigits ? `**** ${p.details.lastFourDigits}` : (p.details?.reference || p.details?.authorizationCode || '')}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getPaymentTypeLabel(saleData.paymentMethod)}
                      </span>
                      {saleData.paymentMethod === 'CASH' && (typeof saleData.cashReceived === 'number') && (
                        <div className="text-xs text-gray-600">
                          Entregado {fmtCurrency(saleData.cashReceived)} · Vuelto {fmtCurrency(saleData.change || 0)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col items-center justify-center">
                  <img
                    src={qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`Venta #${saleData.id} - ${fmtCurrency(total)}`)}`}
                    alt="Código QR de verificación"
                    className="w-32 h-32 border p-2 rounded-lg"
                  />
                  <p className="text-[10px] text-gray-400 mt-2">Escanear para verificar</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer con Acciones */}
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-3">
            {/* Acciones Rápidas (Iconos) */}
            <div className="grid grid-cols-4 gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex flex-col h-auto py-2 gap-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={handleWhatsAppShare}>
                      <MessageCircle size={20} />
                      <span className="text-[10px]">WhatsApp</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar por WhatsApp</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex flex-col h-auto py-2 gap-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={handleEmailShare}>
                      <Mail size={20} />
                      <span className="text-[10px]">Email</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar por Correo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex flex-col h-auto py-2 gap-1 hover:bg-gray-50" onClick={handleCopy}>
                      {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                      <span className="text-[10px]">{copied ? 'Copiado' : 'Copiar'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar texto del recibo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex flex-col h-auto py-2 gap-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200" onClick={handleNativeShare}>
                      <Share2 size={20} />
                      <span className="text-[10px]">Compartir</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compartir en otras apps</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Acciones Principales */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePDFDownload}
                disabled={isDownloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? '...' : 'PDF'}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={thermalPrinter ? handleThermalPrint : onPrint}
                disabled={isPrinting}
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? 'Imprimiendo...' : 'Imprimir Ticket'}
              </Button>
            </div>

            <div className="mt-4 p-3 border border-border dark:border-border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-sm font-medium mb-2 text-foreground dark:text-foreground">¿Cómo fue su experiencia en caja?</div>
              {!csatSubmitted ? (
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map((n) => (
                    <Button key={n} variant={csatScore === n ? 'default' : 'outline'} size="sm" onClick={() => setCsatScore(n)}>
                      {n}
                    </Button>
                  ))}
                  <Button size="sm" onClick={() => { if (saleData) { try { const key = `csat:${saleData.id}`; localStorage.setItem(key, String(csatScore ?? '')); } catch {} } setCsatSubmitted(true); }}>Enviar</Button>
                </div>
              ) : (
                <div className="text-sm text-green-600 dark:text-green-400">Gracias por su respuesta</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

ReceiptModal.displayName = 'ReceiptModal';
