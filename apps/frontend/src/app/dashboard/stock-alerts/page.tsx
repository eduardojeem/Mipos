'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';
import {
  AlertTriangle, Settings,
  TrendingDown, RefreshCw,
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';

// Components
import {
  StockAlertsStats,
  StockAlertsTable,
  StockAlertsFilters,
  AlertConfigModal,
  BulkActionsBar,
  StockTrendsChart
} from './components';

// Hooks
import { useStockAlerts, useAlertFilters, useAlertConfig } from './hooks';

const logger = createLogger('StockAlertsPage');

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

  // Custom hooks
  const filters = useAlertFilters();
  const { config, updateConfig } = useAlertConfig();
  const {
    alerts,
    stats,
    isLoading,
    refreshAlerts,
    updateThreshold,
    createPurchaseOrder,
    markAsResolved
  } = useStockAlerts(filters);

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'all') return alerts;
    return alerts?.filter((alert: any) => alert.severity === activeTab) || [];
  }, [alerts, activeTab]);

  const handleBulkAction = async (action: string) => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'Selección requerida',
        description: 'Selecciona al menos un producto.',
        variant: 'destructive',
      });
      return;
    }

    try {
      switch (action) {
        case 'create-order':
          createPurchaseOrder(Array.from(selectedProducts));
          break;
        case 'mark-resolved':
          markAsResolved(Array.from(selectedProducts));
          break;
      }
      setSelectedProducts(new Set());
    } catch (error) {
      logger.error('Bulk action error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            Alertas de Stock
          </h1>
          <p className="text-muted-foreground">
            Monitorea productos con stock bajo y gestiona reabastecimiento
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAlerts()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <PermissionGuard permission="stock-alerts.export">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </PermissionGuard>

          <PermissionGuard permission="stock-alerts.configure">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <StockAlertsStats stats={stats} isLoading={isLoading} />

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedProducts.size}
          onCreateOrder={() => handleBulkAction('create-order')}
          onMarkResolved={() => handleBulkAction('mark-resolved')}
          onClearSelection={() => setSelectedProducts(new Set())}
        />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Productos con Stock Bajo</CardTitle>
                <StockAlertsFilters filters={filters} />
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="critical" className="text-red-600">
                    Crítico
                  </TabsTrigger>
                  <TabsTrigger value="low" className="text-orange-600">
                    Bajo
                  </TabsTrigger>
                  <TabsTrigger value="warning" className="text-yellow-600">
                    Advertencia
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    Todos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  <StockAlertsTable
                    alerts={filteredAlerts}
                    isLoading={isLoading}
                    selectedProducts={selectedProducts}
                    onSelectionChange={setSelectedProducts}
                    onUpdateThreshold={updateThreshold}
                    onCreateOrder={createPurchaseOrder}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Trends Chart */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Tendencias de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StockTrendsChart />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Configuration Modal */}
      <AlertConfigModal
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
        config={config}
        onSave={updateConfig}
      />
    </div>
  );
}