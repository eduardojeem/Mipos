'use client';

import { useMemo, useState } from 'react';
import type { PosInvoice, PosInvoiceCreateInput, PosInvoiceStatus } from '@/hooks/usePosInvoices';
import { PosInvoiceActionsCard } from './PosInvoiceActionsCard';
import { PosInvoiceMetaCard } from './PosInvoiceMetaCard';
import { PosInvoiceCustomerCard } from './PosInvoiceCustomerCard';
import { PosInvoiceItemsCard } from './PosInvoiceItemsCard';
import { PosInvoicePreview } from './PosInvoicePreview';
import { useInvoiceExport } from './useInvoiceExport';

type Props = {
  initial: {
    invoiceNumber?: string;
    status?: PosInvoiceStatus;
    currency?: string;
    issuedDate?: string;
    dueDate?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    customerTaxId?: string | null;
    items?: Array<{ id?: string; description: string; quantity: number; unitPrice: number }>;
    discount?: number;
    tax?: number;
    notes?: string;
  };
  isSaving: boolean;
  onSave: (payload: PosInvoiceCreateInput) => Promise<void> | void;
};

export function PosInvoiceEditor({ initial, isSaving, onSave }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoiceNumber || '');
  const [status, setStatus] = useState<PosInvoiceStatus>(initial.status || 'draft');
  const [currency, setCurrency] = useState(initial.currency || 'USD');
  const [issuedDate, setIssuedDate] = useState(initial.issuedDate || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string | null>(
    initial.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [customerId, setCustomerId] = useState<string | null>(initial.customerId ?? null);
  const [customerName, setCustomerName] = useState(initial.customerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail ?? '');
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone ?? '');
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress ?? '');
  const [customerTaxId, setCustomerTaxId] = useState(initial.customerTaxId ?? '');

  const [discount, setDiscount] = useState<number>(Number(initial.discount || 0));
  const [tax, setTax] = useState<number>(Number(initial.tax || 0));
  const [notes, setNotes] = useState(initial.notes ?? '');

  const [items, setItems] = useState<Array<{ id: string; description: string; quantity: number; unitPrice: number }>>(
    (initial.items && initial.items.length > 0)
      ? initial.items.map((it, idx) => ({
        id: it.id || `${Date.now()}-${idx}`,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
      }))
      : [{ id: `${Date.now()}-0`, description: '', quantity: 1, unitPrice: 0 }]
  );

  const computed = useMemo(() => {
    const mapped = items
      .map((it) => {
        const description = String(it.description || '').trim();
        const quantity = Number(it.quantity);
        const unitPrice = Number(it.unitPrice);
        if (!description) return null;
        if (!Number.isFinite(quantity) || quantity <= 0) return null;
        if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
        const total = quantity * unitPrice;
        return { description, quantity, unitPrice, total };
      })
      .filter(Boolean) as Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    const subtotal = mapped.reduce((sum, it) => sum + it.total, 0);
    const d = Number.isFinite(discount) ? Math.max(0, discount) : 0;
    const t = Number.isFinite(tax) ? Math.max(0, tax) : 0;
    const total = Math.max(0, subtotal - d + t);
    return { items: mapped, subtotal, total, discount: d, tax: t };
  }, [items, discount, tax]);

  const exportTools = useInvoiceExport();
  const isDraft = status === 'draft';

  const handleSave = async () => {
    const payload: PosInvoiceCreateInput = {
      invoiceNumber: invoiceNumber || undefined,
      status,
      currency,
      issuedDate,
      dueDate,
      customerId,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      customerAddress: customerAddress || null,
      customerTaxId: customerTaxId || null,
      items: items.map((it) => ({ id: it.id, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })),
      discount,
      tax,
      notes,
    };
    await onSave(payload);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-1">
        <PosInvoiceActionsCard
          status={status}
          onSave={handleSave}
          isSaving={isSaving}
          onPrint={exportTools.handlePrint}
          onPdf={() => exportTools.generatePDF(`factura-${invoiceNumber || 'sin-numero'}.pdf`)}
          isGeneratingPdf={exportTools.isGenerating}
        />
        <PosInvoiceMetaCard
          invoiceNumber={invoiceNumber}
          onInvoiceNumberChange={setInvoiceNumber}
          status={status}
          onStatusChange={setStatus}
          currency={currency}
          onCurrencyChange={setCurrency}
          issuedDate={issuedDate}
          onIssuedDateChange={setIssuedDate}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          isDraft={isDraft}
        />
        <PosInvoiceCustomerCard
          customerId={customerId}
          onCustomerIdChange={setCustomerId}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          customerEmail={customerEmail}
          onCustomerEmailChange={setCustomerEmail}
          customerPhone={customerPhone}
          onCustomerPhoneChange={setCustomerPhone}
          customerAddress={customerAddress}
          onCustomerAddressChange={setCustomerAddress}
          customerTaxId={customerTaxId}
          onCustomerTaxIdChange={setCustomerTaxId}
          isDraft={isDraft}
        />
        <PosInvoiceItemsCard
          items={items}
          onItemsChange={setItems}
          discount={discount}
          onDiscountChange={setDiscount}
          tax={tax}
          onTaxChange={setTax}
          notes={notes}
          onNotesChange={setNotes}
          isDraft={isDraft}
        />
      </div>

      <div className="lg:col-span-2">
        <PosInvoicePreview
          setInvoiceRefs={exportTools.setInvoiceRefs}
          invoiceNumber={invoiceNumber}
          issuedDate={issuedDate}
          dueDate={dueDate}
          currency={currency}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          customerTaxId={customerTaxId}
          items={computed.items}
          subtotal={computed.subtotal}
          discount={computed.discount}
          tax={computed.tax}
          total={computed.total}
          notes={notes}
        />
      </div>
    </div>
  );
}

export function mapInvoiceToEditorInitial(invoice: PosInvoice) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    currency: invoice.currency,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    customerTaxId: invoice.customerTaxId,
    items: invoice.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
    discount: invoice.discount,
    tax: invoice.tax,
    notes: invoice.notes,
  };
}
