'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/types';

interface BIDrillDownTableProps {
  title: string;
  data: Product[];
  categories: Category[];
  dimension: 'category' | 'supplier' | 'price_range';
  className?: string;
}

interface DrillDownNode {
  id: string;
  name: string;
  level: 'category' | 'product';
  metrics: {
    revenue: number;
    products?: number;
    stock: number;
    avg_price?: number;
    margin?: number;
  };
  children?: DrillDownNode[];
  isExpanded?: boolean;
}

export function BIDrillDownTable({ title, data, categories, dimension, className }: BIDrillDownTableProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const generateDrillDownData = (): DrillDownNode[] => {
    switch (dimension) {
      case 'category':
        return categories.map(category => {
          const categoryProducts = data.filter(p => p.category_id === category.id);
          const revenue = categoryProducts.reduce((sum, p) => 
            sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0
          );
          const totalStock = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
          const avgPrice = categoryProducts.length > 0 ?
            categoryProducts.reduce((sum, p) => sum + (p.sale_price || 0), 0) / categoryProducts.length : 0;

          return {
            id: category.id,
            name: category.name,
            level: 'category' as const,
            metrics: {
              revenue,
              products: categoryProducts.length,
              stock: totalStock,
              avg_price: avgPrice
            },
            children: categoryProducts.map(product => ({
              id: product.id,
              name: product.name,
              level: 'product' as const,
              metrics: {
                revenue: (product.sale_price || 0) * (product.stock_quantity || 0),
                stock: product.stock_quantity || 0,
                avg_price: product.sale_price || 0,
                margin: product.cost_price ? 
                  ((product.sale_price || 0) - product.cost_price) / (product.sale_price || 1) * 100 : 0
              }
            }))
          };
        }).filter(node => node.metrics.products! > 0);

      default:
        return [];
    }
  };

  const drillDownData = generateDrillDownData();

  const renderMetricCell = (value: number, type: 'currency' | 'number' | 'percentage') => {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (value: number, benchmark?: number) => {
    if (!benchmark) return null;
    if (value > benchmark) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < benchmark) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const renderRow = (node: DrillDownNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <React.Fragment key={node.id}>
        {/* Main Row */}
        <tr className={`border-b hover:bg-gray-50 ${node.level === 'category' ? 'bg-gray-25' : ''}`}>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleNode(node.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-6" />}
              
              <div className="flex items-center gap-2">
                {node.level === 'category' ? (
                  <Package className="h-4 w-4 text-blue-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gray-300" />
                )}
                <span className={`font-medium ${node.level === 'category' ? 'text-gray-900' : 'text-gray-700'}`}>
                  {node.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {node.level === 'category' ? 'Categoría' : 'Producto'}
                </Badge>
              </div>
            </div>
          </td>
          
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="font-medium">
                {renderMetricCell(node.metrics.revenue, 'currency')}
              </span>
              {getTrendIcon(node.metrics.revenue)}
            </div>
          </td>
          
          {node.level === 'category' && (
            <td className="px-4 py-3 text-right">
              <span className="text-sm text-muted-foreground">
                {node.metrics.products} productos
              </span>
            </td>
          )}
          
          <td className="px-4 py-3 text-right">
            <span className={`font-medium ${
              node.metrics.stock === 0 ? 'text-red-600' : 
              node.metrics.stock < 10 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {renderMetricCell(node.metrics.stock, 'number')}
            </span>
          </td>
          
          <td className="px-4 py-3 text-right">
            <span className="font-medium">
              {renderMetricCell(node.metrics.avg_price || 0, 'currency')}
            </span>
          </td>
          
          {node.level === 'product' && node.metrics.margin !== undefined && (
            <td className="px-4 py-3 text-right">
              <span className={`font-medium ${
                node.metrics.margin < 20 ? 'text-red-600' : 
                node.metrics.margin < 30 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {renderMetricCell(node.metrics.margin, 'percentage')}
              </span>
            </td>
          )}
        </tr>

        {/* Children Rows */}
        {isExpanded && hasChildren && node.children!.map(child => 
          renderRow(child, depth + 1)
        )}
      </React.Fragment>
    );
  };

  if (drillDownData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos disponibles para el análisis drill-down
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-900">
                  Elemento
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-4 w-4" />
                    Ingresos
                  </div>
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">
                  Productos
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">
                  <div className="flex items-center justify-end gap-1">
                    <Package className="h-4 w-4" />
                    Stock
                  </div>
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">
                  Precio Promedio
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">
                  Margen %
                </th>
              </tr>
            </thead>
            <tbody>
              {drillDownData.map(node => renderRow(node))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {drillDownData.length}
              </div>
              <p className="text-sm text-muted-foreground">Categorías</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(drillDownData.reduce((sum, node) => sum + node.metrics.revenue, 0))}
              </div>
              <p className="text-sm text-muted-foreground">Ingresos Totales</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {drillDownData.reduce((sum, node) => sum + (node.metrics.products || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Productos</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {drillDownData.reduce((sum, node) => sum + node.metrics.stock, 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Stock Total</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BIDrillDownTable;