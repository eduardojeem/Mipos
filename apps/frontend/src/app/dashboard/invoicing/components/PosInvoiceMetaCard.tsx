'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PosInvoiceStatus } from '@/hooks/usePosInvoices';

function normalizeCurrency(value: string) {
  const c = String(value || '').trim();
  return c ? c.slice(0, 8) : 'USD';
}

export function PosInvoiceMetaCard({
  invoiceNumber,
  onInvoiceNumberChange,
  status,
  onStatusChange,
  currency,
  onCurrencyChange,
  issuedDate,
  onIssuedDateChange,
  dueDate,
  onDueDateChange,
  isDraft,
}: {
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  status: PosInvoiceStatus;
  onStatusChange: (status: PosInvoiceStatus) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  issuedDate: string;
  onIssuedDateChange: (value: string) => void;
  dueDate: string | null;
  onDueDateChange: (value: string | null) => void;
  isDraft: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Factura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Número</Label>
          <Input value={invoiceNumber} onChange={(e) => onInvoiceNumberChange(e.target.value)} disabled={!isDraft} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Emisión</Label>
            <Input type="date" value={issuedDate} onChange={(e) => onIssuedDateChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vencimiento</Label>
            <Input type="date" value={dueDate || ''} onChange={(e) => onDueDateChange(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Input
              value={currency}
              onChange={(e) => onCurrencyChange(normalizeCurrency(e.target.value))}
              disabled={!isDraft}
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => onStatusChange(v as PosInvoiceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="issued">Emitida</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
                <SelectItem value="void">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

