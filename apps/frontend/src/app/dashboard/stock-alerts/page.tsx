'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import type { StockAlertItem } from '@/lib/stock-alerts';
import {
  AlertConfigModal,
  BulkActionsBar,
  StockAlertsFilters,
  StockAlertsStats,
  StockAlertsTable,
  StockTrendsChart,
} from './components';
import { useAlertConfig, useAlertFilters, useStockAlerts } from './hooks';

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function StockAlertsPage() {
  return (
    <PermissionProvider>
      <StockAlertsPageContent />
    </PermissionProvider>
  );
}

function StockAlertsPageContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('critical');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkThresholdValue, setBulkThresholdValue] = useState(10);
  const [editingAlert, setEditingAlert] = useState<StockAlertItem | null>(null);
  const [thresholdValue, setThresholdValue] = useState(0);

  const filters = useAlertFilters();
  const { config, updateConfig, isLoading: isConfigLoading, isUpdating: isConfigUpdating } = useAlertConfig();
  const {
    alerts,
    stats,
    trends,
    filterOptions,
    lastUpdated,
    isLoading,
    isFetching,
    refreshAlerts,
    updateThreshold,
    bulkUpdateThresholds,
    isUpdating,
    isBulkUpdating,
  } = useStockAlerts(filters);

  useEffect(() => {
    if (config) {
      setBulkThresholdValue(config.globalMinThreshold);
    }
  }, [config]);

  useEffect(() => {
    const validIds = new Set(alerts.map((alert) => alert.productId));
    setSelectedProducts((current) => {
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [alerts]);

  const tabCounts = useMemo(
    () => ({
      critical: alerts.filter((alert) => alert.severity === 'critical').length,
      low: alerts.filter((alert) => alert.severity === 'low').length,
      warning: alerts.filter((alert) => alert.severity === 'warning').length,
      all: alerts.length,
    }),
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'all') {
      return alerts;
    }

    return alerts.filter((alert) => alert.severity === activeTab);
  }, [activeTab, alerts]);

  const openThresholdEditor = (alert: StockAlertItem) => {
    setEditingAlert(alert);
    setThresholdValue(alert.minThreshold);
  };

  const handleThresholdSave = async () => {
    if (!editingAlert) {
      return;
    }

    await updateThreshold(editingAlert.productId, Math.max(0, thresholdValue));
    setEditingAlert(null);
  };

  const handleBulkApplyThreshold = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'Seleccion requerida',
        description: 'Selecciona al menos un producto para aplicar el cambio.',
        variant: 'destructive',
      });
      return;
    }

    await bulkUpdateThresholds(Array.from(selectedProducts), Math.max(0, bulkThresholdValue));
    setSelectedProducts(new Set());
  };

  const handleExport = (items: StockAlertItem[], filename: string) => {
    if (items.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay alertas para exportar con los filtros actuales.',
      });
      return;
    }

    downloadCsv(filename, [
      ['Producto', 'SKU', 'Categoria', 'Proveedor', 'Stock', 'Minimo', 'Severidad', 'Dias', 'Reponer'],
      ...items.map((item) => [
        item.productName,
        item.sku,
        item.category,
        item.supplier || '',
        item.currentStock,
        item.minThreshold,
        item.severity,
        item.estimatedDaysLeft ?? '',
        item.recommendedRestock,
      ]),
    ]);
  };

  const handleSelectedExport = () => {
    const selected = alerts.filter((alert) => selectedProducts.has(alert.productId));
    handleExport(selected, 'stock-alerts-selected.csv');
  };

  const syncLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString('es-PY', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Sin sincronizar';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sync con Supabase
            </Badge>
            <Badge variant="secondary">
              {config?.checkFrequency === 'hourly'
                ? 'Revision horaria'
                : config?.checkFrequency === 'weekly'
                  ? 'Revision semanal'
                  : 'Revision diaria'}
            </Badge>
          </div>

          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              Alertas de Stock
            </h1>
            <p className="text-muted-foreground">
              Vigila quiebres, ajusta minimos y sincroniza la cobertura de inventario por empresa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshAlerts()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <PermissionGuard permission="stock-alerts.export">
            <Button variant="outline" size="sm" onClick={() => handleExport(filteredAlerts, 'stock-alerts.csv')}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </PermissionGuard>

          <PermissionGuard permission="stock-alerts.configure">
            <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <StockAlertsStats stats={stats} isLoading={isLoading} />

      {selectedProducts.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedProducts.size}
          thresholdValue={bulkThresholdValue}
          onThresholdChange={setBulkThresholdValue}
          onApplyThreshold={handleBulkApplyThreshold}
          onExportSelection={handleSelectedExport}
          onClearSelection={() => setSelectedProducts(new Set())}
          isSubmitting={isBulkUpdating}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Productos en riesgo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ultima sincronizacion: {syncLabel}
                </p>
              </div>
              <StockAlertsFilters
                filters={filters}
                categories={filterOptions.categories}
                suppliers={filterOptions.suppliers}
                alertCount={filteredAlerts.length}
              />
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="critical">Criticas ({tabCounts.critical})</TabsTrigger>
                <TabsTrigger value="low">Bajo minimo ({tabCounts.low})</TabsTrigger>
                <TabsTrigger value="warning">Advertencia ({tabCounts.warning})</TabsTrigger>
                <TabsTrigger value="all">Todas ({tabCounts.all})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                <StockAlertsTable
                  alerts={filteredAlerts}
                  isLoading={isLoading}
                  selectedProducts={selectedProducts}
                  onSelectionChange={setSelectedProducts}
                  onEditThreshold={openThresholdEditor}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Tendencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StockTrendsChart trends={trends} stats={stats} isLoading={isLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Politica activa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Minimo global</p>
                  <p className="mt-1 text-lg font-semibold">{config?.globalMinThreshold ?? '--'} u</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen alerta</p>
                  <p className="mt-1 text-lg font-semibold">{config?.warningThreshold ?? '--'} u</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm font-medium">
                    {config?.enableEmailAlerts ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Push</p>
                  <p className="mt-1 text-sm font-medium">
                    {config?.enablePushNotifications ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>

              <PermissionGuard permission="stock-alerts.configure">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsConfigModalOpen(true)}
                  disabled={isConfigLoading}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Editar politica
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertConfigModal
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
        config={config}
        onSave={updateConfig}
        isSaving={isConfigUpdating}
      />

      <Dialog open={Boolean(editingAlert)} onOpenChange={(open) => !open && setEditingAlert(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ajustar minimo de producto</DialogTitle>
            <DialogDescription>
              {editingAlert?.productName || 'Selecciona un producto'} · stock actual {editingAlert?.currentStock ?? 0} u
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="product-threshold">Nuevo minimo</Label>
            <Input
              id="product-threshold"
              type="number"
              min={0}
              value={thresholdValue}
              onChange={(event) => setThresholdValue(Math.max(0, Number(event.target.value || 0)))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAlert(null)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleThresholdSave} disabled={isUpdating}>
              {isUpdating ? 'Guardando...' : 'Guardar umbral'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
