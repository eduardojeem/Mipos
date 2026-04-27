"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  PackageOpen,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface StatusBannerProps {
  sessionOpen: boolean;
  currentBalance: number;
  openingBalance?: number;
  isLoading?: boolean;
}

export const StatusBanner = memo<StatusBannerProps>(
  ({ sessionOpen, currentBalance, openingBalance = 0, isLoading = false }) => {
    const balanceChange = currentBalance - openingBalance;
    const hasProfit = balanceChange > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`border-2 ${
            sessionOpen
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 shadow-lg shadow-emerald-500/10 dark:border-emerald-400/40 dark:from-emerald-500/20 dark:via-green-500/10 dark:to-teal-500/20 dark:shadow-emerald-400/20"
              : "border-slate-300/30 bg-gradient-to-br from-slate-500/5 via-gray-500/5 to-zinc-500/5 dark:border-slate-600/40 dark:from-slate-700/20 dark:via-gray-700/10 dark:to-zinc-700/20"
          }`}
        >
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {sessionOpen ? (
                  <div className="rounded-full bg-emerald-100 p-2 ring-2 ring-emerald-500/20 dark:bg-emerald-500/20 dark:ring-emerald-400/30">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <div className="rounded-full bg-slate-100 p-2 ring-2 ring-slate-300/20 dark:bg-slate-700/50 dark:ring-slate-600/30">
                    <AlertCircle className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {sessionOpen ? "Sesión activa" : "Sin sesión activa"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {sessionOpen
                      ? "Caja abierta y lista para operar"
                      : "Abre una sesión para comenzar a registrar movimientos de caja"}
                  </p>
                </div>
              </div>
              <Badge
                variant={sessionOpen ? "default" : "secondary"}
                className={`px-3 py-1 text-sm ${
                  sessionOpen
                    ? "animate-pulse bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    : ""
                }`}
              >
                {sessionOpen ? "ABIERTA" : "CERRADA"}
              </Badge>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="h-12 w-48 animate-pulse rounded bg-muted" />
              ) : sessionOpen ? (
                <>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-sm text-muted-foreground">Balance actual:</span>
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-4xl font-bold text-transparent dark:from-emerald-400 dark:to-teal-400">
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                  {balanceChange !== 0 && (
                    <div className="flex items-center space-x-2 text-sm">
                      {hasProfit ? (
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span
                        className={
                          hasProfit
                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                            : "font-medium text-rose-600 dark:text-rose-400"
                        }
                      >
                        {hasProfit ? "+" : ""}
                        {formatCurrency(balanceChange)} desde apertura
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300/60 bg-slate-50/50 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/30">
                  <PackageOpen className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <p className="text-sm text-muted-foreground">
                    No hay movimientos disponibles. Abre una sesión para comenzar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  },
);

StatusBanner.displayName = "StatusBanner";
