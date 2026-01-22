'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import dynamic from 'next/dynamic'
import { formatCurrency } from '@/lib/utils'
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

// Tooltip callbacks comunes para mejorar la legibilidad
const tooltipCallbacks = {
  label: (context: any) => {
    const rawLabel = context.dataset?.label || context.label || '';
    const label = String(rawLabel);
    const isMoneyLabel = /venta|ingreso|revenue|margen|beneficio|ganancia/i.test(label);
    const value = typeof context.parsed?.y !== 'undefined' ? context.parsed.y : context.parsed;

    // Formateo básico por tipo de gráfico
    const formattedValue = isMoneyLabel && typeof value === 'number' 
      ? formatCurrency(value)
      : typeof value === 'number' 
        ? value.toLocaleString()
        : String(value);

    // Para gráficos circulares, agregar porcentaje relativo
    const type = context?.chart?.config?.type;
    if (type === 'doughnut' || type === 'pie') {
      try {
        const dataset = context.dataset;
        const total = Array.isArray(dataset?.data)
          ? dataset.data.reduce((a: number, b: number) => a + (typeof b === 'number' ? b : 0), 0)
          : 0;
        const percentage = total && typeof value === 'number' ? ((value / total) * 100).toFixed(1) : '0.0';
        return `${label}: ${formattedValue} (${percentage}%)`;
      } catch {
        return `${label}: ${formattedValue}`;
      }
    }

    return `${label}: ${formattedValue}`;
  }
};

interface ChartProps {
  data: any;
  options?: any;
  height?: number;
}

export const LineChart: React.FC<ChartProps> = ({ data, options, height = 300 }) => {
  // Detectar y normalizar datos de entrada
  const isArray = Array.isArray(data);
  const first = isArray ? data[0] : undefined;
  const isTimeSeries = isArray && first && typeof first === 'object' && 'date' in first && 'value' in first;
  const isLabeledSeries = isArray && first && typeof first === 'object' && 'label' in first && 'value' in first;
  const isNumericSeries = isArray && typeof first === 'number';

  const chartData = isArray
    ? (() => {
        if (isTimeSeries) {
          const labels = data.map((p: any) => p?.date ?? '');
          const values = data.map((p: any) => (typeof p?.value === 'number' ? p.value : 0));
          return {
            labels,
            datasets: [
              {
                label: 'Tendencia',
                data: values,
                borderColor: chartColors.borders[0],
                backgroundColor: 'transparent',
                tension: 0.1,
              },
            ],
          };
        }
        if (isLabeledSeries) {
          const labels = data.map((p: any) => p?.label ?? '');
          const values = data.map((p: any) => (typeof p?.value === 'number' ? p.value : 0));
          return {
            labels,
            datasets: [
              {
                label: 'Valores',
                data: values,
                borderColor: chartColors.borders[0],
                backgroundColor: 'transparent',
                tension: 0.1,
              },
            ],
          };
        }
        if (isNumericSeries) {
          const labels = (data as number[]).map((_, i: number) => `${i + 1}`);
          return {
            labels,
            datasets: [
              {
                label: 'Valores',
                data: data as number[],
                borderColor: chartColors.borders[0],
                backgroundColor: 'transparent',
                tension: 0.1,
              },
            ],
          };
        }
        // Fallback para arreglos de objetos desconocidos
        return { labels: [], datasets: [{ label: 'Valores', data: [] }] };
      })()
    : (data ?? { labels: [], datasets: [{ label: 'Valores', data: [] }] });

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: tooltipCallbacks,
      },
    },
    scales: {
      x: isTimeSeries
        ? {
            type: 'time' as const,
            time: {
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy',
              },
            },
          }
        : {
            type: 'category' as const,
          },
      y: {
        beginAtZero: true,
      },
    },
    ...options,
  };

  return (
    <div style={{ height: `${height}px` }}>
      <DynamicLine data={chartData} options={defaultOptions} />
    </div>
  );
};

export const BarChart: React.FC<ChartProps> = ({ data, options, height = 300 }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: tooltipCallbacks,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    ...options,
  };

  // Normalizar cuando se recibe un arreglo de ChartDataPoint[], con guardas seguras
  const pointsBar = Array.isArray(data) ? data : [];
  const chartData = Array.isArray(data)
    ? (() => {
        const labels = pointsBar.map((p: any) => p?.label ?? '');
        const values = pointsBar.map((p: any) => (typeof p?.value === 'number' ? p.value : 0));
        const backgroundColor = pointsBar.map(
          (p: any, i: number) => p?.color ?? chartColors.primary[i % chartColors.primary.length]
        );
        const borderColor = pointsBar.map(
          (_: any, i: number) => chartColors.borders[i % chartColors.borders.length]
        );
        return {
          labels,
          datasets: [
            {
              label: 'Valores',
              data: values,
              backgroundColor,
              borderColor,
              borderWidth: 2,
            },
          ],
        };
      })()
    : (data ?? { labels: [], datasets: [{ label: 'Valores', data: [] }] });

  return (
    <div style={{ height: `${height}px` }}>
      <DynamicBar data={chartData} options={defaultOptions} />
    </div>
  );
};

export const DoughnutChart: React.FC<ChartProps> = ({ data, options, height = 300 }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: tooltipCallbacks,
      },
    },
    ...options,
  };

  // Normalizar cuando se recibe un arreglo de ChartDataPoint[], con guardas seguras
  const pointsDonut = Array.isArray(data) ? data : [];
  const chartData = Array.isArray(data)
    ? (() => {
        const labels = pointsDonut.map((p: any) => p?.label ?? '');
        const values = pointsDonut.map((p: any) => (typeof p?.value === 'number' ? p.value : 0));
        const backgroundColor = pointsDonut.map(
          (p: any, i: number) => p?.color ?? chartColors.primary[i % chartColors.primary.length]
        );
        const borderColor = pointsDonut.map(
          (_: any, i: number) => chartColors.borders[i % chartColors.borders.length]
        );
        return {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor,
              borderColor,
              borderWidth: 2,
            },
          ],
        };
      })()
    : (data ?? { labels: [], datasets: [{ data: [] }] });

  return (
    <div style={{ height: `${height}px` }}>
      <DynamicDoughnut data={chartData} options={defaultOptions} />
    </div>
  );
};

export const MultiLineChart: React.FC<ChartProps> = ({ data, options, height = 300 }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: tooltipCallbacks,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Fecha',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Valor',
        },
        beginAtZero: true,
      },
    },
    ...options,
  };

  return (
    <div style={{ height: `${height}px` }}>
      <DynamicLine data={data} options={defaultOptions} />
    </div>
  );
};

// Chart color palettes
export const chartColors = {
  primary: [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(14, 165, 233, 0.8)',
    'rgba(34, 197, 94, 0.8)',
  ],
  borders: [
    'rgba(59, 130, 246, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(14, 165, 233, 1)',
    'rgba(34, 197, 94, 1)',
  ],
  gradients: {
    blue: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%)',
    green: 'linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(110, 231, 183, 0.8) 100%)',
    yellow: 'linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(251, 191, 36, 0.8) 100%)',
    red: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(252, 165, 165, 0.8) 100%)',
  },
};

// Utility function to generate chart data
export const generateChartData = (
  labels: string[],
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    type?: 'line' | 'bar';
  }>
) => {
  return {
    labels,
    datasets: datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || chartColors.primary[index % chartColors.primary.length],
      borderColor: dataset.borderColor || chartColors.borders[index % chartColors.borders.length],
      borderWidth: 2,
      tension: 0.4,
    })),
  };
};

// Usar util global para formato de moneda acorde a Paraguay

// Utility function to format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
// Componentes dinámicos de react-chartjs-2 (SSR deshabilitado)
const DynamicLine = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false })
const DynamicBar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false })
const DynamicDoughnut = dynamic(() => import('react-chartjs-2').then(m => m.Doughnut), { ssr: false })