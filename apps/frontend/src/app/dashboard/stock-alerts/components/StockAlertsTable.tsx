'use client';

import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, AlertTriangle, Package, 
  ShoppingCart, Settings, TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/ui/permission-guard';

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number;
  severity: 'critical' | 'low' | 'warning';
  category: string;
  unitPrice: number;
  estimatedDaysLeft: number;
  lastRestocked: string;
  supplier?: string;
}

interface StockAlertsTableProps {
  alerts: StockAlert[];
  isLoading: boolean;
  selectedProducts: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onUpdateThreshold: (productId: string, threshold: number) => void;
  onCreateOrder: (productIds: string[]) => void;
}

export function StockAlertsTable({ 
  alerts, 
  isLoading, 
  selectedProducts,
  onSelectionChange,
  onUpdateThreshold, 
  onCreateOrder 
}: StockAlertsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!alerts?.length) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay alertas de stock</h3>
        <p className="text-muted-foreground">
          Todos los productos tienen stock suficiente.
        </p>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      critical: { label: 'Crítico', variant: 'destructive' as const, icon: AlertTriangle },
      low: { label: 'Bajo', variant: 'secondary' as const, icon: TrendingDown },
      warning: { label: 'Advertencia', variant: 'outline' as const, icon: Package }
    };

    const config = severityConfig[severity as keyof typeof severityConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(alerts.map(alert => alert.productId)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedProducts);
    if (checked) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    onSelectionChange(newSelection);
  };

  const isAllSelected = alerts.length > 0 && selectedProducts.size === alerts.length;
  const isPartiallySelected = selectedProducts.size > 0 && selectedProducts.size < alerts.length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Seleccionar todos"
                {...(isPartiallySelected && { 'data-state': 'indeterminate' })}
              />
            </TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Stock Actual</TableHead>
            <TableHead>Umbral Mínimo</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead>Días Restantes</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>
                <Checkbox
                  checked={selectedProducts.has(alert.productId)}
                  onCheckedChange={(checked) => 
                    handleSelectProduct(alert.productId, checked as boolean)
                  }
                  aria-label={`Seleccionar ${alert.productName}`}
                />
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{alert.productName}</div>
                  <div className="text-sm text-muted-foreground">
                    {alert.category}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className={`font-medium ${
                  alert.currentStock <= alert.minThreshold 
                    ? 'text-red-600' 
                    : 'text-foreground'
                }`}>
                  {alert.currentStock}
                </span>
              </TableCell>
              <TableCell>{alert.minThreshold}</TableCell>
              <TableCell>
                {getSeverityBadge(alert.severity)}
              </TableCell>
              <TableCell>
                <span className={`${
                  alert.estimatedDaysLeft <= 7 
                    ? 'text-red-600 font-medium' 
                    : alert.estimatedDaysLeft <= 14
                    ? 'text-orange-600'
                    : 'text-foreground'
                }`}>
                  {alert.estimatedDaysLeft}d
                </span>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(alert.unitPrice)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <PermissionGuard permission="stock-alerts.edit">
                      <DropdownMenuItem 
                        onClick={() => onUpdateThreshold(alert.productId, alert.minThreshold)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Ajustar Umbral
                      </DropdownMenuItem>
                    </PermissionGuard>
                    
                    <PermissionGuard permission="stock-alerts.create">
                      <DropdownMenuItem 
                        onClick={() => onCreateOrder([alert.productId])}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Crear Orden
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}