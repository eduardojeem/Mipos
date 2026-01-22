"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Activity, Wallet, BarChart3, ArrowUpCircle } from "lucide-react";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

export default function CashMetricsGrid({
  sessionOpen,
  currentBalance,
  todayMovementsCount,
  todayInflows,
  compact = false,
}: {
  sessionOpen: boolean
  currentBalance: number
  todayMovementsCount: number
  todayInflows: number
  compact?: boolean
}) {
  const fmtCurrency = useCurrencyFormatter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 opacity-70">Estado de Sesión</p>
              <p className="text-2xl font-bold text-blue-600">{sessionOpen ? "Abierta" : "Cerrada"}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600 opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 opacity-70">Balance Actual</p>
              <p className="text-2xl font-bold text-green-600">{fmtCurrency(currentBalance)}</p>
            </div>
            <Wallet className="h-8 w-8 text-green-600 opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 opacity-70">Movimientos Hoy</p>
              <p className="text-2xl font-bold text-purple-600">{todayMovementsCount}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600 opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 opacity-70">Ingresos Hoy</p>
              <p className="text-2xl font-bold text-emerald-600">{fmtCurrency(todayInflows)}</p>
            </div>
            <ArrowUpCircle className="h-8 w-8 text-emerald-600 opacity-70" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
