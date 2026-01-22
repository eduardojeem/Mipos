'use client';

import React, { forwardRef } from 'react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { Customer } from '@/types';

interface POSItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  id: string;
  items: POSItem[];
  customer?: Customer | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  notes?: string;
  total: number;
  paymentMethod: string;
  date: Date;
  cashier?: string;
}

interface ReceiptPrintProps {
  receiptData: {
    id: string;
    items: Array<{
      product_name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    customer?: {
      name: string;
      phone?: string;
      email?: string;
    } | null;
    subtotal: number;
    tax: number;
    discount: number;
    discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
    notes?: string;
    total: number;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
    date: string;
    cashier?: string;
    couponCode?: string;
  };
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
  ({ receiptData, companyInfo }, ref) => {
    const fmtCurrency = useCurrencyFormatter();
    const defaultCompanyInfo = {
      name: 'Mi Empresa POS',
      address: 'Calle Principal #123, Ciudad',
      phone: '+52 (555) 123-4567',
      email: 'contacto@miempresa.com',
      taxId: 'RFC123456789',
      website: 'www.miempresa.com'
    };

    const company = companyInfo || defaultCompanyInfo;
    const companyTaxId = company.taxId || company.ruc;
    const idLabel = companyTaxId ? 'ID Fiscal' : null;
    const companyWebsite = company.website || defaultCompanyInfo.website;

    const saleDate = typeof receiptData.date === 'string' 
      ? new Date(receiptData.date) 
      : (receiptData.date as unknown as Date);

    return (
      <div 
        ref={ref}
        className="receipt-print bg-white p-4 max-w-sm mx-auto font-mono text-sm"
        style={{
          width: '80mm',
          fontSize: '12px',
          lineHeight: '1.2',
          color: '#000'
        }}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <h1 className="font-bold text-lg mb-1">{company.name}</h1>
          {company.address && <p className="text-xs">{company.address}</p>}
          {company.phone && <p className="text-xs">Tel: {company.phone}</p>}
          {company.email && <p className="text-xs">{company.email}</p>}
          {idLabel && companyTaxId && (
            <p className="text-xs">{idLabel}: {companyTaxId}</p>
          )}
        </div>

        {/* Sale Info */}
        <div className="mb-2 text-xs">
          <div className="flex justify-between">
            <span>Recibo:</span>
            <span>#{receiptData.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{saleDate.toLocaleDateString('es-MX')} {saleDate.toLocaleTimeString('es-MX')}</span>
          </div>
          {receiptData.cashier && (
            <div className="flex justify-between">
              <span>Cajero:</span>
              <span>{receiptData.cashier}</span>
            </div>
          )}
          {receiptData.customer && (
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{receiptData.customer.name}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="text-xs font-bold mb-1">PRODUCTOS</div>
          {(Array.isArray(receiptData.items) ? receiptData.items : []).map((item, index) => (
            <div key={index} className="mb-1">
              <div className="flex justify-between">
                <span className="flex-1 truncate pr-2">{item.product_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>{item.quantity} x {fmtCurrency(item.price)}</span>
                <span>{fmtCurrency(item.quantity * item.price)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{fmtCurrency(receiptData.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%):</span>
            <span>{fmtCurrency(receiptData.tax)}</span>
          </div>
          {receiptData.discount > 0 && (
            <div className="flex justify-between">
              <span>Descuento ({receiptData.discountType === 'PERCENTAGE' ? '%' : 'Monto'}):</span>
              <span>-{fmtCurrency(receiptData.discount)}</span>
            </div>
          )}
          {receiptData.couponCode && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Cupón aplicado:</span>
              <span>{receiptData.couponCode}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-400 pt-1">
            <span>TOTAL:</span>
            <span>{fmtCurrency(receiptData.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {receiptData.notes && (
          <div className="mt-2 text-xs">
            <div className="border-t border-dashed border-gray-400 pt-1">
              <span className="font-semibold">Notas:</span>
              <p className="mt-1">{receiptData.notes}</p>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="mt-2 text-xs">
          <div className="flex justify-between">
            <span>Método de pago:</span>
            <span>
              {receiptData.paymentMethod === 'CASH' && 'Efectivo'}
              {receiptData.paymentMethod === 'CARD' && 'Tarjeta'}
              {receiptData.paymentMethod === 'TRANSFER' && 'Transferencia'}
              {receiptData.paymentMethod === 'OTHER' && 'Otro'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 pt-2 border-t border-dashed border-gray-400 text-xs">
          <p>¡Gracias por su compra!</p>
          <p>Conserve este ticket</p>
          {companyWebsite && <p className="mt-2">{companyWebsite}</p>}
        </div>

        {/* Print Styles */}
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
  }
);

ReceiptPrint.displayName = 'ReceiptPrint';

export default ReceiptPrint;
