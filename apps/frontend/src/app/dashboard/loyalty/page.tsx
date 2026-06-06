'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, Trophy, Gift, Activity, History, Settings,
  RefreshCw, Crown, Plus, Star, Users, TrendingUp, Zap,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLoyaltyPrograms,
  useLoyaltyAnalytics,
  useAvailableRewards,
} from '@/hooks/use-loyalty';

// Sub-components
import { ProgramCard } from './components/ProgramCard';
import { RewardCard } from './components/RewardCard';
import { ExportMenu } from './components/ExportMenu';
import { LoyaltyOverview } from './components/LoyaltyOverview';
import { LoyaltyHistory, type PointsTransaction } from './components/LoyaltyHistory';
import { LoyaltyAnalytics } from './components/LoyaltyAnalytics';
import { ProgramSettingsForm } from './components/ProgramSettingsForm';
import { CreateProgramModal, CreateRewardModal, RedeemRewardModal } from './components/LoyaltyModals';

// Hooks & utils
import { transformLoyaltyPrograms, transformLoyaltyRewards } from './utils/transformers';
import { useExport } from './hooks/useExport';
import { useFilters } from './hooks/useFilters';
import { usePersistentColumns } from './hooks/usePersistentColumns';

// API
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeNum(v: unknown): number { return Number(v ?? 0) || 0; }

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

// ── Inline stat pills ─────────────────────────────────────────────────────────
function StatPill({
  icon: Icon, label, value, accent = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: 'default' | 'purple' | 'amber' | 'emerald' | 'rose';
}) {
  const cls = {
    default:  'bg-muted/60 text-foreground',
    purple:   'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    amber:    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    emerald:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    rose:     'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  }[accent];
  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium', cls)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline text-[11px] opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoyaltyDashboard() {
  const queryClient = useQueryClient();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('overview');

  // ── Data ──
  const { data: programs = [], isPending: programsLoading } = useLoyaltyPrograms();
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 180 * 86400000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const uiPrograms = useMemo(() => transformLoyaltyPrograms(programs), [programs]);

  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  useEffect(() => {
    if (!selectedProgramId && uiPrograms.length > 0) {
      setSelectedProgramId(uiPrograms[0].id);
    }
  }, [uiPrograms, selectedProgramId]);

  const effectiveProgramId = selectedProgramId || uiPrograms[0]?.id || '';

  const { data: analytics, isPending: analyticsLoading } = useLoyaltyAnalytics(
    effectiveProgramId, startDate, endDate
  );
  const { data: rewards = [] } = useAvailableRewards(effectiveProgramId);
  const uiRewards = useMemo(() => transformLoyaltyRewards(rewards), [rewards]);

  // ── Filters ──
  const programFilters = useFilters({
    data: uiPrograms,
    searchFields: ['name', 'description'],
    filterFn: (item, status) => status === 'all' ? true : status === 'active' ? item.isActive : !item.isActive,
  });
  const rewardFilters = useFilters({
    data: uiRewards,
    searchFields: ['name', 'description'],
    filterFn: (item, status) => status === 'all' ? true : status === 'active' ? item.isActive : !item.isActive,
  });

  // ── Transactions ──
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [txType, setTxType] = useState<string>('all');

  const loadTransactions = useCallback(async () => {
    if (!effectiveProgramId) return;
    setTxLoading(true); setTxError(null);
    try {
      const params: Record<string, string> = { programId: effectiveProgramId };
      if (txType !== 'all') params.type = txType;
      const res = await api.get('/loyalty/points-transactions', { params });
      setTransactions(res.data?.data?.items ?? []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setTxError(e?.response?.data?.error || e?.message || 'Error al cargar historial');
    } finally { setTxLoading(false); }
  }, [effectiveProgramId, txType]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // ── Export columns ──
  const [analyticsCols, setAnalyticsCols] = usePersistentColumns('loyalty_export_cols_analytics',
    { month: true, pointsIssued: true, rewardsRedeemed: true });
  const [historyCols, setHistoryCols] = usePersistentColumns('loyalty_export_cols_history',
    { createdAt: true, type: true, points: true, description: true });
  const [rewardsCols, setRewardsCols] = usePersistentColumns('loyalty_export_cols_rewards',
    { name: true, description: true, type: true, value: true, pointsCost: true, isActive: true, timesRedeemed: true, expiresAt: true });
  const [tierCols, setTierCols] = usePersistentColumns('loyalty_export_cols_tiers',
    { tierId: true, tierName: true, count: true });

  const { exportAnalytics, exportHistory, exportRewards, exportCustomersByTier } = useExport();

  // ── Refresh ──
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'programs'] }),
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'rewards'] }),
      loadTransactions(),
    ]);
    toast.success('Datos actualizados');
  };

  // ── Modals ──
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [createRewardOpen, setCreateRewardOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  // ── Computed analytics ──
  const ac: LoyaltyAnalyticsData = (analytics as LoyaltyAnalyticsData) || {};
  const totalCustomers = safeNum(ac.totalCustomers);
  const activeCustomers = safeNum(ac.activeCustomers);
  const totalPointsIssued = safeNum(ac.totalPointsIssued);
  const averagePointsPerCustomer = safeNum(ac.averagePointsPerCustomer);
  const totalRewardsRedeemed = safeNum(ac.totalRewardsRedeemed);
  const customersByTier = (ac.customersByTier ?? []).map((t) => ({ tier: t.tier, count: safeNum(t.count) }));
  const selectedProgram = uiPrograms.find((p) => p.id === selectedProgramId) ?? uiPrograms[0];
  const topTierName = customersByTier[0]?.tier?.name || null;
  const totalTimesRedeemed = uiRewards.reduce((s, r) => s + r.timesRedeemed, 0);
  const maxRedeemed = Math.max(...uiRewards.map((r) => r.timesRedeemed), 1);
  const analyticsPointsByMonth = (ac.pointsIssuedByMonth ?? []).map((s) => ({ month: s.month, value: safeNum(s.points) }));
  const analyticsRewardsByMonth = (ac.rewardsRedeemedByMonth ?? []).map((s) => ({ month: s.month, value: safeNum(s.count) }));
  const redemptionRate = totalPointsIssued > 0
    ? Math.round((totalRewardsRedeemed / totalPointsIssued) * 100) : 0;

  // ── Tab config ──
  const tabs = [
    { value: 'overview',   label: 'Resumen',        icon: BarChart3 },
    { value: 'programs',   label: 'Programas',       icon: Trophy,   count: uiPrograms.length },
    { value: 'rewards',    label: 'Recompensas',     icon: Gift,     count: uiRewards.length },
    { value: 'analytics',  label: 'Analíticas',      icon: Activity },
    { value: 'history',    label: 'Historial',       icon: History,  count: transactions.length },
    { value: 'settings',   label: 'Configuración',   icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Izquierda: icono + título + stats inline */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 ring-1 ring-purple-500/20">
            <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Programa de Lealtad</h1>

          {/* Stats inline */}
          {!programsLoading && (
            <>
              <StatPill icon={Users} label="Miembros" value={totalCustomers.toLocaleString('es')} accent="purple" />
              {totalPointsIssued > 0 && (
                <StatPill icon={Star} label="Puntos emitidos" value={totalPointsIssued.toLocaleString('es')} accent="amber" />
              )}
              {totalRewardsRedeemed > 0 && (
                <StatPill icon={TrendingUp} label="Tasa de canje" value={`${redemptionRate}%`} accent="emerald" />
              )}
              {uiPrograms.length > 0 && (
                <StatPill icon={Zap} label="Programas" value={uiPrograms.length} accent="default" />
              )}
            </>
          )}
        </div>

        {/* Derecha: acciones */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ExportMenu
            analyticsCols={analyticsCols} setAnalyticsCols={setAnalyticsCols}
            historyCols={historyCols} setHistoryCols={setHistoryCols}
            rewardsCols={rewardsCols} setRewardsCols={setRewardsCols}
            tierCols={tierCols} setTierCols={setTierCols}
            onExportAnalytics={(fmt) => exportAnalytics(ac.pointsIssuedByMonth ?? [], ac.rewardsRedeemedByMonth ?? [], fmt, analyticsCols)}
            onExportHistory={(fmt) => exportHistory(transactions, fmt, historyCols)}
            onExportRewards={(fmt) => exportRewards(rewardFilters.filteredData, fmt, rewardsCols)}
            onExportCustomersByTier={(fmt) => exportCustomersByTier(customersByTier, fmt, tierCols)}
            transactions={transactions}
            rewards={rewardFilters.filteredData}
            customersByTier={customersByTier}
            pointsIssuedByMonth={ac.pointsIssuedByMonth ?? []}
            rewardsRedeemedByMonth={ac.rewardsRedeemedByMonth ?? []}
          />

          <Button variant="ghost" size="icon" onClick={refreshAll} className="h-9 w-9 text-muted-foreground" title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Canjear */}
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => setRedeemOpen(true)} disabled={!effectiveProgramId || uiRewards.length === 0}>
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Canjear</span>
          </Button>

          {/* Nueva recompensa */}
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => { setCreateRewardOpen(true); }}
            disabled={!effectiveProgramId}>
            <Gift className="h-3.5 w-3.5 text-pink-500" />
            <span className="hidden sm:inline">Nueva recompensa</span>
          </Button>

          {/* Nuevo programa */}
          <Button size="sm" className="h-9 gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            onClick={() => setCreateProgramOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Programa
          </Button>
        </div>
      </div>

      {/* ═══ TABS ══════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          {/* Tab bar */}
          <div className="border-b border-border/40 bg-muted/20">
            <TabsList className="flex h-auto w-full justify-start gap-0 rounded-none bg-transparent px-3 pt-3 pb-0 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      'relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2.5 text-sm transition-all duration-150',
                      isActive
                        ? 'bg-card text-foreground font-semibold shadow-sm border-b-2 border-b-primary'
                        : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[10px]">
                        {tab.count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab content */}
          <div className="p-5">
            {/* ── Resumen ── */}
            <TabsContent value="overview" className="mt-0">
              <LoyaltyOverview
                analytics={{ totalCustomers, activeCustomers, totalPointsIssued, averagePointsPerCustomer, totalRewardsRedeemed, customersByTier }}
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

            {/* ── Programas ── */}
            <TabsContent value="programs" className="mt-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Programas de Lealtad</h2>
                  <p className="text-sm text-muted-foreground">Gestiona los programas disponibles para tus clientes</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="search" placeholder="Buscar..."
                      className="h-9 w-44 rounded-xl border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={programFilters.searchTerm}
                      onChange={(e) => programFilters.setSearchTerm(e.target.value)}
                    />
                    <Trophy className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button size="sm" className="h-9 gap-1.5 bg-purple-600 hover:bg-purple-700"
                    onClick={() => setCreateProgramOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Nuevo
                  </Button>
                </div>
              </div>

              {programFilters.filteredData.length === 0 ? (
                <EmptyState icon={Trophy} title="Sin programas"
                  subtitle={programFilters.searchTerm ? 'Intenta con otros términos' : 'Crea tu primer programa de lealtad'}
                  action={!programFilters.searchTerm ? (
                    <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                      onClick={() => setCreateProgramOpen(true)}>
                      <Plus className="h-4 w-4" /> Crear programa
                    </Button>
                  ) : undefined}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {programFilters.filteredData.map((program) => (
                    <ProgramCard key={program.id} program={program}
                      onEdit={() => { setSelectedProgramId(program.id); setActiveTab('settings'); }} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Recompensas ── */}
            <TabsContent value="rewards" className="mt-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Recompensas</h2>
                  <p className="text-sm text-muted-foreground">Gestiona las recompensas disponibles para canjear</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="search" placeholder="Buscar..."
                      className="h-9 w-44 rounded-xl border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={rewardFilters.searchTerm}
                      onChange={(e) => rewardFilters.setSearchTerm(e.target.value)}
                    />
                    <Gift className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button size="sm" variant="outline" className="h-9 gap-1.5"
                    onClick={() => setRedeemOpen(true)} disabled={uiRewards.length === 0}>
                    <Star className="h-3.5 w-3.5 text-amber-500" /> Canjear
                  </Button>
                  <Button size="sm" className="h-9 gap-1.5 bg-pink-600 hover:bg-pink-700"
                    onClick={() => setCreateRewardOpen(true)} disabled={!effectiveProgramId}>
                    <Plus className="h-3.5 w-3.5" /> Nueva
                  </Button>
                </div>
              </div>

              {rewardFilters.filteredData.length === 0 ? (
                <EmptyState icon={Gift} title="Sin recompensas"
                  subtitle={rewardFilters.searchTerm ? 'Intenta con otros términos' : 'Crea la primera recompensa para los clientes'}
                  action={!rewardFilters.searchTerm ? (
                    <Button size="sm" className="gap-1.5 bg-pink-600 hover:bg-pink-700"
                      onClick={() => setCreateRewardOpen(true)} disabled={!effectiveProgramId}>
                      <Plus className="h-4 w-4" /> Crear recompensa
                    </Button>
                  ) : undefined}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rewardFilters.filteredData.map((reward) => (
                    <RewardCard key={reward.id} reward={reward} maxRedeemed={maxRedeemed} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Analíticas ── */}
            <TabsContent value="analytics" className="mt-0">
              <LoyaltyAnalytics
                pointsIssuedByMonth={analyticsPointsByMonth}
                rewardsRedeemedByMonth={analyticsRewardsByMonth}
                isLoading={analyticsLoading}
                startDate={startDate} endDate={endDate}
                selectedProgramId={effectiveProgramId}
                programs={uiPrograms.map((p) => ({ id: p.id, name: p.name }))}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onProgramChange={setSelectedProgramId}
              />
            </TabsContent>

            {/* ── Historial ── */}
            <TabsContent value="history" className="mt-0">
              <LoyaltyHistory
                transactions={transactions}
                isLoading={txLoading}
                error={txError}
                txType={txType}
                selectedProgramId={effectiveProgramId}
                programs={uiPrograms.map((p) => ({ id: p.id, name: p.name }))}
                onTxTypeChange={setTxType}
                onProgramChange={setSelectedProgramId}
                onRefresh={loadTransactions}
              />
            </TabsContent>

            {/* ── Configuración ── */}
            <TabsContent value="settings" className="mt-0">
              <div className="rounded-xl border border-border/50 bg-muted/10">
                <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Configuración del Programa
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedProgram
                        ? `Editando: ${selectedProgram.name}`
                        : 'Selecciona un programa para configurarlo'}
                    </p>
                  </div>
                  {uiPrograms.length > 1 && (
                    <select
                      className="h-9 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={selectedProgramId}
                      onChange={(e) => setSelectedProgramId(e.target.value)}
                    >
                      {uiPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="p-5">
                  {selectedProgram ? (
                    <ProgramSettingsForm program={selectedProgram} programId={selectedProgram.id} />
                  ) : (
                    <EmptyState icon={Settings} title="Sin programa seleccionado"
                      subtitle="Ve a Programas y edita uno para configurarlo aquí"
                      action={
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('programs')}>
                          Ver programas
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* ═══ MODALES ════════════════════════════════════════════════════════════ */}
      <CreateProgramModal open={createProgramOpen} onOpenChange={setCreateProgramOpen} />

      <CreateRewardModal
        open={createRewardOpen}
        onOpenChange={setCreateRewardOpen}
        programId={effectiveProgramId}
        programs={uiPrograms.map((p) => ({ id: p.id, name: p.name }))}
        onProgramChange={setSelectedProgramId}
      />

      <RedeemRewardModal
        open={redeemOpen}
        onOpenChange={setRedeemOpen}
        programId={effectiveProgramId}
        rewards={uiRewards.map((r) => ({
          id: r.id, name: r.name,
          pointsCost: r.pointsCost, isActive: r.isActive,
        }))}
      />
    </div>
  );
}

// ── Empty state helper ─────────────────────────────────────────────────────────
function EmptyState({
  icon: Icon, title, subtitle, action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/30">
        <Icon className="h-8 w-8 text-purple-400" />
      </div>
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="mb-5 text-sm text-muted-foreground">{subtitle}</p>
      {action}
    </div>
  );
}
