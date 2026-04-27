"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, DollarSign, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { CashMovement } from "@/types/cash";

interface RecentMovementsProps {
  movements: CashMovement[];
  onViewAll: () => void;
  onNewMovement?: () => void;
  sessionOpen?: boolean;
  isLoading?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return "hace un momento";
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHrs < 24) return `hace ${diffHrs} h`;
    if (diffDays === 1) return "ayer";
    if (diffDays < 7) return `hace ${diffDays} días`;
    return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

function MovementIconCircle({ type }: { type: string }) {
  const isIncoming = type === "IN" || type === "SALE";
  const isOutgoing = type === "OUT" || type === "RETURN";

  if (isIncoming) {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-emerald-500/20 dark:bg-emerald-500/15 dark:ring-emerald-400/20">
        <ArrowDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }
  if (isOutgoing) {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 ring-2 ring-rose-500/20 dark:bg-rose-500/15 dark:ring-rose-400/20">
        <ArrowUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 ring-2 ring-blue-500/20 dark:bg-blue-500/15 dark:ring-blue-400/20">
      <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    </div>
  );
}

function MovementTypeBadge({ type }: { type: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    IN: {
      className:
        "border border-emerald-500/30 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-400",
      label: "Entrada",
    },
    OUT: {
      className:
        "border border-rose-500/30 bg-rose-100 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-400",
      label: "Salida",
    },
    SALE: {
      className:
        "border border-blue-500/30 bg-blue-100 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-400",
      label: "Venta",
    },
    RETURN: {
      className:
        "border border-amber-500/30 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-400",
      label: "Devolución",
    },
    ADJUSTMENT: {
      className:
        "border border-purple-500/30 bg-purple-100 text-purple-700 dark:border-purple-400/40 dark:bg-purple-500/20 dark:text-purple-400",
      label: "Ajuste",
    },
  };

  const config = variants[type] || variants.ADJUSTMENT;
  return <Badge className={config.className}>{config.label}</Badge>;
}

export const RecentMovements = memo<RecentMovementsProps>(
  ({ movements, onViewAll, onNewMovement, sessionOpen = false, isLoading = false }) => {
    const recentMovements = movements.slice(0, 5);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Últimos movimientos</CardTitle>
              <Button variant="ghost" size="sm" onClick={onViewAll} className="text-sm">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-4 ring-muted/50">
                  <DollarSign className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No hay movimientos registrados</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">Los movimientos aparecerán aquí</p>
                </div>
                {sessionOpen && onNewMovement && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNewMovement}
                    className="mt-1 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Registrar primer movimiento
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex flex-1 items-center space-x-3">
                      <MovementIconCircle type={movement.type} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <MovementTypeBadge type={movement.type} />
                          <span className="truncate text-sm text-muted-foreground">
                            {movement.reason || "Sin descripción"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {formatRelativeTime(movement.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p
                        className={`font-semibold ${
                          movement.type === "IN" || movement.type === "SALE"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {movement.type === "IN" || movement.type === "SALE" ? "+" : "-"}
                        {formatCurrency(Math.abs(movement.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  },
);

RecentMovements.displayName = "RecentMovements";
