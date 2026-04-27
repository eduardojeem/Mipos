"use client";

import React, { memo } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Clock3,
  MapPin,
  Monitor,
  Receipt,
  TrendingDown,
  TrendingUp,
  User2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import type { CashSession } from "@/types/cash";

interface ActiveSessionOverviewProps {
  session: CashSession | null;
}

function truncateId(id: string | null | undefined, length = 8): string {
  if (!id) return "-";
  return id.length > length ? `${id.slice(0, length)}…` : id;
}

const SUMMARY_ITEMS = [
  {
    key: "openingAmount",
    label: "Monto inicial",
    icon: Wallet,
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-700/40",
    ring: "ring-slate-300/30 dark:ring-slate-600/30",
    getValue: (session: CashSession) => formatCurrency(Number(session.openingAmount || 0)),
  },
  {
    key: "totalSold",
    label: "Ventas del turno",
    icon: Receipt,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    ring: "ring-blue-300/30 dark:ring-blue-500/20",
    getValue: (session: CashSession) => formatCurrency(Number(session.summary?.totalSold || 0)),
  },
  {
    key: "expectedCash",
    label: "Efectivo esperado",
    icon: Banknote,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    ring: "ring-emerald-300/30 dark:ring-emerald-500/20",
    getValue: (session: CashSession) =>
      formatCurrency(Number(session.summary?.expectedCash || 0)),
  },
  {
    key: "manualIn",
    label: "Ingresos manuales",
    icon: ArrowDownCircle,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-500/10",
    ring: "ring-teal-300/30 dark:ring-teal-500/20",
    getValue: (session: CashSession) => formatCurrency(Number(session.summary?.manualIn || 0)),
  },
  {
    key: "manualOut",
    label: "Egresos manuales",
    icon: ArrowUpCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    ring: "ring-rose-300/30 dark:ring-rose-500/20",
    getValue: (session: CashSession) => formatCurrency(Number(session.summary?.manualOut || 0)),
  },
  {
    key: "refunds",
    label: "Devoluciones",
    icon: TrendingDown,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    ring: "ring-amber-300/30 dark:ring-amber-500/20",
    getValue: (session: CashSession) => formatCurrency(Number(session.summary?.refunds || 0)),
  },
] as const;

export const ActiveSessionOverview = memo<ActiveSessionOverviewProps>(({ session }) => {
  if (!session || String(session.status || "").toUpperCase() !== "OPEN") {
    return null;
  }

  const paymentMethods = session.summary?.paymentMethods || [];

  return (
    <Card className="border-slate-200/70 bg-gradient-to-br from-background via-background to-muted/30 dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-xl">Turno activo</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista operativa de apertura, ventas, movimientos y corte esperado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5">
              <User2 className="h-3.5 w-3.5" />
              {session.openedByUser?.fullName ||
                session.openedByUser?.email ||
                "Usuario no identificado"}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {session.openedAt ? formatDateTime(session.openedAt) : "Sin fecha"}
            </Badge>
            {session.branchId && (
              <Badge variant="outline" className="gap-1.5" title={session.branchId}>
                <MapPin className="h-3.5 w-3.5" />
                Suc. {truncateId(session.branchId)}
              </Badge>
            )}
            {session.posId && (
              <Badge variant="outline" className="gap-1.5" title={session.posId}>
                <Monitor className="h-3.5 w-3.5" />
                POS {truncateId(session.posId)}
              </Badge>
            )}
            <Badge variant="secondary">{session.summary?.movementCount || 0} movimientos</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SUMMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="rounded-xl border border-slate-200/70 bg-card/70 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className={`rounded-lg p-1.5 ring-1 ${item.bg} ${item.ring}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight">
                  {item.getValue(session)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200/70 bg-card/70 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Ventas por método de pago</h3>
                <p className="text-xs text-muted-foreground">
                  El efectivo real en caja solo considera pagos en efectivo.
                </p>
              </div>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-3">
              {paymentMethods.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No hay ventas registradas en esta sesión.
                </div>
              ) : (
                paymentMethods.map((method) => (
                  <div
                    key={method.method}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 dark:border-slate-800"
                  >
                    <div>
                      <div className="font-medium">{method.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {method.count} operaciones{method.affectsCash ? " - impacta efectivo" : ""}
                      </div>
                    </div>
                    <div className="text-right font-semibold">
                      {formatCurrency(method.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-card/70 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Arqueo y diferencia</h3>
                <p className="text-xs text-muted-foreground">
                  Comparación entre lo esperado y lo contado.
                </p>
              </div>
              {(session.summary?.differenceAmount || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-500" />
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Esperado</span>
                <span className="font-semibold">
                  {formatCurrency(Number(session.summary?.expectedCash || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contado / actual</span>
                <span className="font-semibold">
                  {session.summary?.actualCash != null
                    ? formatCurrency(Number(session.summary.actualCash))
                    : "Sin arqueo"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm dark:border-slate-800">
                <span className="font-medium">Diferencia</span>
                <span
                  className={
                    Number(session.summary?.differenceAmount || 0) === 0
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : Number(session.summary?.differenceAmount || 0) > 0
                        ? "font-semibold text-amber-600 dark:text-amber-400"
                        : "font-semibold text-rose-600 dark:text-rose-400"
                  }
                >
                  {session.summary?.differenceAmount != null
                    ? formatCurrency(Number(session.summary.differenceAmount))
                    : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ActiveSessionOverview.displayName = "ActiveSessionOverview";
