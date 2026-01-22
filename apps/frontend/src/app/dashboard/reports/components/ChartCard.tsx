'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'pie';
  loading?: boolean;
  height?: string;
  showValues?: boolean;
}

export function ChartCard({
  title,
  description,
  data,
  type = 'bar',
  loading = false,
  height = '300px',
  showValues = true,
}: ChartCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50 dark:shadow-slate-900/50">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {type === 'bar' && (
          <div className="space-y-3" style={{ height }}>
            <TooltipProvider>
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const color = item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`;

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center gap-3 cursor-help"
                      >
                        <div className="w-24 text-sm text-muted-foreground dark:text-slate-400 truncate">{item.label}</div>
                        <div className="flex-1 h-8 bg-muted dark:bg-slate-900/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        {showValues && (
                          <div className="w-20 text-right text-sm font-medium">
                            {item.value.toLocaleString()}
                          </div>
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="dark:bg-slate-900/95 dark:border-slate-800/50">
                      <div className="text-xs">
                        <div className="font-medium">{item.label}</div>
                        <div>Valor: {item.value.toLocaleString()}</div>
                        <div>Porcentaje: {percentage.toFixed(1)}%</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        )}

        {type === 'line' && (
          <div className="relative" style={{ height }}>
            <svg width="100%" height="100%" className="overflow-visible">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Línea y área */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
                d={generateLinePath(data, maxValue, height)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              />
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                d={generateAreaPath(data, maxValue, height)}
                fill="url(#lineGradient)"
              />

              {/* Puntos */}
              {data.map((item, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = 100 - (item.value / maxValue) * 100;

                return (
                  <motion.circle
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="hsl(var(--primary))"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                );
              })}
            </svg>
          </div>
        )}

        {type === 'pie' && (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="relative w-64 h-64">
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                {generatePieSlices(data).map((slice, index) => (
                  <motion.path
                    key={index}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    d={slice.path}
                    fill={slice.color}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </svg>
            </div>
            <div className="ml-8 space-y-2">
              {data.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)` }}
                  />
                  <div className="text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground dark:text-slate-400 ml-2">({item.value.toLocaleString()})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Funciones auxiliares para generar paths SVG
function generateLinePath(data: ChartDataPoint[], maxValue: number, height: string): string {
  const heightNum = parseInt(height);
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (item.value / maxValue) * 100;
    return `${x},${y}`;
  });
  return `M ${points.join(' L ')}`;
}

function generateAreaPath(data: ChartDataPoint[], maxValue: number, height: string): string {
  const linePath = generateLinePath(data, maxValue, height);
  return `${linePath} L 100,100 L 0,100 Z`;
}

function generatePieSlices(data: ChartDataPoint[]): Array<{ path: string; color: string }> {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90; // Empezar desde arriba

  return data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M 50,50 L ${x1},${y1} A 40,40 0 ${largeArc},1 ${x2},${y2} Z`;

    currentAngle = endAngle;

    return {
      path,
      color: item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`,
    };
  });
}
