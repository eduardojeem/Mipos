'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/ui/permission-guard';
import {
  CheckCircle,
  Clock,
  CreditCard,
  Package,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Return } from '../hooks/useReturns';

interface ReturnsTableProps {
  returns: Return[];
  isLoading: boolean;
  actionsDisabled?: boolean;
  onViewDetails: (returnItem: Return) => void;
  onUpdateStatus: (id: string, status: string, notes?: string) => Promise<unknown>;
  onProcess: (id: string) => Promise<unknown>;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  approved: {
    label: 'Aprobada',
    icon: CheckCircle,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  processed: {
    label: 'Procesada',
    icon: Package,
    className:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  },
  completed: {
    label: 'Procesada',
    icon: Package,
    className:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  },
  rejected: {
    label: 'Rechazada',
    icon: XCircle,
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  },
} as const;

const REFUND_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  bank_transfer: 'Transferencia',
  other: 'Otro',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Generates a deterministic pastel background color from a string */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function CustomerAvatar({ name }: { name: string }) {
  if (!name || name === '-') {
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        ?
      </div>
    );
  }
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);
  return (
    <div
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${colorClass}`}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!config) {
    return <span className="text-xs capitalize text-muted-foreground">{status}</span>;
  }

  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          <TableCell>
            <Skeleton className="h-3.5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 flex-shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
          <TableCell className="text-right"><Skeleton className="ml-auto h-3.5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-7 w-20 rounded-md" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function ReturnsTable({
  returns,
  isLoading,
  actionsDisabled = false,
  onViewDetails,
  onUpdateStatus,
  onProcess,
}: ReturnsTableProps) {
  if (!isLoading && !returns.length) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 shadow-inner dark:from-orange-950/40 dark:to-orange-900/20">
          <RotateCcw className="h-10 w-10 text-orange-400 dark:text-orange-500" />
        </div>
        <h3 className="mb-1.5 text-lg font-semibold">Sin devoluciones</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          No hay devoluciones que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableHead className="text-xs font-semibold uppercase tracking-wider">#</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wider">Cliente</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wider">Venta</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wider">Razón</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wider">Reembolso</TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">
            Monto
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wider">Fecha</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <LoadingRows />
        ) : (
          returns.map((returnRow) => (
            <TableRow
              key={returnRow.id}
              className="group cursor-pointer border-b border-border/50 transition-all duration-150 hover:bg-orange-50/40 dark:hover:bg-orange-950/10"
              onClick={() => onViewDetails(returnRow)}
            >
              <TableCell>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {returnRow.returnNumber}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <CustomerAvatar name={returnRow.customerName || ''} />
                  <span className="max-w-[130px] truncate text-sm font-medium">
                    {returnRow.customerName || 'Sin cliente'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  #{returnRow.saleId?.slice(0, 8).toUpperCase() || '-'}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className="max-w-[120px] truncate text-xs text-muted-foreground"
                  title={returnRow.reason}
                >
                  {returnRow.reason || '-'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm capitalize">
                    {REFUND_METHOD_LABEL[returnRow.refundMethod] || returnRow.refundMethod || '-'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-semibold">{formatCurrency(returnRow.totalAmount)}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={returnRow.status} />
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {formatDate(returnRow.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                <div
                  className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  {returnRow.status === 'pending' && (
                    <PermissionGuard permission="returns.approve">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        title="Aprobar"
                        disabled={actionsDisabled}
                        onClick={() => {
                          void onUpdateStatus(returnRow.id, 'approved');
                        }}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="Rechazar"
                        disabled={actionsDisabled}
                        onClick={() => {
                          void onUpdateStatus(returnRow.id, 'rejected');
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGuard>
                  )}

                  {returnRow.status === 'approved' && (
                    <PermissionGuard permission="returns.process">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                        title="Procesar"
                        disabled={actionsDisabled}
                        onClick={() => {
                          void onProcess(returnRow.id);
                        }}
                      >
                        <Package className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGuard>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs opacity-80"
                    title="Ver detalles"
                    onClick={() => onViewDetails(returnRow)}
                  >
                    Ver
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
