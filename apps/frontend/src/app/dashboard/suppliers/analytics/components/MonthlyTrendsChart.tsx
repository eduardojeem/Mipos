'use client';

import { memo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyTrend } from '../hooks/useSupplierAnalytics';

const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false });
const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const AreaChart = lazyRecharts('AreaChart');
const Area = lazyRecharts('Area');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const CartesianGrid = lazyRecharts('CartesianGrid');
const Tooltip = lazyRecharts('Tooltip');
const Legend = lazyRecharts('Legend');

interface MonthlyTrendsChartProps {
  data: MonthlyTrend[];
  loading?: boolean;
}

export const MonthlyTrendsChart = memo(function MonthlyTrendsChart({
  data,
  loading = false,
}: MonthlyTrendsChartProps) {
  // Memoized format function for better performance
  const formatCurrency = useCallback((value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return `${value.toFixed(0)}`;
  }, []);

  // Memoized tooltip component to prevent unnecessary re-renders
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey === 'purchases' 
                ? `Compras: ${formatCurrency(entry.value)}`
                : `Órdenes: ${entry.value}`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  }, [formatCurrency]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencias Mensuales</CardTitle>
          <CardDescription>Compras y órdenes por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted/20 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Cargando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencias Mensuales</CardTitle>
        <CardDescription>
          Evolución de compras y órdenes en los últimos 6 meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              className="text-xs"
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="purchases"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorPurchases)"
              name="Compras"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#82ca9d"
              fillOpacity={1}
              fill="url(#colorOrders)"
              name="Órdenes"
              strokeWidth={2}
              yAxisId="right"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
