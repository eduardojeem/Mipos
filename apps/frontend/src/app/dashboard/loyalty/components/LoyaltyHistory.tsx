'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, History, ArrowUpCircle, ArrowDownCircle, Gift, Zap, Clock, AlertCircle } from 'lucide-react';

export interface PointsTransaction {
  id: string;
  type: 'EARNED' | 'REDEEMED' | 'BONUS' | 'ADJUSTMENT' | 'EXPIRED';
  points: number;
  description?: string;
  createdAt: string;
  customerId?: string;
}

interface LoyaltyHistoryProps {
  transactions: PointsTransaction[];
  isLoading: boolean;
  error: string | null;
  txType: string;
  selectedProgramId: string;
  programs: Array<{ id: string; name: string }>;
  onTxTypeChange: (type: string) => void;
  onProgramChange: (id: string) => void;
  onRefresh: () => void;
}

const TX_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  EARNED: {
    label: 'Ganados',
    icon: ArrowUpCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  REDEEMED: {
    label: 'Canjeados',
    icon: Gift,
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
  },
  BONUS: {
    label: 'Bono',
    icon: Zap,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  },
  ADJUSTMENT: {
    label: 'Ajuste',
    icon: ArrowDownCircle,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  },
  EXPIRED: {
    label: 'Expirados',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

function TxTypeBadge({ type }: { type: string }) {
  const cfg = TX_CONFIG[type];
  if (!cfg) return <span className="text-xs capitalize text-muted-foreground">{type}</span>;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-48" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function LoyaltyHistory({
  transactions,
  isLoading,
  error,
  txType,
  selectedProgramId,
  programs,
  onTxTypeChange,
  onProgramChange,
  onRefresh,
}: LoyaltyHistoryProps) {
  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <History className="h-4 w-4 text-muted-foreground" />
            Historial de puntos
          </div>
          {transactions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {transactions.length} registros
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Program selector */}
          {programs.length > 1 && (
            <Select value={selectedProgramId} onValueChange={onProgramChange}>
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue placeholder="Programa..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Type filter */}
          <Select value={txType} onValueChange={onTxTypeChange}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="EARNED">Ganados</SelectItem>
              <SelectItem value="REDEEMED">Canjeados</SelectItem>
              <SelectItem value="BONUS">Bono</SelectItem>
              <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
              <SelectItem value="EXPIRED">Expirados</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-2 p-6 text-red-600 text-sm dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase font-semibold tracking-wider">Fecha</TableHead>
                  <TableHead className="text-xs uppercase font-semibold tracking-wider">Tipo</TableHead>
                  <TableHead className="text-xs uppercase font-semibold tracking-wider text-right">Puntos</TableHead>
                  <TableHead className="text-xs uppercase font-semibold tracking-wider">Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <LoadingRows />
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Sin transacciones</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {txType !== 'all' ? 'Prueba con otro tipo de transacción' : 'No hay registros en este programa'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('es', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        <TxTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            tx.type === 'EARNED' || tx.type === 'BONUS'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tx.type === 'REDEEMED' || tx.type === 'EXPIRED'
                                ? 'text-red-600 dark:text-red-400'
                                : ''
                          }`}
                        >
                          {(tx.type === 'EARNED' || tx.type === 'BONUS') ? '+' : '-'}
                          {Math.abs(Number(tx.points || 0)).toLocaleString('es')}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="truncate text-sm text-muted-foreground" title={tx.description}>
                          {tx.description || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
