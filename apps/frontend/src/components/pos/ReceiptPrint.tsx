'use client';

import React, { forwardRef } from 'react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import {
  getPaymentMethodLabel,
  INTERNAL_TICKET_LABEL,
  type PosInternalTicket,
} from '@/lib/pos/internal-ticket';

interface ReceiptPrintProps {
  ticketData: PosInternalTicket;
  companyInfo: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    ruc?: string;
    taxId?: string;
    website?: string;
  };
}

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptPrintProps>(
  ({ ticketData, companyInfo }, ref) => {
    const fmtCurrency = useCurrencyFormatter();

    const company = {
      name: companyInfo.name || 'Mi Negocio',
      address: companyInfo.address || '',
      phone: companyInfo.phone || '',
      email: companyInfo.email || '',
      taxId: companyInfo.taxId || companyInfo.ruc || '',
      website: companyInfo.website || '',
    };

    const saleDate = new Date(ticketData.createdAt);

    return (
      <div
        ref={ref}
        className="receipt-print mx-auto max-w-sm bg-white p-4 font-mono text-sm"
        style={{
          width: '80mm',
          fontSize: '12px',
          lineHeight: '1.25',
          color: '#000',
        }}
      >
        <div className="mb-3 border-b border-dashed border-gray-400 pb-3 text-center">
          <h1 className="mb-1 text-lg font-bold">{company.name}</h1>
          {company.address && <p className="text-xs">{company.address}</p>}
          {company.phone && <p className="text-xs">Tel: {company.phone}</p>}
          {company.email && <p className="text-xs">{company.email}</p>}
          {company.taxId && <p className="text-xs">RUC/ID: {company.taxId}</p>}
        </div>

        <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-700">
            {ticketData.documentSubtitle}
          </p>
          <p className="mt-1 text-xs font-bold text-red-800">{ticketData.documentDisclaimer}</p>
        </div>

        <div className="mb-3 space-y-1 text-xs">
          <div className="flex justify-between gap-3">
            <span>{INTERNAL_TICKET_LABEL}:</span>
            <span>{ticketData.documentNumber}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Fecha:</span>
            <span>
              {saleDate.toLocaleDateString('es-PY')} {saleDate.toLocaleTimeString('es-PY')}
            </span>
          </div>
          {ticketData.cashier && (
            <div className="flex justify-between gap-3">
              <span>Cajero:</span>
              <span>{ticketData.cashier}</span>
            </div>
          )}
          {ticketData.customer?.name && (
            <div className="flex justify-between gap-3">
              <span>Cliente:</span>
              <span>{ticketData.customer.name}</span>
            </div>
          )}
        </div>

        <div className="mb-3 border-b border-dashed border-gray-400 pb-3">
          <div className="mb-2 text-xs font-bold">PRODUCTOS</div>
          {ticketData.items.map((item) => (
            <div key={item.id} className="mb-2">
              <div className="flex justify-between gap-3">
                <span className="flex-1 truncate pr-2">{item.productName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>{item.quantity} x {fmtCurrency(item.unitPrice)}</span>
                <span>{fmtCurrency(item.totalPrice)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{fmtCurrency(ticketData.subtotal)}</span>
          </div>
          {ticketData.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Descuento:</span>
              <span>-{fmtCurrency(ticketData.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>IVA:</span>
            <span>{fmtCurrency(ticketData.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-gray-400 pt-1 text-base font-bold">
            <span>TOTAL:</span>
            <span>{fmtCurrency(ticketData.totalAmount)}</span>
          </div>
        </div>

        <div className="mt-3 text-xs">
          <div className="flex justify-between">
            <span>Método de pago:</span>
            <span>{getPaymentMethodLabel(ticketData.paymentMethod)}</span>
          </div>
          {ticketData.transferReference && (
            <div className="mt-1 flex justify-between gap-3">
              <span>Referencia:</span>
              <span>{ticketData.transferReference}</span>
            </div>
          )}
        </div>

        {ticketData.notes && (
          <div className="mt-3 border-t border-dashed border-gray-400 pt-2 text-xs">
            <span className="font-semibold">Notas:</span>
            <p className="mt-1">{ticketData.notes}</p>
          </div>
        )}

        <div className="mt-4 border-t border-dashed border-gray-400 pt-3 text-center text-xs">
          <p>{ticketData.documentDescription}</p>
          <p className="mt-1 font-semibold">{ticketData.documentDisclaimer}</p>
          {company.website && <p className="mt-2">{company.website}</p>}
        </div>

        <style jsx>{`
          @media print {
            .receipt-print {
              width: 80mm !important;
              margin: 0 !important;
              padding: 5mm !important;
              font-size: 10px !important;
            }

            body {
              margin: 0;
              padding: 0;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}</style>
      </div>
    );
  },
);

ReceiptPrint.displayName = 'ReceiptPrint';

export default ReceiptPrint;
