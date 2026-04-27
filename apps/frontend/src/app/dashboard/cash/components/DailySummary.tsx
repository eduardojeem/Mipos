"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Activity, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface DailySummaryProps {
  movementsCount: number;
  lastMovementTime?: string;
  netFlow: number;
  isLoading?: boolean;
}

export const DailySummary = memo<DailySummaryProps>(
  ({ movementsCount, lastMovementTime, netFlow, isLoading = false }) => {
    const isPositive = netFlow >= 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumen del día</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="h-16 animate-pulse rounded bg-muted" />
                <div className="h-16 animate-pulse rounded bg-muted" />
                <div className="h-16 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Movimientos */}
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-blue-100 p-3 ring-2 ring-blue-500/20 dark:bg-blue-500/20 dark:ring-blue-400/30">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{movementsCount}</p>
                    <p className="text-sm text-muted-foreground">Movimientos</p>
                  </div>
                </div>

                {/* Último movimiento */}
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-purple-100 p-3 ring-2 ring-purple-500/20 dark:bg-purple-500/20 dark:ring-purple-400/30">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {lastMovementTime || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">Último movimiento</p>
                  </div>
                </div>

                {/* Flujo neto */}
                <div className="flex items-center space-x-3">
                  <div
                    className={`rounded-xl p-3 ring-2 ${
                      isPositive
                        ? "bg-emerald-100 ring-emerald-500/20 dark:bg-emerald-500/20 dark:ring-emerald-400/30"
                        : "bg-rose-100 ring-rose-500/20 dark:bg-rose-500/20 dark:ring-rose-400/30"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-2xl font-bold ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(Math.abs(netFlow))}
                    </p>
                    <p className="text-sm text-muted-foreground">Flujo neto</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  },
);

DailySummary.displayName = "DailySummary";
