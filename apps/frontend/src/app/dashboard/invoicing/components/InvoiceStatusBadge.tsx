'use client';

import { Badge } from '@/components/ui/badge';
import type { PosInvoiceStatus } from '@/hooks/usePosInvoices';

const STATUS_LABELS: Record<PosInvoiceStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Pagada',
  overdue: 'Vencida',
  void: 'Anulada',
};

function statusClass(status: PosInvoiceStatus) {
  switch (status) {
    case 'draft':
      return 'bg-muted text-foreground';
    case 'issued':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200';
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'overdue':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
    case 'void':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200';
  }
}

export function InvoiceStatusBadge({ status }: { status: PosInvoiceStatus }) {
  return (
    <Badge variant="secondary" className={statusClass(status)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

