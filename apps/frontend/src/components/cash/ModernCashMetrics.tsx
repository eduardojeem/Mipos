"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Activity, TrendingUp } from "lucide-react";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { cn } from "@/lib/utils";

interface ModernCashMetricsProps {
    sessionOpen: boolean;
    currentBalance: number;
    todayInflows: number;
    todayOutflows: number;
    movementsCount: number;
    className?: string;
}

export default function ModernCashMetrics({
    sessionOpen,
    currentBalance,
    todayInflows,
    todayOutflows,
    movementsCount,
    className
}: ModernCashMetricsProps) {
    const fmtCurrency = useCurrencyFormatter();

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
            {/* Balance Actual - Destacado */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Wallet className="w-24 h-24 text-primary" />
                </div>
                <CardContent className="p-6 relative">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Balance en Caja</span>
                        <span className="text-3xl font-bold text-primary tracking-tight">
                            {fmtCurrency(currentBalance)}
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-100/50 w-fit px-2 py-1 rounded-full">
                        <Activity className="w-3 h-3" />
                        <span>{sessionOpen ? "Sesión Activa" : "Sesión Cerrada"}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Ingresos */}
            <Card className="bg-card border-border/50 shadow-sm hover:border-emerald-200 transition-colors">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Ingresos Hoy</span>
                        <span className="text-2xl font-bold text-emerald-600">
                            {fmtCurrency(todayInflows)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            Entradas registradas
                        </span>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                </CardContent>
            </Card>

            {/* Egresos */}
            <Card className="bg-card border-border/50 shadow-sm hover:border-red-200 transition-colors">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Egresos Hoy</span>
                        <span className="text-2xl font-bold text-red-600">
                            {fmtCurrency(todayOutflows)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ArrowDownCircle className="w-3 h-3 text-red-500" />
                            Salidas registradas
                        </span>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <ArrowDownCircle className="w-6 h-6 text-red-600" />
                    </div>
                </CardContent>
            </Card>

            {/* Movimientos */}
            <Card className="bg-card border-border/50 shadow-sm hover:border-blue-200 transition-colors">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Transacciones</span>
                        <span className="text-2xl font-bold text-blue-600">
                            {movementsCount}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Operaciones totales
                        </span>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
