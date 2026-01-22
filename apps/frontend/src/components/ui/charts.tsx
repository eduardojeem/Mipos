'use client';

import React, { useMemo } from 'react';
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
  Filler,
} from 'chart.js';

import 'chartjs-adapter-date-fns';
import dynamic from 'next/dynamic'
import type { ChartData, ChartOptions } from 'chart.js'

// Componentes dinámicos de react-chartjs-2 (SSR deshabilitado)
const DynamicLine = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false })
const DynamicBar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false })
const DynamicDoughnut = dynamic(() => import('react-chartjs-2').then(m => m.Doughnut), { ssr: false })
const DynamicPie = dynamic(() => import('react-chartjs-2').then(m => m.Pie), { ssr: false })

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
  TimeScale,
  Filler
);

// Common chart options
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

// Chart data interfaces
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface MultiSeriesDataPoint {
  label: string;
  datasets: {
    name: string;
    value: number;
    color?: string;
  }[];
}

// Line Chart Component
interface LineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  color?: string;
  fill?: boolean;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  color = '#3b82f6',
  fill = false,
  height = 300,
}) => {
  const chartData = useMemo(() => ({
    labels: data.map(point => point.date),
    datasets: [
      {
        label: title || 'Data',
        data: data.map(point => point.value),
        borderColor: color,
        backgroundColor: fill ? `${color}20` : 'transparent',
        fill,
        tension: 0.1,
      },
    ],
  }), [data, title, color, fill]);

  const options = useMemo(() => ({
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  }), [title]);

  return (
    <div style={{ height }}>
      <DynamicLine data={chartData} options={options} />
    </div>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: ChartDataPoint[];
  title?: string;
  horizontal?: boolean;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  horizontal = false,
  height = 300,
}) => {
  const chartData = useMemo(() => ({
    labels: data.map(point => point.label),
    datasets: [
      {
        label: title || 'Data',
        data: data.map(point => point.value),
        backgroundColor: data.map(point => point.color || '#3b82f6'),
        borderColor: data.map(point => point.color || '#3b82f6'),
        borderWidth: 1,
      },
    ],
  }), [data, title]);

  const options = useMemo(() => ({
    ...commonOptions,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: !!title,
        text: title,
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  }), [title, horizontal]);

  return (
    <div style={{ height }}>
      <DynamicLine data={chartData} options={options} />
    </div>
  );
};

// Multi-Series Bar Chart Component
interface MultiSeriesBarChartProps {
  data: MultiSeriesDataPoint[];
  title?: string;
  height?: number;
}

export const MultiSeriesBarChart: React.FC<MultiSeriesBarChartProps> = ({
  data,
  title,
  height = 300,
}) => {
  const chartData = useMemo(() => {
    const datasets = data[0]?.datasets.map((_, index) => ({
      label: data[0].datasets[index].name,
      data: data.map(point => point.datasets[index]?.value || 0),
      backgroundColor: data[0].datasets[index].color || `hsl(${index * 60}, 70%, 50%)`,
      borderColor: data[0].datasets[index].color || `hsl(${index * 60}, 70%, 40%)`,
      borderWidth: 1,
    })) || [];

    return {
      labels: data.map(point => point.label),
      datasets,
    };
  }, [data]);

  const options = useMemo(() => ({
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  }), [title]);

  return (
    <div style={{ height }}>
      <DynamicBar data={chartData} options={options} />
    </div>
  );
};

// Doughnut Chart Component
interface DoughnutChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  title,
  height = 300,
}) => {
  const chartData = useMemo(() => ({
    labels: data.map(point => point.label),
    datasets: [
      {
        data: data.map(point => point.value),
        backgroundColor: data.map((point, index) => 
          point.color || `hsl(${index * 45}, 70%, 50%)`
        ),
        borderColor: data.map((point, index) => 
          point.color || `hsl(${index * 45}, 70%, 40%)`
        ),
        borderWidth: 2,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: !!title,
        text: title,
      },
    },
  }), [title]);

  return (
    <div style={{ height }}>
      <DynamicDoughnut data={chartData} options={options} />
    </div>
  );
};

// Pie Chart Component
interface PieChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 300,
}) => {
  const chartData = useMemo(() => ({
    labels: data.map(point => point.label),
    datasets: [
      {
        data: data.map(point => point.value),
        backgroundColor: data.map((point, index) => 
          point.color || `hsl(${index * 45}, 70%, 50%)`
        ),
        borderColor: data.map((point, index) => 
          point.color || `hsl(${index * 45}, 70%, 40%)`
        ),
        borderWidth: 2,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: !!title,
        text: title,
      },
    },
  }), [title]);

  return (
    <div style={{ height }}>
      <DynamicPie data={chartData} options={options} />
    </div>
  );
};

// Area Chart Component (Line chart with fill)
interface AreaChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  color?: string;
  height?: number;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  color = '#3b82f6',
  height = 300,
}) => {
  return (
    <LineChart
      data={data}
      title={title}
      color={color}
      fill={true}
      height={height}
    />
  );
};

// Multi-Line Chart Component
interface MultiLineChartProps {
  datasets: {
    label: string;
    data: TimeSeriesDataPoint[];
    color?: string;
  }[];
  title?: string;
  height?: number;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  datasets,
  title,
  height = 300,
}) => {
  const chartData = useMemo(() => {
    const allDates = Array.from(
      new Set(datasets.flatMap(dataset => dataset.data.map(point => point.date)))
    ).sort();

    return {
      labels: allDates,
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: allDates.map(date => {
          const point = dataset.data.find(p => p.date === date);
          return point ? point.value : 0;
        }),
        borderColor: dataset.color || `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: 'transparent',
        tension: 0.1,
      })),
    };
  }, [datasets]);

  const options = useMemo(() => ({
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  }), [title]);

  return (
    <div style={{ height }}>
      <DynamicLine data={chartData} options={options} />
    </div>
  );
};