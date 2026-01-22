"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

interface OptimizedCashMetricsProps {
  sessionOpen: boolean;
  currentBalance: number;
  todayInflows: number;
  todayOutflows: number;
  movementsCount: number;
  openingBalance?: number;
  targetBalance?: number;
  previousDayBalance?: number;
  isLoading?: boolean;
}

const MetricCard = memo(({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = "default",
  progress,
  isLoading = false 
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "default" | "success" | "warning" | "danger";
  progress?: number;
  isLoading?: boolean;
}) => {
  const colorClasses = {
    default: "border-border bg-card",
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
    warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    danger: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
  };

  const iconColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${colorClasses[color]} transition-all duration-200 hover:shadow-md`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-background/50 ${iconColors[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="flex items-center space-x-2">
                  {isLoading ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-2xl font-bold">{typeof value === 'number' ? formatCurrency(value) : value}</p>
                  )}
                  {trend && trendValue && (
                    <div className={`flex items-center space-x-1 ${
                      trend === 'up' ? 'text-green-600' : 
                      trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : 
                       trend === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
                      <span className="text-sm font-medium">{trendValue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {progress !== undefined && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(1)}% del objetivo</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

MetricCard.displayName = "MetricCard";

export const OptimizedCashMetrics = memo<OptimizedCashMetricsProps>(({
  sessionOpen,
  currentBalance,
  todayInflows,
  todayOutflows,
  movementsCount,
  openingBalance = 0,
  targetBalance,
  previousDayBalance,
  isLoading = false
}) => {
  // Calcular tendencias
  const netFlow = todayInflows - todayOutflows;
  const balanceChange = currentBalance - openingBalance;
  const previousDayChange = previousDayBalance ? 
    ((currentBalance - previousDayBalance) / previousDayBalance * 100) : 0;

  // Calcular progreso hacia objetivo
  const targetProgress = targetBalance ? 
    Math.min((currentBalance / targetBalance) * 100, 100) : undefined;

  // Determinar estado de la sesión
  const sessionColor = sessionOpen ? "success" : "default";
  const balanceColor = currentBalance < 0 ? "danger" : 
                      currentBalance > openingBalance * 1.2 ? "success" : "default";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Estado de Sesión */}
      <MetricCard
        title="Estado de Sesión"
        value={sessionOpen ? "ABIERTA" : "CERRADA"}
        icon={sessionOpen ? CheckCircle : AlertTriangle}
        color={sessionColor}
        isLoading={isLoading}
      />

      {/* Balance Actual */}
      <MetricCard
        title="Balance Actual"
        value={currentBalance}
        icon={DollarSign}
        trend={balanceChange > 0 ? "up" : balanceChange < 0 ? "down" : "neutral"}
        trendValue={balanceChange !== 0 ? formatCurrency(Math.abs(balanceChange)) : undefined}
        color={balanceColor}
        progress={targetProgress}
        isLoading={isLoading}
      />

      {/* Flujo Neto del Día */}
      <MetricCard
        title="Flujo Neto Hoy"
        value={netFlow}
        icon={netFlow >= 0 ? TrendingUp : TrendingDown}
        trend={netFlow > 0 ? "up" : netFlow < 0 ? "down" : "neutral"}
        trendValue={previousDayChange !== 0 ? `${previousDayChange.toFixed(1)}%` : undefined}
        color={netFlow >= 0 ? "success" : "danger"}
        isLoading={isLoading}
      />

      {/* Actividad del Día */}
      <MetricCard
        title="Movimientos Hoy"
        value={movementsCount}
        icon={Activity}
        trend={movementsCount > 10 ? "up" : movementsCount < 5 ? "down" : "neutral"}
        color="default"
        isLoading={isLoading}
      />
    </div>
  );
});

OptimizedCashMetrics.displayName = "OptimizedCashMetrics";