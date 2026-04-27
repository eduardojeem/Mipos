'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3, Trophy, Gift, Activity, History, Settings,
  RefreshCw, Crown,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  useLoyaltyPrograms,
  useLoyaltyAnalytics,
  useAvailableRewards,
} from '@/hooks/use-loyalty';

// Sub-components
import { ProgramCard } from './components/ProgramCard';
import { RewardCard } from './components/RewardCard';
import { SyncIndicator } from './components/SyncIndicator';
import { ExportMenu } from './components/ExportMenu';
import { LoyaltyOverview } from './components/LoyaltyOverview';
import { LoyaltyHistory, type PointsTransaction } from './components/LoyaltyHistory';
import { LoyaltyAnalytics } from './components/LoyaltyAnalytics';
import { ProgramSettingsForm } from './components/ProgramSettingsForm';

// Hooks & utils
import { transformLoyaltyPrograms, transformLoyaltyRewards } from './utils/transformers';
import { useExport } from './hooks/useExport';
import { useFilters } from './hooks/useFilters';
import { usePersistentColumns } from './hooks/usePersistentColumns';

// Data API
import api from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number {
  return Number(v ?? 0) || 0;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function LoyaltyDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('overview');

  // ── Data ──
  const { data: programs = [], isPending: programsLoading } = useLoyaltyPrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 180 * 86400000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const { data: analytics, isPending: analyticsLoading } = useLoyaltyAnalytics(
    selectedProgramId, startDate, endDate
  );
  const { data: rewards = [] } = useAvailableRewards(selectedProgramId);

  // ── Transformed data ──
  const uiPrograms = useMemo(() => transformLoyaltyPrograms(programs), [programs]);
  const uiRewards = useMemo(() => transformLoyaltyRewards(rewards), [rewards]);

  // Select first program by default
  useEffect(() => {
    if (!selectedProgramId && uiPrograms.length > 0) {
      setSelectedProgramId(uiPrograms[0].id);
    }
  }, [uiPrograms, selectedProgramId]);

  // ── Filters ──
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

  // ── Transactions ──
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [txType, setTxType] = useState<string>('all');

  const loadTransactions = useCallback(async () => {
    if (!selectedProgramId) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const params: Record<string, string> = { programId: selectedProgramId };
      if (txType !== 'all') params.type = txType;
      const res = await api.get('/loyalty/points-transactions', { params });
      const items: PointsTransaction[] = res.data?.data?.items ?? [];
      setTransactions(items);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      setTxError(apiErr?.response?.data?.error || apiErr?.message || 'Error al cargar historial');
    } finally {
      setTxLoading(false);
    }
  }, [selectedProgramId, txType]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ── Export columns ──
  const [analyticsCols, setAnalyticsCols] = usePersistentColumns('loyalty_export_cols_analytics', {
    month: true, pointsIssued: true, rewardsRedeemed: true,
  });
  const [historyCols, setHistoryCols] = usePersistentColumns('loyalty_export_cols_history', {
    createdAt: true, type: true, points: true, description: true,
  });
  const [rewardsCols, setRewardsCols] = usePersistentColumns('loyalty_export_cols_rewards', {
    name: true, description: true, type: true, value: true,
    pointsCost: true, isActive: true, timesRedeemed: true, expiresAt: true,
  });
  const [tierCols, setTierCols] = usePersistentColumns('loyalty_export_cols_tiers', {
    tierId: true, tierName: true, count: true,
  });

  const { exportAnalytics, exportHistory, exportRewards, exportCustomersByTier } = useExport();

  // ── Refresh ──
  const refreshAll = async () => {
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'programs'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'analytics'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'rewards'] });
    await loadTransactions();
    toast({ title: 'Datos actualizados' });
  };

  // ── Analytics values ──
  interface LoyaltyAnalyticsData {
    totalCustomers?: unknown;
    activeCustomers?: unknown;
    totalPointsIssued?: unknown;
    averagePointsPerCustomer?: unknown;
    totalRewardsRedeemed?: unknown;
    customersByTier?: Array<{ tier?: { name?: string }; count?: number }>;
    pointsIssuedByMonth?: Array<{ month: string; points: unknown }>;
    rewardsRedeemedByMonth?: Array<{ month: string; count: unknown }>;
  }
  const ac: LoyaltyAnalyticsData = (analytics as LoyaltyAnalyticsData) || {};
  const totalCustomers = safeNum(ac.totalCustomers);
  const activeCustomers = safeNum(ac.activeCustomers);
  const totalPointsIssued = safeNum(ac.totalPointsIssued);
  const averagePointsPerCustomer = safeNum(ac.averagePointsPerCustomer);
  const totalRewardsRedeemed = safeNum(ac.totalRewardsRedeemed);
  const customersByTier = (ac.customersByTier ?? []).map((t) => ({
    tier: t.tier,
    count: safeNum(t.count),
  }));

  const selectedProgram = uiPrograms.find((p) => p.id === selectedProgramId);
  const topTierName = customersByTier[0]?.tier?.name || null;
  const totalTimesRedeemed = uiRewards.reduce((s, r) => s + r.timesRedeemed, 0);
  const maxRedeemed = Math.max(...uiRewards.map((r) => r.timesRedeemed), 1);

  const analyticsPointsByMonth: Array<{ month: string; value: number }> = (
    ac.pointsIssuedByMonth ?? []
  ).map((s) => ({ month: s.month, value: safeNum(s.points) }));

  const analyticsRewardsByMonth: Array<{ month: string; value: number }> = (
    ac.rewardsRedeemedByMonth ?? []
  ).map((s) => ({ month: s.month, value: safeNum(s.count) }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-2.5 shadow-sm">
            <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Programa de Lealtad
            </h1>
            <p className="text-sm text-muted-foreground">
              {programsLoading
                ? 'Cargando...'
                : `${uiPrograms.length} programa${uiPrograms.length !== 1 ? 's' : ''} · ${totalCustomers.toLocaleString('es')} miembros`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SyncIndicator isConnected={true} isSyncing={false} lastSync={new Date().toISOString()} />

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
              const issued = ac.pointsIssuedByMonth ?? [];
              const redeemed = ac.rewardsRedeemedByMonth ?? [];
              exportAnalytics(issued, redeemed, format, analyticsCols);
            }}
            onExportHistory={(format) => exportHistory(transactions, format, historyCols)}
            onExportRewards={(format) => exportRewards(rewardFilters.filteredData, format, rewardsCols)}
            onExportCustomersByTier={(format) => exportCustomersByTier(customersByTier, format, tierCols)}
            transactions={transactions}
            rewards={rewardFilters.filteredData}
            customersByTier={customersByTier}
            pointsIssuedByMonth={ac.pointsIssuedByMonth ?? []}
            rewardsRedeemedByMonth={ac.rewardsRedeemedByMonth ?? []}
          />

          <Button variant="outline" size="sm" className="gap-2" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>

          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* Tab bar */}
          <div className="border-b bg-muted/20">
            <TabsList className="flex h-auto w-full justify-start gap-0 rounded-none bg-transparent px-4 pt-3 pb-0">
              {[
                { value: 'overview', label: 'Resumen', icon: BarChart3 },
                { value: 'programs', label: 'Programas', icon: Trophy },
                { value: 'rewards', label: 'Recompensas', icon: Gift },
                { value: 'analytics', label: 'Analíticas', icon: Activity },
                { value: 'history', label: 'Historial', icon: History },
                { value: 'settings', label: 'Configuración', icon: Settings },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-foreground font-semibold shadow-sm dark:bg-neutral-900'
                        : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab content */}
          <div className="p-5">
            {/* Overview */}
            <TabsContent value="overview" className="mt-0">
              <LoyaltyOverview
                analytics={{
                  totalCustomers,
                  activeCustomers,
                  totalPointsIssued,
                  averagePointsPerCustomer,
                  totalRewardsRedeemed,
                  customersByTier,
                }}
                isLoading={programsLoading || analyticsLoading}
                programCount={uiPrograms.length}
                rewardCount={uiRewards.length}
                totalTimesRedeemed={totalTimesRedeemed}
                topTierName={topTierName}
                onGoToPrograms={() => setActiveTab('programs')}
                onGoToRewards={() => setActiveTab('rewards')}
                onGoToAnalytics={() => setActiveTab('analytics')}
              />
            </TabsContent>

            {/* Programs */}
            <TabsContent value="programs" className="mt-0 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Programas de Lealtad</h2>
                  <p className="text-sm text-muted-foreground">
                    Gestiona los programas disponibles para tus clientes
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="search"
                      placeholder="Buscar..."
                      className="h-9 rounded-md border bg-background px-3 pl-8 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={programFilters.searchTerm}
                      onChange={(e) => programFilters.setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
              </div>

              {programFilters.filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-2xl bg-purple-50 p-4 dark:bg-purple-950/30">
                    <Trophy className="h-10 w-10 text-purple-400" />
                  </div>
                  <h3 className="mb-1.5 text-lg font-semibold">Sin programas</h3>
                  <p className="text-sm text-muted-foreground">
                    {programFilters.searchTerm
                      ? 'Intenta con otros términos'
                      : 'Crea tu primer programa de lealtad'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {programFilters.filteredData.map((program) => (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      onEdit={() => {
                        setSelectedProgramId(program.id);
                        setActiveTab('settings');
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Rewards */}
            <TabsContent value="rewards" className="mt-0 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Recompensas</h2>
                  <p className="text-sm text-muted-foreground">
                    Gestiona las recompensas disponibles para canjear
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="search"
                      placeholder="Buscar..."
                      className="h-9 rounded-md border bg-background px-3 pl-8 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={rewardFilters.searchTerm}
                      onChange={(e) => rewardFilters.setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
              </div>

              {rewardFilters.filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-2xl bg-purple-50 p-4 dark:bg-purple-950/30">
                    <Gift className="h-10 w-10 text-purple-400" />
                  </div>
                  <h3 className="mb-1.5 text-lg font-semibold">Sin recompensas</h3>
                  <p className="text-sm text-muted-foreground">
                    {rewardFilters.searchTerm
                      ? 'Intenta con otros términos'
                      : 'Crea tu primera recompensa para los clientes'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rewardFilters.filteredData.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      maxRedeemed={maxRedeemed}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="mt-0">
              <LoyaltyAnalytics
                pointsIssuedByMonth={analyticsPointsByMonth}
                rewardsRedeemedByMonth={analyticsRewardsByMonth}
                isLoading={analyticsLoading}
                startDate={startDate}
                endDate={endDate}
                selectedProgramId={selectedProgramId}
                programs={uiPrograms.map((p) => ({ id: p.id, name: p.name }))}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onProgramChange={setSelectedProgramId}
              />
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="mt-0">
              <LoyaltyHistory
                transactions={transactions}
                isLoading={txLoading}
                error={txError}
                txType={txType}
                selectedProgramId={selectedProgramId}
                programs={uiPrograms.map((p) => ({ id: p.id, name: p.name }))}
                onTxTypeChange={setTxType}
                onProgramChange={setSelectedProgramId}
                onRefresh={loadTransactions}
              />
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4" />
                    Configuración del Programa
                  </CardTitle>
                  <CardDescription>
                    {selectedProgram
                      ? `Editando: ${selectedProgram.name}`
                      : 'Selecciona un programa en la pestaña Programas para configurarlo'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedProgram ? (
                    <ProgramSettingsForm
                      program={selectedProgram}
                      programId={selectedProgramId}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Ve a <strong>Programas</strong> y haz clic en el ícono de editar de un programa.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setActiveTab('programs')}
                      >
                        Ver programas
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
