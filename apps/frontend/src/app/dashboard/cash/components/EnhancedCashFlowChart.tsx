"use client";

import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, BarChart3, Activity, Calendar } from "lucide-react";
import type { CashMovement } from "@/types/cash";

interface EnhancedCashFlowChartProps {
  movements: CashMovement[];
  openingBalance: number;
  isLoading?: boolean;
}

type ChartType = "flow" | "movements" | "balance";
type TimeRange = "today" | "week" | "month";

const ChartTypeSelector = memo(({ 
  value, 
  onChange 
}: { 
  value: ChartType; 
  onChange: (value: ChartType) => void;
}) => (
  <div className="flex items-center space-x-2">
    <Button
      variant={value === "flow" ? "default" : "outline"}
      size="sm"
      onClick={() => onChange("flow")}
      className="flex items-center space-x-1"
    >
      <TrendingUp className="h-4 w-4" />
      <span>Flujo</span>
    </Button>
    <Button
      variant={value === "movements" ? "default" : "outline"}
      size="sm"
      onClick={() => onChange("movements")}
      className="flex items-center space-x-1"
    >
      <BarChart3 className="h-4 w-4" />
      <span>Movimientos</span>
    </Button>
    <Button
      variant={value === "balance" ? "default" : "outline"}
      size="sm"
      onClick={() => onChange("balance")}
      className="flex items-center space-x-1"
    >
      <Activity className="h-4 w-4" />
      <span>Balance</span>
    </Button>
  </div>
));

ChartTypeSelector.displayName = "ChartTypeSelector";

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

export const EnhancedCashFlowChart = memo<EnhancedCashFlowChartProps>(({
  movements,
  openingBalance,
  isLoading = false
}) => {
  const [chartType, setChartType] = React.useState<ChartType>("flow");
  const [timeRange, setTimeRange] = React.useState<TimeRange>("today");

  // Procesar datos para diferentes tipos de gráficos
  const chartData = useMemo(() => {
    if (!movements.length) return [];

    // Filtrar por rango de tiempo
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setDate(now.getDate() - 30);
        break;
    }

    const filteredMovements = movements.filter(m => 
      new Date(m.createdAt) >= startDate
    );

    // Agrupar por horas (hoy) o días (semana/mes)
    const groupBy = timeRange === "today" ? "hour" : "day";
    const groups = new Map<string, { inflows: number; outflows: number; count: number; balance: number }>();

    let runningBalance = openingBalance;

    filteredMovements
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(movement => {
        const date = new Date(movement.createdAt);
        const key = groupBy === "hour" 
          ? `${date.getHours()}:00`
          : date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

        if (!groups.has(key)) {
          groups.set(key, { inflows: 0, outflows: 0, count: 0, balance: runningBalance });
        }

        const group = groups.get(key)!;
        
        if (['IN', 'SALE'].includes(movement.type)) {
          group.inflows += Math.abs(movement.amount);
          runningBalance += Math.abs(movement.amount);
        } else {
          group.outflows += Math.abs(movement.amount);
          runningBalance -= Math.abs(movement.amount);
        }
        
        group.count += 1;
        group.balance = runningBalance;
      });

    return Array.from(groups.entries()).map(([time, data]) => ({
      time,
      inflows: data.inflows,
      outflows: data.outflows,
      net: data.inflows - data.outflows,
      count: data.count,
      balance: data.balance
    }));
  }, [movements, openingBalance, timeRange]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalInflows = chartData.reduce((sum, d) => sum + d.inflows, 0);
    const totalOutflows = chartData.reduce((sum, d) => sum + d.outflows, 0);
    const totalMovements = chartData.reduce((sum, d) => sum + d.count, 0);
    const netFlow = totalInflows - totalOutflows;
    const avgHourlyFlow = chartData.length > 0 ? netFlow / chartData.length : 0;

    return {
      totalInflows,
      totalOutflows,
      netFlow,
      totalMovements,
      avgHourlyFlow
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Flujo de Caja</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case "flow":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="inflows"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Ingresos"
              />
              <Area
                type="monotone"
                dataKey="outflows"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Egresos"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "movements":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                name="Movimientos"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "balance":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                name="Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Análisis de Flujo de Caja</span>
          </CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">7 días</SelectItem>
                <SelectItem value="month">30 días</SelectItem>
              </SelectContent>
            </Select>
            <ChartTypeSelector value={chartType} onChange={setChartType} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalInflows)}
            </div>
            <p className="text-xs text-muted-foreground">Total Ingresos</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalOutflows)}
            </div>
            <p className="text-xs text-muted-foreground">Total Egresos</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.netFlow)}
            </div>
            <p className="text-xs text-muted-foreground">Flujo Neto</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalMovements}
            </div>
            <p className="text-xs text-muted-foreground">Movimientos</p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="w-full">
          {chartData.length > 0 ? (
            renderChart()
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay datos para mostrar</p>
                <p className="text-sm">Los movimientos aparecerán aquí</p>
              </div>
            </div>
          )}
        </div>

        {/* Indicadores de tendencia */}
        {chartData.length > 0 && (
          <div className="mt-4 flex items-center justify-center space-x-4">
            <Badge variant={stats.netFlow >= 0 ? "default" : "destructive"}>
              {stats.netFlow >= 0 ? "Flujo Positivo" : "Flujo Negativo"}
            </Badge>
            <Badge variant="outline">
              Promedio: {formatCurrency(stats.avgHourlyFlow)} por {timeRange === "today" ? "hora" : "día"}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EnhancedCashFlowChart.displayName = "EnhancedCashFlowChart";