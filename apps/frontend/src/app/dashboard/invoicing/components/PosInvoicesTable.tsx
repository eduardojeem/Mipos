'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PosInvoiceListItem } from '@/hooks/usePosInvoices';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

function formatDate(value: string | null) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString();
}

function formatMoney(value: number, currency: string) {
  const v = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency || 'USD'}`;
  }
}

export function PosInvoicesTable({
  invoices,
  isLoading,
  error,
  onView,
  onNew,
  isSeeding,
  onSeedExampleData,
}: {
  invoices: PosInvoiceListItem[];
  isLoading: boolean;
  error: string | null;
  onView?: (id: string) => void;
  onNew?: () => void;
  isSeeding?: boolean;
  onSeedExampleData?: () => void | Promise<void>;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/50">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Emisión</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="h-6 w-20 animate-pulse rounded-full bg-muted" /></TableCell>
                <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="ml-auto h-8 w-20 animate-pulse rounded bg-muted" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        <p className="font-medium text-destructive mb-1">Error al cargar facturas</p>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Eye className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold">No se encontraron facturas</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Aún no tienes facturas registradas que coincidan con estos filtros.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onNew && (
            <Button type="button" variant="outline" onClick={onNew}>
              Nueva Factura
            </Button>
          )}
          {onSeedExampleData && (
            <Button type="button" onClick={() => onSeedExampleData()} disabled={isSeeding}>
              {isSeeding ? 'Generando…' : 'Cargar datos de ejemplo'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nº Factura</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Emisión / Vencimiento</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Total</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors group">
              <TableCell className="font-medium text-primary">
                {inv.invoiceNumber || '—'}
              </TableCell>
              <TableCell className="max-w-[240px] truncate font-medium">
                {inv.customerName || <span className="text-muted-foreground italic">Consumidor Final</span>}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={inv.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{formatDate(inv.issuedDate)}</span>
                  {inv.dueDate && (
                    <span className="text-xs text-muted-foreground">Vence: {formatDate(inv.dueDate)}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {formatMoney(inv.total, inv.currency)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView ? onView(inv.id) : undefined}
                  className="opacity-70 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Detalles
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
