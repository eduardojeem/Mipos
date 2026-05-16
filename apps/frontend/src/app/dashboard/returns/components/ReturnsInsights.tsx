'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, Package, TrendingDown, TrendingUp, User } from 'lucide-react';
import { useReturnsKpis } from '../hooks/useReturnsKpis';
import { formatCurrency } from '@/lib/utils';

interface ReturnsInsightsProps {
  /** Días del periodo. Default 30. */
  periodDays?: number;
}

function formatSeconds(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

export function ReturnsInsights({ periodDays = 30 }: ReturnsInsightsProps) {
  const { data, isLoading, error } = useReturnsKpis({ periodDays });

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-300">
          No se pudieron cargar las métricas de devoluciones. La RPC
          get_returns_kpis() puede no estar desplegada todavía.
        </CardContent>
      </Card>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Headline KPIs — return rate + avg processing time + fraud signal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tasa de devolución
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{kpis?.return_rate_pct ?? 0}%</span>
                {(kpis?.return_rate_pct ?? 0) > 5 ? (
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {kpis?.total_count ?? 0} devoluciones · {kpis?.sales_count_period ?? 0} ventas · últimos {periodDays}d
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tiempo promedio de procesamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {formatSeconds(kpis?.avg_seconds_to_process ?? 0)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                De PENDING a COMPLETED. Datos completos requieren la migración
                de columnas processed_at.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card
        className={
          (kpis?.fraud_signals?.self_return_count ?? 0) > 0
            ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
            : ''
        }
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Señales de fraude
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {kpis?.fraud_signals?.self_return_count ?? 0}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Returns hechos por el mismo cajero que vendió ·{' '}
                {formatCurrency(kpis?.fraud_signals?.self_return_amount ?? 0)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top products */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Package className="h-4 w-4" />
            Productos más devueltos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (kpis?.top_products?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
          ) : (
            <ul className="space-y-1.5">
              {kpis!.top_products.slice(0, 5).map((p) => (
                <li
                  key={p.product_id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">{p.product_name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{p.qty}u.</Badge>
                    <span>{p.return_count}x</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Top reasons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Motivos más comunes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (kpis?.top_reasons?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
          ) : (
            <ul className="space-y-1.5">
              {kpis!.top_reasons.slice(0, 5).map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{r.reason}</span>
                  <Badge variant="secondary">{r.cnt}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Top cashiers */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <User className="h-4 w-4" />
            Cajeros con más devoluciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (kpis?.top_cashiers?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {kpis!.top_cashiers.map((c) => (
                <li
                  key={c.user_id}
                  className="rounded-lg border bg-muted/20 p-2 text-sm"
                >
                  <p className="truncate font-medium">{c.user_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.cnt} devoluciones · {formatCurrency(c.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
