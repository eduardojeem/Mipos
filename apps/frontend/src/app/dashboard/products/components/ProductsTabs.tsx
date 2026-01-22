'use client';

import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  BarChart3, 
  Package, 
  LayoutDashboard, 
  Settings, 
  Download,
  Brain,
  Activity
} from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';
import dynamic from 'next/dynamic';

// Lazy load tabs for better performance
const ProductsOverviewTab = dynamic(() => import('../tabs/ProductsOverviewTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

const ProductsAnalyticsTab = dynamic(() => import('../tabs/ProductsAnalyticsTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

const ProductsListTab = dynamic(() => import('../tabs/ProductsListTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

const ProductsRecommendationsTab = dynamic(() => import('../tabs/ProductsRecommendationsTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

const ProductsInventoryTab = dynamic(() => import('../tabs/ProductsInventoryTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

const ProductsReportsTab = dynamic(() => import('../tabs/ProductsReportsTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

const ProductsBIDashboardTab = dynamic(() => import('../tabs/ProductsBIDashboardTab'), { 
  ssr: false,
  loading: () => <TabLoadingSkeleton />
});

function TabLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export function ProductsTabs() {
  const { activeTab, actions } = useProducts();

  const tabs = [
    {
      value: 'overview',
      label: 'Resumen',
      icon: TrendingUp,
      component: ProductsOverviewTab
    },
    {
      value: 'analytics',
      label: 'Análisis',
      icon: BarChart3,
      component: ProductsAnalyticsTab
    },
    {
      value: 'bi-dashboard',
      label: 'BI Dashboard',
      icon: Brain,
      component: ProductsBIDashboardTab
    },
    {
      value: 'products',
      label: 'Productos',
      icon: Package,
      component: ProductsListTab
    },
    {
      value: 'recommendations',
      label: 'Recomendaciones',
      icon: Activity,
      component: ProductsRecommendationsTab
    },
    {
      value: 'inventory',
      label: 'Inventario',
      icon: Package,
      component: ProductsInventoryTab
    },
    {
      value: 'reports',
      label: 'Reportes',
      icon: Download,
      component: ProductsReportsTab
    }
  ];

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={actions.setActiveTab} 
      className="space-y-6"
    >
      <TabsList className="grid w-full grid-cols-7">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <TabsTrigger 
              key={tab.value}
              value={tab.value} 
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tabs.map(tab => {
        const Component = tab.component;
        return (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <Component />
            </Suspense>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}