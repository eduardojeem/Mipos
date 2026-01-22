'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, Plus, History, TrendingUp, Bell, BarChart3, ArrowLeft, Award } from 'lucide-react';
import { PermissionGuard } from '@/components/ui/permission-guard';

// Hooks
import { 
    usePriceHistory, 
    usePriceAlerts, 
    useCreatePriceEntry, 
    useCreatePriceAlert,
    useUpdatePriceAlert,
    useDeletePriceAlert
} from '@/hooks/usePriceHistoryData';

// Components
import dynamic from 'next/dynamic';
import { PriceAnalyticsCards } from '@/components/suppliers/price-history/PriceAnalyticsCards';
import { PriceHistoryTable } from '@/components/suppliers/price-history/PriceHistoryTable';
const PriceTrendsCharts = dynamic(
  () => import('@/components/suppliers/price-history/PriceTrendsCharts').then(m => m.PriceTrendsCharts),
  { ssr: false }
);
import { PriceAlertsList } from '@/components/suppliers/price-history/PriceAlertsList';
import { CreatePriceEntryDialog } from '@/components/suppliers/price-history/CreatePriceEntryDialog';
import { CreatePriceAlertDialog } from '@/components/suppliers/price-history/CreatePriceAlertDialog';

export default function PriceHistoryPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('history');
    const [filters, setFilters] = useState({
        search: '',
        supplier: 'all',
        product: 'all',
        dateRange: '30'
    });
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

    // Data Fetching
    const { data: historyData, isLoading: isLoadingHistory } = usePriceHistory({
        search: filters.search,
        supplierId: filters.supplier === 'all' ? undefined : filters.supplier,
        productId: filters.product === 'all' ? undefined : filters.product,
        dateRange: filters.dateRange
    });
    const { data: alertsData, isLoading: isLoadingAlerts } = usePriceAlerts();
    
    // Mutations
    const createEntryMutation = useCreatePriceEntry();
    const createAlertMutation = useCreatePriceAlert();
    const updateAlertMutation = useUpdatePriceAlert();
    const deleteAlertMutation = useDeletePriceAlert();

    const handleCreateEntry = async (data: any) => {
        await createEntryMutation.mutateAsync(data);
        setIsCreateDialogOpen(false);
    };

    const handleCreateAlert = async (data: any) => {
        await createAlertMutation.mutateAsync(data);
        setIsAlertDialogOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Header with Back */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => router.push('/dashboard/suppliers/evaluation')}
                    >
                        <Award className="mr-2 h-4 w-4" />
                        Evaluación de Proveedores
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => router.push('/dashboard/suppliers/search')}
                    >
                        <Search className="mr-2 h-4 w-4" />
                        Búsqueda Avanzada
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Historial de Precios</h1>
                        <p className="text-muted-foreground">
                            Monitoreo y análisis de variación de costos
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <PermissionGuard permission="suppliers.edit">
                        {activeTab === 'alerts' ? (
                            <Button onClick={() => setIsAlertDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Alerta
                            </Button>
                        ) : (
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Registrar Precio
                            </Button>
                        )}
                    </PermissionGuard>
                </div>
            </div>

            {/* Analytics Cards */}
            <PriceAnalyticsCards stats={historyData?.stats || { 
                avgChange: 0, 
                totalEntries: 0, 
                activeAlerts: alertsData?.length || 0, 
                monitoredProducts: 0 
            }} />

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="h-4 w-4" /> Historial
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="gap-2">
                        <TrendingUp className="h-4 w-4" /> Tendencias
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="gap-2">
                        <Bell className="h-4 w-4" /> Alertas
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <BarChart3 className="h-4 w-4" /> Análisis
                    </TabsTrigger>
                </TabsList>

                {/* Filters Toolbar (Visible for History and Trends) */}
                {(activeTab === 'history' || activeTab === 'trends') && (
                    <div className="flex gap-4 p-4 bg-card rounded-lg border">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar producto o proveedor..." 
                                className="pl-9"
                                value={filters.search}
                                onChange={(e) => setFilters({...filters, search: e.target.value})}
                            />
                        </div>
                        <Select value={filters.dateRange} onValueChange={(v) => setFilters({...filters, dateRange: v})}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Periodo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30">Últimos 30 días</SelectItem>
                                <SelectItem value="90">Últimos 3 meses</SelectItem>
                                <SelectItem value="365">Último año</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" /> Filtros
                        </Button>
                    </div>
                )}

                <TabsContent value="history" className="space-y-4">
                    <PriceHistoryTable 
                        data={historyData?.items || []} 
                        loading={isLoadingHistory} 
                    />
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                    <PriceTrendsCharts 
                        trends={historyData?.trends || []} 
                        loading={isLoadingHistory} 
                    />
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <PriceAlertsList 
                        alerts={alertsData || []}
                        loading={isLoadingAlerts}
                        onToggle={(id, status) => updateAlertMutation.mutate({ id, data: { isActive: status } })}
                        onDelete={(id) => deleteAlertMutation.mutate(id)}
                        onCreate={() => setIsAlertDialogOpen(true)}
                    />
                </TabsContent>

                <TabsContent value="analytics">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4">
                            <PriceTrendsCharts 
                                trends={historyData?.trends || []} 
                                loading={isLoadingHistory} 
                            />
                        </div>
                        <div className="col-span-3 space-y-4">
                             <div className="p-6 bg-card rounded-lg border">
                                <h3 className="font-semibold mb-4">Resumen de Variaciones</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Total de Cambios</span>
                                        <span className="font-medium">{historyData?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Promedio de Aumento</span>
                                        <span className="font-medium text-red-500">
                                            +{historyData?.stats?.avgChange || 0}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Productos Monitoreados</span>
                                        <span className="font-medium">
                                            {historyData?.stats?.monitoredProducts || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <CreatePriceEntryDialog 
                open={isCreateDialogOpen} 
                onOpenChange={setIsCreateDialogOpen}
                onSubmit={handleCreateEntry}
                isSubmitting={createEntryMutation.isPending}
            />
            
            <CreatePriceAlertDialog
                open={isAlertDialogOpen}
                onOpenChange={setIsAlertDialogOpen}
                onSubmit={handleCreateAlert}
                isSubmitting={createAlertMutation.isPending}
            />
        </div>
    );
}
