"use client";

import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Brain,
  Zap,
  Clock,
  DollarSign
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CashMovement } from "@/types/cash";

interface IntelligentCashInsightsProps {
  movements: CashMovement[];
  currentBalance: number;
  todayInflows: number;
  todayOutflows: number;
  openingBalance: number;
  isLoading?: boolean;
}

interface Insight {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  title: string;
  description: string;
  value?: string;
  trend?: "up" | "down" | "neutral";
  priority: number;
  actionable: boolean;
}

const InsightCard = memo(({ insight }: { insight: Insight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case "success": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "danger": return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Brain className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case "success": return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950";
      case "warning": return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";
      case "danger": return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      default: return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
    }
  };

  return (
    <Alert className={getBorderColor()}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{insight.title}</h4>
            <div className="flex items-center space-x-2">
              {insight.value && (
                <Badge variant="outline" className="text-xs">
                  {insight.value}
                </Badge>
              )}
              {insight.trend && (
                <div className={`flex items-center ${
                  insight.trend === 'up' ? 'text-green-600' : 
                  insight.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {insight.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                   insight.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                </div>
              )}
              {insight.actionable && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Acción
                </Badge>
              )}
            </div>
          </div>
          <AlertDescription className="mt-1 text-sm">
            {insight.description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
});

InsightCard.displayName = "InsightCard";

export const IntelligentCashInsights = memo<IntelligentCashInsightsProps>(({
  movements,
  currentBalance,
  todayInflows,
  todayOutflows,
  openingBalance,
  isLoading = false
}) => {
  const insights = useMemo(() => {
    if (isLoading || movements.length === 0) return [];

    const insights: Insight[] = [];
    const netFlow = todayInflows - todayOutflows;
    const balanceChange = currentBalance - openingBalance;
    const balanceChangePercent = openingBalance > 0 ? (balanceChange / openingBalance) * 100 : 0;

    // Análisis de flujo de efectivo
    if (netFlow > 0) {
      insights.push({
        id: "positive-flow",
        type: "success",
        title: "Flujo Positivo",
        description: `El flujo neto del día es positivo con ${formatCurrency(netFlow)}. Excelente gestión de efectivo.`,
        value: `+${formatCurrency(netFlow)}`,
        trend: "up",
        priority: 1,
        actionable: false
      });
    } else if (netFlow < -5000) {
      insights.push({
        id: "negative-flow",
        type: "warning",
        title: "Flujo Negativo Significativo",
        description: `El flujo neto es negativo por ${formatCurrency(Math.abs(netFlow))}. Considera revisar los egresos.`,
        value: formatCurrency(netFlow),
        trend: "down",
        priority: 2,
        actionable: true
      });
    }

    // Análisis de balance
    if (currentBalance < 0) {
      insights.push({
        id: "negative-balance",
        type: "danger",
        title: "Balance Negativo",
        description: "El balance actual es negativo. Se requiere atención inmediata para regularizar la situación.",
        value: formatCurrency(currentBalance),
        trend: "down",
        priority: 1,
        actionable: true
      });
    } else if (balanceChangePercent > 50) {
      insights.push({
        id: "high-growth",
        type: "success",
        title: "Crecimiento Excepcional",
        description: `El balance ha crecido ${balanceChangePercent.toFixed(1)}% respecto a la apertura. Rendimiento sobresaliente.`,
        value: `+${balanceChangePercent.toFixed(1)}%`,
        trend: "up",
        priority: 2,
        actionable: false
      });
    }

    // Análisis de actividad
    const todayMovements = movements.filter(m => 
      new Date(m.createdAt).toDateString() === new Date().toDateString()
    );

    if (todayMovements.length > 100) {
      insights.push({
        id: "high-activity",
        type: "info",
        title: "Alta Actividad",
        description: `Se registraron ${todayMovements.length} movimientos hoy. Día muy activo en caja.`,
        value: `${todayMovements.length} movs`,
        trend: "up",
        priority: 3,
        actionable: false
      });
    } else if (todayMovements.length < 5 && new Date().getHours() > 12) {
      insights.push({
        id: "low-activity",
        type: "warning",
        title: "Baja Actividad",
        description: "Pocos movimientos registrados para esta hora del día. Verifica si es normal para tu negocio.",
        value: `${todayMovements.length} movs`,
        trend: "down",
        priority: 3,
        actionable: true
      });
    }

    // Análisis de patrones horarios
    const currentHour = new Date().getHours();
    const hourlyMovements = todayMovements.filter(m => 
      new Date(m.createdAt).getHours() === currentHour
    );

    if (hourlyMovements.length > 10) {
      insights.push({
        id: "peak-hour",
        type: "info",
        title: "Hora Pico Detectada",
        description: `${hourlyMovements.length} movimientos en la última hora. Considera tener personal adicional.`,
        value: `${hourlyMovements.length}/hora`,
        trend: "up",
        priority: 4,
        actionable: true
      });
    }

    // Análisis de transacciones grandes
    const avgTransaction = todayMovements.length > 0 ? 
      todayMovements.reduce((sum, m) => sum + Math.abs(m.amount), 0) / todayMovements.length : 0;
    
    const largeTransactions = todayMovements.filter(m => Math.abs(m.amount) > avgTransaction * 3);
    
    if (largeTransactions.length > 0) {
      insights.push({
        id: "large-transactions",
        type: "info",
        title: "Transacciones Grandes",
        description: `${largeTransactions.length} transacciones superan significativamente el promedio. Revisa si son normales.`,
        value: `${largeTransactions.length} grandes`,
        trend: "neutral",
        priority: 4,
        actionable: true
      });
    }

    // Análisis de seguridad
    if (currentBalance > 50000) {
      insights.push({
        id: "high-cash",
        type: "warning",
        title: "Alto Nivel de Efectivo",
        description: "El balance actual es alto. Considera hacer un depósito bancario por seguridad.",
        value: formatCurrency(currentBalance),
        trend: "up",
        priority: 2,
        actionable: true
      });
    }

    // Recomendaciones de cierre
    if (new Date().getHours() >= 18 && netFlow > 0) {
      insights.push({
        id: "close-recommendation",
        type: "info",
        title: "Momento Ideal para Cierre",
        description: "Con el flujo positivo del día, es un buen momento para considerar el cierre de caja.",
        value: "Recomendado",
        trend: "neutral",
        priority: 3,
        actionable: true
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }, [movements, currentBalance, todayInflows, todayOutflows, openingBalance, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Insights Inteligentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Insights Inteligentes</span>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>{insights.length}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay insights disponibles</p>
            <p className="text-sm">Los insights aparecerán cuando haya más actividad</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.slice(0, 5).map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
            
            {insights.length > 5 && (
              <div className="text-center pt-4">
                <Badge variant="outline">
                  +{insights.length - 5} insights adicionales
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {insights.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-green-600">
                  {insights.filter(i => i.type === "success").length}
                </div>
                <p className="text-muted-foreground">Positivos</p>
              </div>
              <div>
                <div className="font-semibold text-yellow-600">
                  {insights.filter(i => i.type === "warning").length}
                </div>
                <p className="text-muted-foreground">Advertencias</p>
              </div>
              <div>
                <div className="font-semibold text-blue-600">
                  {insights.filter(i => i.actionable).length}
                </div>
                <p className="text-muted-foreground">Accionables</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

IntelligentCashInsights.displayName = "IntelligentCashInsights";