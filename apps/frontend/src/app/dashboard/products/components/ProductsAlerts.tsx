'use client';

import { AlertTriangle, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProducts } from '../contexts/ProductsContext';

export function ProductsAlerts() {
  const { dashboardStats } = useProducts();
  
  if (dashboardStats.lowStockProducts === 0 && dashboardStats.outOfStockProducts === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {dashboardStats.outOfStockProducts > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-800 dark:text-red-300">
                Productos sin stock
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-400">
              {dashboardStats.outOfStockProducts} producto(s) sin stock requieren atención inmediata
            </p>
          </CardContent>
        </Card>
      )}
      
      {dashboardStats.lowStockProducts > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-800 dark:text-yellow-300">
                Stock bajo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 dark:text-yellow-400">
              {dashboardStats.lowStockProducts} producto(s) con stock bajo
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
