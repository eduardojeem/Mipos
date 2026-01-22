'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Users, Zap, Star, Target, Trophy, Gift, BarChart3, Settings, 
  TrendingUp, Award, Crown, Sparkles, Calendar, Activity, DollarSign,
  Filter, Search, RefreshCw, ChevronRight, History, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoyaltyPrograms, useLoyaltyAnalytics, useUpdateLoyaltyProgram, useAvailableRewards } from '@/hooks/use-loyalty';
import { createLoyaltyStore, LoyaltyState } from '@/lib/sync/loyalty-sync';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

// Componentes refactorizados
import { StatCard } from './components/StatCard';
import { ProgramCard } from './components/ProgramCard';
import { RewardCard } from './components/RewardCard';
import { SyncIndicator } from './components/SyncIndicator';
import { ExportMenu } from './components/ExportMenu';

// Utilidades y hooks
import { transformLoyaltyPrograms, transformLoyaltyRewards } from './utils/transformers';
import { useExport } from './hooks/useExport';
import { useFilters } from './hooks/useFilters';

export default function LoyaltyDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateProgramDialog, setShowCreateProgramDialog] = useState(false);
  const [showCreateRewardDialog, setShowCreateRewardDialog] = useState(false);
  
  // Datos principales
  const { data: programs = [], isPending: programsLoading } = useLoyaltyPrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 180 * 86400000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const { data: analytics } = useLoyaltyAnalytics(selectedProgramId, startDate, endDate);
  const { data: rewards = [] } = useAvailableRewards(selectedProgramId);
  
  // Transformar datos
  const uiPrograms = useMemo(() => transformLoyaltyPrograms(programs), [programs]);
  const uiRewards = useMemo(() => transformLoyaltyRewards(rewards), [rewards]);
  
  // Filtros con debouncing
  const programFilters = useFilters({
    data: uiPrograms,
    searchFields: ['name', 'description'],
    filterFn: (item, status) => {
      if (status === 'all') return true;
      return status === 'active' ? item.isActive : !item.isActive;
    },
  });

  const rewardFilters = useFilters({
    data: uiRewards,
    searchFields: ['name', 'description'],
    filterFn: (item, status) => {
      if (status === 'all') return true;
      return status === 'active' ? item.isActive : !item.isActive;
    },
  });

  // Exportación
  const { exportAnalytics, exportHistory, exportRewards, exportCustomersByTier } = useExport();
  
  // Sincronización
  const [syncCustomerId, setSyncCustomerId] = useState<string>('demo-customer-001');
  const loyaltySync = useMemo(() => createLoyaltyStore(syncCustomerId, 'store-01', 'pos-01'), [syncCustomerId]);
  const [syncState, setSyncState] = useState<LoyaltyState>(loyaltySync.store.getData());
  const [isSyncing, setIsSyncing] = useState(false);

  // Transacciones
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txType, setTxType] = useState<string>('all');

  // Columnas de exportación
  const [analyticsCols, setAnalyticsCols] = useState<Record<string, boolean>>({ 
    month: true, pointsIssued: true, rewardsRedeemed: true 
  });
  const [historyCols, setHistoryCols] = useState<Record<string, boolean>>({ 
    createdAt: true, type: true, points: true, description: true 
  });
  const [rewardsCols, setRewardsCols] = useState<Record<string, boolean>>({ 
    name: true, description: true, type: true, value: true, pointsCost: true, 
    isActive: true, timesRedeemed: true, expiresAt: true 
  });
  const [tierCols, setTierCols] = useState<Record<string, boolean>>({ 
    tierId: true, tierName: true, count: true 
  });

  const queryClient = useQueryClient();

  // Seleccionar primer programa por defecto
  useEffect(() => {
    if (!selectedProgramId && uiPrograms.length > 0) {
      setSelectedProgramId(uiPrograms[0].id);
    }
  }, [uiPrograms, selectedProgramId]);

  // Iniciar sincronización
  useEffect(() => {
    const unsub = loyaltySync.store.subscribe(s => setSyncState(s.data));
    loyaltySync.start();
    return () => { 
      unsub(); 
      loyaltySync.stop();
    };
  }, [loyaltySync]);

  // Cargar transacciones
  useEffect(() => {
    loadTransactions();
  }, [selectedProgramId, txType]);

  // Persistir columnas de exportación
  useEffect(() => {
    try {
      const a = localStorage.getItem('loyalty_export_cols_analytics');
      const h = localStorage.getItem('loyalty_export_cols_history');
      const r = localStorage.getItem('loyalty_export_cols_rewards');
      const t = localStorage.getItem('loyalty_export_cols_tiers');
      if (a) setAnalyticsCols(JSON.parse(a));
      if (h) setHistoryCols(JSON.parse(h));
      if (r) setRewardsCols(JSON.parse(r));
      if (t) setTierCols(JSON.parse(t));
    } catch {}
  }, []);

  useEffect(() => { 
    try { localStorage.setItem('loyalty_export_cols_analytics', JSON.stringify(analyticsCols)); } catch {} 
  }, [analyticsCols]);
  
  useEffect(() => { 
    try { localStorage.setItem('loyalty_export_cols_history', JSON.stringify(historyCols)); } catch {} 
  }, [historyCols]);
  
  useEffect(() => { 
    try { localStorage.setItem('loyalty_export_cols_rewards', JSON.stringify(rewardsCols)); } catch {} 
  }, [rewardsCols]);
  
  useEffect(() => { 
    try { localStorage.setItem('loyalty_export_cols_tiers', JSON.stringify(tierCols)); } catch {} 
  }, [tierCols]);

  // Funciones auxiliares
  const loadTransactions = async () => {
    if (!selectedProgramId) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const params = new URLSearchParams();
      params.append('programId', selectedProgramId);
      if (txType !== 'all') params.append('type', txType);
      const res = await fetch(`/api/loyalty/points-transactions?${params.toString()}`);
      const json = await res.json();
      const items = json?.data?.items ?? [];
      setTransactions(items);
    } catch (e: any) {
      setTxError(e?.message || 'Error al cargar historial');
    } finally {
      setTxLoading(false);
    }
  };

  const refreshAll = async () => {
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'programs'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'analytics'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'rewards'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'points-transactions'] });
    await loadTransactions();
  };

  const handleAdjustPoints = async (delta: number) => {
    try {
      setIsSyncing(true);
      await loyaltySync.actions.adjustPoints(delta, 'Ajuste manual', selectedProgramId);
      toast({
        title: 'Puntos ajustados',
        description: `Se ${delta > 0 ? 'agregaron' : 'restaron'} ${Math.abs(delta)} puntos`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron ajustar los puntos',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRedeemPoints = async () => {
    const candidate = rewardFilters.filteredData
      .filter((r) => Number(r.pointsCost || 0) <= Number(syncState.currentPoints || 0))
      .sort((a, b) => Number(a.pointsCost || 0) - Number(b.pointsCost || 0))[0];
    
    if (!candidate || !selectedProgramId) return;

    try {
      setIsSyncing(true);
      await loyaltySync.actions.redeemPoints(selectedProgramId, candidate.id);
      toast({
        title: 'Puntos canjeados',
        description: `Se canjeó la recompensa: ${candidate.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron canjear los puntos',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toDateInput = (d: Date) => {
    try {
      return d.toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  // Analíticas
  const ac: any = analytics || {};
  const totalCustomers = Number(ac.totalCustomers ?? 0);
  const activeCustomers = Number(ac.activeCustomers ?? 0);
  const totalPointsIssued = Number(ac.totalPointsIssued ?? 0);
  const averagePointsPerCustomer = Number(ac.averagePointsPerCustomer ?? 0);
  const totalRewardsRedeemed = Number(ac.totalRewardsRedeemed ?? 0);

  const selectedProgram = uiPrograms.find((p) => p.id === selectedProgramId);

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header mejorado */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Dashboard de Lealtad
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Gestiona programas de lealtad, recompensas y analiza el comportamiento de tus clientes
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <SyncIndicator 
            isConnected={true} 
            isSyncing={isSyncing}
            lastSync={syncState.lastActivity}
          />
          <ExportMenu
            analyticsCols={analyticsCols}
            setAnalyticsCols={setAnalyticsCols}
            historyCols={historyCols}
            setHistoryCols={setHistoryCols}
            rewardsCols={rewardsCols}
            setRewardsCols={setRewardsCols}
            tierCols={tierCols}
            setTierCols={setTierCols}
            onExportAnalytics={(format) => {
              const issued = (ac.pointsIssuedByMonth ?? []) as any[];
              const redeemed = (ac.rewardsRedeemedByMonth ?? []) as any[];
              exportAnalytics(issued, redeemed, format, analyticsCols);
            }}
            onExportHistory={(format) => exportHistory(transactions, format, historyCols)}
            onExportRewards={(format) => exportRewards(rewardFilters.filteredData, format, rewardsCols)}
            onExportCustomersByTier={(format) => exportCustomersByTier(ac.customersByTier ?? [], format, tierCols)}
            transactions={transactions}
            rewards={rewardFilters.filteredData}
            customersByTier={ac.customersByTier ?? []}
            pointsIssuedByMonth={ac.pointsIssuedByMonth ?? []}
            rewardsRedeemedByMonth={ac.rewardsRedeemedByMonth ?? []}
          />
          <Button variant="outline" className="gap-2" onClick={refreshAll}>
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button 
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
            type="button" 
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4" />
            Configuración
          </Button>
        </div>
      </motion.div>

      {/* Sincronización de Lealtad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sincronización de Lealtad</span>
            <div className="flex items-center space-x-2">
              <Input 
                value={syncCustomerId} 
                onChange={(e) => setSyncCustomerId(e.target.value)} 
                placeholder="customerId" 
                className="w-64" 
              />
              <Button onClick={() => handleAdjustPoints(10)} disabled={isSyncing}>+10</Button>
              <Button onClick={() => handleAdjustPoints(-5)} disabled={isSyncing}>−5</Button>
              <Button
                onClick={handleRedeemPoints}
                disabled={isSyncing || rewardFilters.filteredData.length === 0}
              >
                Redimir
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Cliente</p>
              <p>{syncState.customerId}</p>
            </div>
            <div>
              <p className="font-medium">Puntos</p>
              <Badge>{syncState.currentPoints}</Badge>
            </div>
            <div>
              <p className="font-medium">Redimidos</p>
              <Badge variant="secondary">{syncState.totalRedeemed}</Badge>
            </div>
            <div>
              <p className="font-medium">Últ. actividad</p>
              <p>{new Date(syncState.lastActivity).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-12 bg-muted/50">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-white">
            <BarChart3 className="w-4 h-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2 data-[state=active]:bg-white">
            <Trophy className="w-4 h-4" />
            Programas
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2 data-[state=active]:bg-white">
            <Gift className="w-4 h-4" />
            Recompensas
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-white">
            <Activity className="w-4 h-4" />
            Analíticas
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-white">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-white">
            <Settings className="w-4 h-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Miembros Totales"
              value={totalCustomers}
              icon={Users}
              trend="up"
              trendValue={totalCustomers > 0 ? 12.5 : 0}
              description="vs mes anterior"
              color="blue"
            />
            <StatCard
              title="Miembros Activos"
              value={activeCustomers}
              icon={Zap}
              trend="up"
              trendValue={((activeCustomers / Math.max(totalCustomers || 1, 1)) * 100).toFixed(1)}
              description="del total"
              color="green"
            />
            <StatCard
              title="Puntos Emitidos"
              value={totalPointsIssued}
              icon={Star}
              trend="up"
              trendValue={averagePointsPerCustomer}
              description="promedio por cliente"
              color="yellow"
            />
            <StatCard
              title="Tasa de Canje"
              value={`${(((totalRewardsRedeemed) / Math.max(totalCustomers || 1, 1)) * 100).toFixed(1)}%`}
              icon={Target}
              trend="up"
              trendValue={totalRewardsRedeemed}
              description="conversión"
              color="purple"
            />
          </div>

          {/* Métricas adicionales */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Ingresos por Lealtad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {totalRewardsRedeemed.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>+15.3% vs mes anterior</span>
                </div>
                <Progress value={75} className="mt-4" />
                <p className="text-xs text-muted-foreground mt-2">
                  75% del objetivo mensual alcanzado
                </p>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Distribución de Niveles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(ac.customersByTier ?? []).map((item: any) => (
                    <div key={item.tier?.id || 'none'} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted" />
                        <span className="text-sm">{item.tier?.name || 'Sin nivel'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveTab('programs')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-600" />
                    Programas Activos
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{uiPrograms.length}</div>
                <p className="text-sm text-muted-foreground mb-4">
                  {totalCustomers.toLocaleString()} miembros totales
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Sparkles className="w-4 h-4" />
                  <span>Gestionar Programas</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveTab('rewards')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-purple-600" />
                    Recompensas Disponibles
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{uiRewards.length}</div>
                <p className="text-sm text-muted-foreground mb-4">
                  {uiRewards.reduce((acc, r) => acc + r.timesRedeemed, 0).toLocaleString()} canjes totales
                </p>
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <Sparkles className="w-4 h-4" />
                  <span>Gestionar Recompensas</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveTab('analytics')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Analíticas Avanzadas
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-green-600 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-6 w-6 text-yellow-500" />
                  <span className="text-2xl font-bold">{(ac.customersByTier?.[0]?.tier?.name || 'Sin datos')}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Tier más popular este mes
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Sparkles className="w-4 h-4" />
                  <span>Ver Reportes Detallados</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Programas de Lealtad</h2>
              <p className="text-muted-foreground">Gestiona los programas de lealtad disponibles</p>
            </div>
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex gap-2 flex-1 lg:flex-initial">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar programas..."
                    value={programFilters.searchTerm}
                    onChange={(e) => programFilters.setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={programFilters.filterStatus} onValueChange={programFilters.setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowCreateProgramDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Programa
              </Button>
            </div>
          </div>

          <AnimatePresence>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {programFilters.filteredData.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          </AnimatePresence>

          {programFilters.filteredData.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron programas</h3>
                <p className="text-muted-foreground mb-4">
                  {programFilters.searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer programa de lealtad'}
                </p>
                <Button onClick={() => setShowCreateProgramDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Programa
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Recompensas</h2>
              <p className="text-muted-foreground">Gestiona las recompensas disponibles para canjear</p>
            </div>
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex gap-2 flex-1 lg:flex-initial">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar recompensas..."
                    value={rewardFilters.searchTerm}
                    onChange={(e) => rewardFilters.setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={rewardFilters.filterStatus} onValueChange={rewardFilters.setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowCreateRewardDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Recompensa
              </Button>
            </div>
          </div>

          <AnimatePresence>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rewardFilters.filteredData.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </div>
          </AnimatePresence>

          {rewardFilters.filteredData.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron recompensas</h3>
                <p className="text-muted-foreground mb-4">
                  {rewardFilters.searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primera recompensa'}
                </p>
                <Button onClick={() => setShowCreateRewardDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Recompensa
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Historial de Puntos</h2>
            <Select value={txType} onValueChange={setTxType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="EARNED">Ganados</SelectItem>
                <SelectItem value="REDEEMED">Canjeados</SelectItem>
                <SelectItem value="BONUS">Bono</SelectItem>
                <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                <SelectItem value="EXPIRED">Expirados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="p-6">Cargando…</div>
              ) : txError ? (
                <div className="p-6 text-red-600 text-sm">{txError}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Puntos</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider>
                      {transactions.map((t) => (
                        <Tooltip key={t.id}>
                          <TooltipTrigger asChild>
                            <TableRow>
                              <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                              <TableCell>{t.type}</TableCell>
                              <TableCell>{t.points}</TableCell>
                              <TableCell className="truncate max-w-[320px]">{t.description}</TableCell>
                            </TableRow>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div>{new Date(t.createdAt).toLocaleString()}</div>
                              <div>Tipo: {t.type}</div>
                              <div>Puntos: {Number(t.points || 0).toLocaleString()}</div>
                              <div>Descripción: {t.description}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Sin transacciones
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Rango de fechas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={toDateInput(startDate)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const d = new Date(`${v}T00:00:00Z`);
                      setStartDate(d);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={toDateInput(endDate)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const d = new Date(`${v}T23:59:59Z`);
                      setEndDate(d);
                    }}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getTime() - 30 * 86400000);
                    setStartDate(start);
                    setEndDate(now);
                  }}
                >
                  Últimos 30 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getTime() - 90 * 86400000);
                    setStartDate(start);
                    setEndDate(now);
                  }}
                >
                  Últimos 90 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getTime() - 180 * 86400000);
                    setStartDate(start);
                    setEndDate(now);
                  }}
                >
                  Últimos 180 días
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Puntos emitidos por mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const raw = (ac.pointsIssuedByMonth ?? []) as any[];
                  const series = raw.map((s: any) => ({ month: s.month, pointsIssued: Number(s.points || 0) }));
                  if (!series.length) return <p className="text-muted-foreground text-sm">Sin datos</p>;
                  const maxVal = Math.max(...series.map((s) => Number(s.pointsIssued || 0)), 1);
                  return (
                    <TooltipProvider>
                      <div className="space-y-3">
                        {series.map((s, idx) => (
                          <Tooltip key={`${s.month}-${idx}`}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-3 cursor-help">
                                <div className="w-20 text-xs text-muted-foreground">{s.month}</div>
                                <div className="flex-1 h-2 bg-muted rounded">
                                  <div
                                    className="h-2 bg-blue-600 rounded"
                                    style={{
                                      width: `${Math.min(100, (Number(s.pointsIssued || 0) / maxVal) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <div className="w-16 text-right text-xs">{Number(s.pointsIssued || 0)}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div>{s.month}</div>
                                <div>Puntos emitidos: {Number(s.pointsIssued || 0).toLocaleString()}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Recompensas canjeadas por mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const raw = (ac.rewardsRedeemedByMonth ?? []) as any[];
                  const series = raw.map((s: any) => ({ month: s.month, rewardsRedeemed: Number(s.count || 0) }));
                  if (!series.length) return <p className="text-muted-foreground text-sm">Sin datos</p>;
                  const maxVal = Math.max(...series.map((s) => Number(s.rewardsRedeemed || 0)), 1);
                  return (
                    <TooltipProvider>
                      <div className="space-y-3">
                        {series.map((s, idx) => (
                          <Tooltip key={`${s.month}-${idx}`}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-3 cursor-help">
                                <div className="w-20 text-xs text-muted-foreground">{s.month}</div>
                                <div className="flex-1 h-2 bg-muted rounded">
                                  <div
                                    className="h-2 bg-purple-600 rounded"
                                    style={{
                                      width: `${Math.min(100, (Number(s.rewardsRedeemed || 0) / maxVal) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <div className="w-16 text-right text-xs">{Number(s.rewardsRedeemed || 0)}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div>{s.month}</div>
                                <div>Recompensas canjeadas: {Number(s.rewardsRedeemed || 0).toLocaleString()}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración del Programa
              </CardTitle>
              <CardDescription>Gestiona la configuración del programa de lealtad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedProgram ? (
                <ProgramSettingsForm program={selectedProgram} programId={selectedProgramId} />
              ) : (
                <p className="text-sm text-muted-foreground">Selecciona un programa</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente de formulario de configuración de programa
interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  isActive: boolean;
  members: number;
  createdAt: string;
  tier?: string;
  color?: string;
}

function ProgramSettingsForm({ program, programId }: { program: LoyaltyProgram; programId: string }) {
  const updateProgram = useUpdateLoyaltyProgram();
  const MAX_MIN_PURCHASE = 1000000;
  const [form, setForm] = useState({
    pointsPerPurchase: Number(program.pointsPerPurchase || 0),
    minimumPurchase: Number(program.minimumPurchase || 0),
    welcomeBonus: Number((program as any).welcomeBonus || 0),
    birthdayBonus: Number((program as any).birthdayBonus || 0),
    referralBonus: Number((program as any).referralBonus || 0),
    pointsExpirationDays: Number((program as any).pointsExpirationDays ?? 0),
    isActive: Boolean(program.isActive),
    description: String(program.description || ''),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
      pointsPerPurchase: Number(program.pointsPerPurchase || 0),
      minimumPurchase: Number(program.minimumPurchase || 0),
      welcomeBonus: Number((program as any).welcomeBonus || 0),
      birthdayBonus: Number((program as any).birthdayBonus || 0),
      referralBonus: Number((program as any).referralBonus || 0),
      pointsExpirationDays: Number((program as any).pointsExpirationDays ?? 0),
      isActive: Boolean(program.isActive),
      description: String(program.description || ''),
    });
    setErrors({});
  }, [program]);

  const onChange = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    let msg = '';
    if (
      ['pointsPerPurchase', 'minimumPurchase', 'welcomeBonus', 'birthdayBonus', 'referralBonus', 'pointsExpirationDays'].includes(
        String(key)
      )
    ) {
      const num = Number(value);
      if (Number.isNaN(num)) msg = 'Debe ser numérico';
      else if (num < 0) msg = 'Debe ser mayor o igual a 0';
      else if (key === 'minimumPurchase' && num > MAX_MIN_PURCHASE) msg = `Máximo ${MAX_MIN_PURCHASE}`;
      else if (key === 'pointsExpirationDays' && num > 3650) msg = 'Máximo 3650 días';
    }
    if (key === 'description' && String(value).length > 500) msg = 'Máximo 500 caracteres';
    setErrors((prev) => ({ ...prev, [String(key)]: msg }));
  };

  const hasErrors = Object.values(errors).some((e) => e && e.length);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Puntos por compra</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center text-muted-foreground cursor-help">
                    <HelpCircle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Cantidad de puntos otorgados por cada compra.</TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              min={0}
              aria-invalid={!!errors.pointsPerPurchase}
              value={form.pointsPerPurchase}
              onChange={(e) => onChange('pointsPerPurchase', Number(e.target.value))}
            />
            {errors.pointsPerPurchase && <div className="text-xs text-red-600">{errors.pointsPerPurchase}</div>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Compra mínima</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center text-muted-foreground cursor-help">
                    <HelpCircle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Monto mínimo de compra para acumular puntos. Máximo {MAX_MIN_PURCHASE}.</TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              min={0}
              max={MAX_MIN_PURCHASE}
              aria-invalid={!!errors.minimumPurchase}
              value={form.minimumPurchase}
              onChange={(e) => onChange('minimumPurchase', Number(e.target.value))}
            />
            {errors.minimumPurchase && <div className="text-xs text-red-600">{errors.minimumPurchase}</div>}
          </div>
          <div className="space-y-2">
            <Label>Bono de bienvenida</Label>
            <Input
              type="number"
              min={0}
              aria-invalid={!!errors.welcomeBonus}
              value={form.welcomeBonus}
              onChange={(e) => onChange('welcomeBonus', Number(e.target.value))}
            />
            {errors.welcomeBonus && <div className="text-xs text-red-600">{errors.welcomeBonus}</div>}
          </div>
          <div className="space-y-2">
            <Label>Bono de cumpleaños</Label>
            <Input
              type="number"
              min={0}
              aria-invalid={!!errors.birthdayBonus}
              value={form.birthdayBonus}
              onChange={(e) => onChange('birthdayBonus', Number(e.target.value))}
            />
            {errors.birthdayBonus && <div className="text-xs text-red-600">{errors.birthdayBonus}</div>}
          </div>
          <div className="space-y-2">
            <Label>Bono por referido</Label>
            <Input
              type="number"
              min={0}
              aria-invalid={!!errors.referralBonus}
              value={form.referralBonus}
              onChange={(e) => onChange('referralBonus', Number(e.target.value))}
            />
            {errors.referralBonus && <div className="text-xs text-red-600">{errors.referralBonus}</div>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Días de expiración</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center text-muted-foreground cursor-help">
                    <HelpCircle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Días hasta que los puntos expiran. Máximo 3650.</TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              min={0}
              max={3650}
              aria-invalid={!!errors.pointsExpirationDays}
              value={form.pointsExpirationDays}
              onChange={(e) => onChange('pointsExpirationDays', Number(e.target.value))}
            />
            {errors.pointsExpirationDays && <div className="text-xs text-red-600">{errors.pointsExpirationDays}</div>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              aria-invalid={!!errors.description}
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
            />
            {errors.description && <div className="text-xs text-red-600">{errors.description}</div>}
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={form.isActive} onCheckedChange={(v) => onChange('isActive', v)} />
            <span className="text-sm">Programa activo</span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (!hasErrors) updateProgram.mutate({ id: programId, program: form });
            }}
            disabled={(updateProgram as any).isPending || hasErrors}
          >
            {(updateProgram as any).isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
