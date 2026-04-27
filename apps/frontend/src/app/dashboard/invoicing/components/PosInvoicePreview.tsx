'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

function formatMoney(value: number, currency: string) {
  const v = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency || 'USD'}`;
  }
}

export function PosInvoicePreview({
  setInvoiceRefs,
  invoiceNumber,
  issuedDate,
  dueDate,
  currency,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  customerTaxId,
  items,
  subtotal,
  discount,
  tax,
  total,
  notes,
}: {
  setInvoiceRefs: (el: HTMLDivElement | null) => void;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string | null;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerTaxId: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
}) {
  const { config, organizationName } = useBusinessConfig();
  const headerName = organizationName || 'Mi Empresa';

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={setInvoiceRefs} className="bg-white p-8 text-black">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">FACTURA</h1>
              <p className="text-gray-600">#{invoiceNumber || '—'}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{headerName}</div>
              <p className="text-gray-600">{(config as any)?.storeSettings?.address || ''}</p>
              <p className="text-gray-600">{(config as any)?.storeSettings?.phone || ''}</p>
              <p className="text-gray-600">{(config as any)?.storeSettings?.email || ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Facturar a:</h3>
              <div className="text-gray-600">
                <p className="font-medium">{customerName || '—'}</p>
                {customerAddress ? <p>{customerAddress}</p> : null}
                {customerPhone ? <p>{customerPhone}</p> : null}
                {customerEmail ? <p>{customerEmail}</p> : null}
                {customerTaxId ? <p>Doc: {customerTaxId}</p> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="font-semibold text-gray-800">Fecha: </span>
                <span className="text-gray-600">{new Date(issuedDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Vencimiento: </span>
                <span className="text-gray-600">{dueDate ? new Date(dueDate).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-800">Descripción</th>
                  <th className="text-center py-2 font-semibold text-gray-800">Cantidad</th>
                  <th className="text-right py-2 font-semibold text-gray-800">Precio Unit.</th>
                  <th className="text-right py-2 font-semibold text-gray-800">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${idx}-${it.description}`} className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">{it.description}</td>
                    <td className="py-2 text-center text-gray-700">{it.quantity}</td>
                    <td className="py-2 text-right text-gray-700">{formatMoney(it.unitPrice, currency)}</td>
                    <td className="py-2 text-right font-medium text-gray-700">{formatMoney(it.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatMoney(subtotal, currency)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Descuento:</span>
                  <span className="font-medium">-{formatMoney(discount, currency)}</span>
                </div>
              ) : null}
              {tax > 0 ? (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Impuesto:</span>
                  <span className="font-medium">{formatMoney(tax, currency)}</span>
                </div>
              ) : null}
              <div className="border-t border-gray-300 mt-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-800">Total:</span>
                  <span className="text-lg font-bold text-blue-600">{formatMoney(total, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {notes ? (
            <div className="mt-8">
              <h4 className="font-semibold text-gray-800 mb-2">Notas:</h4>
              <div className="text-gray-600 whitespace-pre-wrap">{notes}</div>
            </div>
          ) : null}

          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
            <p>Gracias por su preferencia</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
