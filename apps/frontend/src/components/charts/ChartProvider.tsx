'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  Filler,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Chart.js registration context
interface ChartContextType {
  isRegistered: boolean;
  registerCharts: () => void;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const useChartJS = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChartJS must be used within a ChartProvider');
  }
  return context;
};

interface ChartProviderProps {
  children: React.ReactNode;
  autoRegister?: boolean;
}

export const ChartProvider: React.FC<ChartProviderProps> = ({ 
  children, 
  autoRegister = false 
}) => {
  const [isRegistered, setIsRegistered] = useState(false);

  const registerCharts = React.useCallback(() => {
    if (!isRegistered) {
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
        Filler,
        TimeScale
      );
      setIsRegistered(true);
    }
  }, [isRegistered]);

  useEffect(() => {
    if (autoRegister) {
      registerCharts();
    }
  }, [autoRegister, registerCharts]);

  const value = React.useMemo(() => ({
    isRegistered,
    registerCharts
  }), [isRegistered, registerCharts]);

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  );
};

// Hook para usar gráficos con registro automático
export const useChart = () => {
  const { isRegistered, registerCharts } = useChartJS();

  useEffect(() => {
    if (!isRegistered) {
      registerCharts();
    }
  }, [isRegistered, registerCharts]);

  return { isRegistered };
};

// Configuraciones predeterminadas optimizadas
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxTicksLimit: 8,
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
      ticks: {
        maxTicksLimit: 6,
      },
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const,
  },
};

// Configuraciones específicas por tipo de gráfico
export const lineChartOptions = {
  ...defaultChartOptions,
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
    },
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
    },
  },
};

export const barChartOptions = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      ...defaultChartOptions.plugins.legend,
      display: false,
    },
  },
  scales: {
    ...defaultChartOptions.scales,
    x: {
      ...defaultChartOptions.scales.x,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
    },
  },
};

export const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        generateLabels: (chart: any) => {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            return data.labels.map((label: string, i: number) => {
              const dataset = data.datasets[0];
              const value = dataset.data[i];
              const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              
              return {
                text: `${label}: ${percentage}%`,
                fillStyle: dataset.backgroundColor[i],
                strokeStyle: dataset.borderColor?.[i] || '#fff',
                lineWidth: 2,
                hidden: false,
                index: i,
              };
            });
          }
          return [];
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || '';
          const value = context.parsed;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
  cutout: '60%',
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 1000,
  },
};

export default ChartProvider;