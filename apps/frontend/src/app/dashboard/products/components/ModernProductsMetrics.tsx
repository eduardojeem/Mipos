'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  BarChart3,
  Zap,
  Star
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useProducts } from '../contexts/ProductsContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: string;
  badge?: string;
  onClick?: () => void;
}

const MetricCard = ({ title, value, icon: Icon, color, trend, badge, onClick }: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, scale: 1.02 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    onClick={onClick}
    className={`group ${onClick ? 'cursor-pointer' : ''}`}
  >
    <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {badge && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {badge}
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {value}
          </p>
          {trend && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export function ModernProductsMetrics() {
  const { dashboardStats, products, actions } = useProducts();

  const metrics = [
    {
      title: 'Total Productos',
      value: dashboardStats.totalProducts,
      icon: Package,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      trend: 'En inventario',
      onClick: () => actions.setActiveTab('products')
    },
    {
      title: 'Stock Bajo',
      value: dashboardStats.lowStockProducts,
      icon: AlertTriangle,
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      trend: 'Requieren reposición',
      badge: dashboardStats.lowStockProducts > 0 ? 'Atención' : undefined,
      onClick: () => {
        actions.updateFilters({ stockStatus: 'low_stock' });
        actions.setActiveTab('products');
      }
    },
    {
      title: 'Sin Stock',
      value: dashboardStats.outOfStockProducts,
      icon: Package,
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      trend: 'Productos agotados',
      badge: dashboardStats.outOfStockProducts > 0 ? 'Crítico' : undefined,
      onClick: () => {
        actions.updateFilters({ stockStatus: 'out_of_stock' });
        actions.setActiveTab('products');
      }
    },
    {
      title: 'Valor Inventario',
      value: formatCurrency(dashboardStats.totalValue),
      icon: DollarSign,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      trend: 'Valor total en stock'
    },
    {
      title: 'Agregados Reciente',
      value: dashboardStats.recentlyAdded,
      icon: Zap,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      trend: 'Últimos 7 días',
      onClick: () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        actions.updateFilters({ 
          dateFrom: weekAgo.toISOString().split('T')[0]
        });
        actions.setActiveTab('products');
      }
    },
    {
      title: 'Categoría Top',
      value: dashboardStats.topCategory,
      icon: Star,
      color: 'bg-gradient-to-br from-teal-500 to-teal-600',
      trend: 'Más productos',
      onClick: () => actions.setActiveTab('analytics')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Métricas de Productos
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Resumen del estado actual de tu inventario
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Actualizado ahora
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MetricCard {...metric} />
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Acciones Rápidas
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => actions.setActiveTab('products')}
                className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors text-left"
              >
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                <p className="font-medium text-blue-900 dark:text-blue-100">Ver Productos</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Lista completa</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  actions.updateFilters({ stockStatus: 'low_stock' });
                  actions.setActiveTab('products');
                }}
                className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors text-left"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mb-2" />
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Stock Bajo</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Revisar inventario</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => actions.setActiveTab('analytics')}
                className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors text-left"
              >
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                <p className="font-medium text-purple-900 dark:text-purple-100">Análisis</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Ver reportes</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => actions.setActiveTab('inventory')}
                className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors text-left"
              >
                <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                <p className="font-medium text-emerald-900 dark:text-emerald-100">Inventario</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Gestionar stock</p>
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}