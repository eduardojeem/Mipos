'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { StockAlertItem } from '@/lib/stock-alerts';
import { AlertTriangle, ExternalLink, Package, Settings2, TrendingDown } from 'lucide-react';

interface StockAlertsTableProps {
  alerts: StockAlertItem[];
  isLoading: boolean;
  selectedProducts: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onEditThreshold: (alert: StockAlertItem) => void;
}

function severityBadge(severity: StockAlertItem['severity']) {
  switch (severity) {
    case 'critical':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critica
        </Badge>
      );
    case 'low':
      return (
        <Badge className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300">
          <Package className="h-3 w-3" />
          Bajo minimo
        </Badge>
      );
    case 'warning':
      return (
        <Badge variant="outline" className="gap-1">
          <TrendingDown className="h-3 w-3" />
          Advertencia
        </Badge>
      );
    default:
      return null;
  }
}

export function StockAlertsTable({
  alerts,
  isLoading,
  selectedProducts,
  onSelectionChange,
  onEditThreshold,
}: StockAlertsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[24px_2fr_repeat(5,minmax(0,1fr))_120px] items-center gap-4 p-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((__, cellIndex) => (
              <Skeleton key={cellIndex} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No hay alertas activas</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Con los filtros actuales, todos los productos mantienen una cobertura saludable.
        </p>
      </div>
    );
  }

  const visibleIds = alerts.map((alert) => alert.productId);
  const selectedVisibleCount = visibleIds.filter((id) => selectedProducts.has(id)).length;
  const isAllSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const checkboxState = isAllSelected ? true : selectedVisibleCount > 0 ? 'indeterminate' : false;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(visibleIds));
      return;
    }

    onSelectionChange(new Set());
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const nextSelection = new Set(selectedProducts);

    if (checked) {
      nextSelection.add(productId);
    } else {
      nextSelection.delete(productId);
    }

    onSelectionChange(nextSelection);
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[44px]">
              <Checkbox
                checked={checkboxState}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
                aria-label="Seleccionar todos"
              />
            </TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Minimo</TableHead>
            <TableHead>Cobertura</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead>Reponer</TableHead>
            <TableHead className="w-[120px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>
                <Checkbox
                  checked={selectedProducts.has(alert.productId)}
                  onCheckedChange={(checked) => handleSelectProduct(alert.productId, checked === true)}
                  aria-label={`Seleccionar ${alert.productName}`}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/products/view/${alert.productId}`}
                      className="font-medium hover:underline"
                    >
                      {alert.productName}
                    </Link>
                    <Link
                      href={`/dashboard/products/view/${alert.productId}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Ver ${alert.productName}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {alert.sku} · {alert.category}
                    {alert.supplier ? ` · ${alert.supplier}` : ''}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-semibold">{alert.currentStock}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(alert.unitPrice)} venta
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{alert.minThreshold}</p>
                  <p className="text-xs text-muted-foreground">
                    Max {alert.maxThreshold ?? '--'}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{alert.coverageLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.dailySalesVelocity > 0
                      ? `${alert.dailySalesVelocity.toFixed(2)} u/dia`
                      : 'Sin consumo reciente'}
                  </p>
                </div>
              </TableCell>
              <TableCell>{severityBadge(alert.severity)}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{alert.recommendedRestock} u</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(alert.replenishmentCost)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <PermissionGuard permission="stock-alerts.edit">
                  <Button variant="outline" size="sm" onClick={() => onEditThreshold(alert)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Ajustar
                  </Button>
                </PermissionGuard>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
