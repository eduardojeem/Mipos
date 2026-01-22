'use client';

import { withLazyLoading } from '@/components/ui/lazy-loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Skeleton components for chart loading states
export const ChartSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <Skeleton className="h-64 w-full rounded-lg" />
    <div className="flex justify-center space-x-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-18" />
    </div>
  </div>
);

export const LineChartSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-48" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="flex justify-center space-x-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const BarChartSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-40" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex items-end space-x-2 h-48">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={`w-8 bg-gradient-to-t from-blue-200 to-blue-100`}
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DoughnutChartSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-36" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-center space-x-8">
        <div className="relative">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="absolute inset-4">
            <Skeleton className="h-24 w-24 rounded-full bg-white" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Lazy loaded chart components with dynamic imports
export const LazyLineChart = withLazyLoading(
  () => import('react-chartjs-2').then(module => ({ 
    default: module.Line 
  })),
  LineChartSkeleton
);

export const LazyBarChart = withLazyLoading(
  () => import('react-chartjs-2').then(module => ({ 
    default: module.Bar 
  })),
  BarChartSkeleton
);

export const LazyDoughnutChart = withLazyLoading(
  () => import('react-chartjs-2').then(module => ({ 
    default: module.Doughnut 
  })),
  DoughnutChartSkeleton
);

export const LazyPieChart = withLazyLoading(
  () => import('react-chartjs-2').then(module => ({ 
    default: module.Pie 
  })),
  DoughnutChartSkeleton
);

// Recharts lazy components
export const LazyRechartsLineChart = withLazyLoading(
  () => import('recharts').then(module => ({ 
    default: module.LineChart 
  })),
  LineChartSkeleton
);

export const LazyRechartsBarChart = withLazyLoading(
  () => import('recharts').then(module => ({ 
    default: module.BarChart 
  })),
  BarChartSkeleton
);

export const LazyRechartsPieChart = withLazyLoading(
  () => import('recharts').then(module => ({ 
    default: module.PieChart 
  })),
  DoughnutChartSkeleton
);

export const LazyRechartsAreaChart = withLazyLoading(
  () => import('recharts').then(module => ({ 
    default: module.AreaChart 
  })),
  ChartSkeleton
);

// Chart.js registration lazy loader - removed as it's not a React component
// Chart.js should be imported directly where needed

// Combined chart provider for better performance
export const LazyChartProvider = withLazyLoading(
  () => import('@/components/charts/ChartProvider'),
  () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full" />
      <ChartSkeleton />
    </div>
  )
);

export default {
  LazyLineChart,
  LazyBarChart,
  LazyDoughnutChart,
  LazyPieChart,
  LazyRechartsLineChart,
  LazyRechartsBarChart,
  LazyRechartsPieChart,
  LazyRechartsAreaChart,
  LazyChartProvider
};