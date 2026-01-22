'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Settings,
  Download,
  Maximize2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false });

const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const LineChart = lazyRecharts('LineChart');
const Line = lazyRecharts('Line');
const BarChart = lazyRecharts('BarChart');
const Bar = lazyRecharts('Bar');
const PieChart = lazyRecharts('PieChart');
const Pie = lazyRecharts('Pie');
const Cell = lazyRecharts('Cell');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const CartesianGrid = lazyRecharts('CartesianGrid');
const Tooltip = lazyRecharts('Tooltip');
const Legend = lazyRecharts('Legend');
const AreaChart = lazyRecharts('AreaChart');
const Area = lazyRecharts('Area');

interface BIChartPanelProps {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  height?: number;
  showControls?: boolean;
  className?: string;
}

export function BIChartPanel({ 
  title, 
  type: initialType, 
  data, 
  height = 300, 
  showControls = false,
  className 
}: BIChartPanelProps) {
  const [chartType, setChartType] = useState(initialType);
  const [selectedMetric, setSelectedMetric] = useState('value');

  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
    '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
  ];

  const formatTooltipValue = (value: any, name: string) => {
    if (typeof value === 'number') {
      if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('price')) {
        return formatCurrency(value);
      }
      if (name.toLowerCase().includes('percent') || name.toLowerCase().includes('%')) {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line': return <LineChartIcon className="h-4 w-4" />;
      case 'bar': return <BarChart3 className="h-4 w-4" />;
      case 'pie': return <PieChartIcon className="h-4 w-4" />;
      case 'area': return <AreaChartIcon className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No hay datos disponibles
        </div>
      );
    }

    const commonProps = {
      width: '100%',
      height,
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string | number) => {
                  if (typeof value === 'string' && value.includes('-')) {
                    return new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                  }
                  return value;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(label: string | number) => {
                  if (typeof label === 'string' && label.includes('-')) {
                    return new Date(label).toLocaleDateString('es-ES');
                  }
                  return label;
                }}
              />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'date' && key !== 'name').map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'name' && key !== 'date').map((key, index) => (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={colors[index % colors.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }: { name: string; percentage: number }) => `${name}: ${percentage?.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'date' && key !== 'name').map((key, index) => (
                <Area 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getChartIcon(chartType)}
            {title}
          </CardTitle>
          {showControls && (
            <div className="flex items-center gap-2">
              {/* Chart Type Selector */}
              <Select value={chartType} onValueChange={(value) => setChartType(value as typeof chartType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChartIcon className="h-4 w-4" />
                      Línea
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Barras
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Circular
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <AreaChartIcon className="h-4 w-4" />
                      Área
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>

              {/* Fullscreen Button */}
              <Button variant="outline" size="sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

export default BIChartPanel;
