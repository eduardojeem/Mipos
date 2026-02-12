'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Plus, Download } from 'lucide-react';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';

// Components
import {
  ReturnsStats,
  ReturnsTable,
  ReturnsFilters,
  CreateReturnModal,
  ReturnDetailsModal
} from './components';

// Hooks
import { useReturns, useReturnFilters } from './hooks';

export default function ReturnsPage() {
  console.log('🔍 [ReturnsPage] Module loaded');
  
  useEffect(() => {
    console.log('🔍 [ReturnsPage] Main component mounted');
  }, []);

  // Wrap in error boundary
  try {
    return (
      <PermissionProvider>
        <ReturnsPageContent />
      </PermissionProvider>
    );
  } catch (error) {
    console.error('🔍 [ReturnsPage] Error in PermissionProvider:', error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error al cargar permisos</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
      </div>
    );
  }
}

function ReturnsPageContent() {
  console.log('🔍 [ReturnsPageContent] Component rendering');
  
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Custom hooks
  const filters = useReturnFilters();

  // Sync activeTab with filters
  useEffect(() => {
    console.log('🔍 [ReturnsPageContent] activeTab changed:', activeTab);
    if (activeTab !== 'all') {
      filters.setStatus(activeTab);
    } else {
      filters.setStatus('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch data
  const {
    returns,
    pagination,
    stats,
    isLoading,
    error,
    createReturn,
    updateReturn,
    processReturn
  } = useReturns(filters.filters, page, pageSize);

  // Debug logs
  useEffect(() => {
    console.log('🔍 [ReturnsPageContent] Component mounted');
    console.log('🔍 [ReturnsPageContent] Filters:', filters.filters);
    console.log('🔍 [ReturnsPageContent] Page:', page, 'PageSize:', pageSize);
    console.log('🔍 [ReturnsPageContent] Returns:', returns?.length || 0);
    console.log('🔍 [ReturnsPageContent] IsLoading:', isLoading);
    console.log('🔍 [ReturnsPageContent] Stats:', stats);
    console.log('🔍 [ReturnsPageContent] Error:', error);
  }, [filters.filters, page, pageSize, returns, isLoading, stats, error]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <RotateCcw className="h-8 w-8 text-orange-600" />
            Devoluciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona las devoluciones de productos y reembolsos
          </p>
        </div>

        <div className="flex gap-2">
          <PermissionGuard permission="returns.export">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </PermissionGuard>

          <PermissionGuard permission="returns.create">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Devolución
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <ReturnsStats stats={stats} isLoading={isLoading} />

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Historial de Devoluciones</CardTitle>
            <ReturnsFilters filters={filters} />
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas</TabsTrigger>
              <TabsTrigger value="processed">Procesadas</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <ReturnsTable
                returns={returns}
                isLoading={isLoading}
                onViewDetails={setSelectedReturn}
                onUpdateStatus={updateReturn}
                onProcess={processReturn}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateReturnModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={createReturn}
      />

      {selectedReturn && (
        <ReturnDetailsModal
          return={selectedReturn}
          open={!!selectedReturn}
          onOpenChange={() => setSelectedReturn(null)}
          onUpdate={updateReturn}
          onProcess={processReturn}
        />
      )}
    </div>
  );
}
