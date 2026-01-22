'use client';

import { Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentlyAdded: number;
  topCategory: string;
}

interface ProductsStatsProps {
  stats: DashboardStats;
  categories: any[];
}

export function ProductsStats({ stats, categories }: ProductsStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            +{stats.recentlyAdded} esta semana
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Gs {stats.totalValue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Valor del inventario</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Categoría Principal</CardTitle>
          <Badge variant="outline">{stats.topCategory}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {categories.find(c => c.name === stats.topCategory)?.name || 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">Más productos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.lowStockProducts + stats.outOfStockProducts}
          </div>
          <p className="text-xs text-muted-foreground">Requieren atención</p>
        </CardContent>
      </Card>
    </div>
  );
}
