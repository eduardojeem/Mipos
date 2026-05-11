'use client';

import { Download, Printer, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PosInvoiceStatus } from '@/hooks/usePosInvoices';

function statusLabel(status: PosInvoiceStatus) {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'issued':
      return 'Emitida';
    case 'paid':
      return 'Pagada';
    case 'overdue':
      return 'Vencida';
    case 'void':
      return 'Anulada';
  }
}

export function PosInvoiceActionsCard({
  status,
  onSave,
  isSaving,
  onPrint,
  onPdf,
  isGeneratingPdf,
  canExport,
  exportDisabledReason,
}: {
  status: PosInvoiceStatus;
  onSave: () => void;
  isSaving: boolean;
  onPrint: () => void;
  onPdf: () => void;
  isGeneratingPdf: boolean;
  canExport: boolean;
  exportDisabledReason?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Acciones</CardTitle>
        <Badge variant="secondary">{statusLabel(status)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onPrint} disabled={!canExport}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={onPdf} disabled={!canExport || isGeneratingPdf}>
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPdf ? 'Generando' : 'PDF'}
          </Button>
        </div>
        {!canExport && exportDisabledReason ? (
          <p className="text-xs text-muted-foreground">{exportDisabledReason}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

