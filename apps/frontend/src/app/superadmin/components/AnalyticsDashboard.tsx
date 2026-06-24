'use client';

import { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Clock,
  DollarSign,
  Loader2,
  Medal,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// ── Paleta unificada ─────────────────────────────────────────────────────────
const CHART_COLORS = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  sky:     '#38bdf8',
  emerald: '#34d399',
  amber:   '#fbbf24',
  rose:    '#fb7185',
  slate:   '#64748b',
};

const PLAN_COLORS: Record<string, string> = {
  Free:         CHART_COLORS.slate,
  Starter:      CHART_COLORS.sky,
  Professional: CHART_COLORS.indigo,
  Pro:          CHART_COLORS.indigo,
  Enterprise:   CHART_COLORS.violet,
};

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
};

const AXIS_STYLE = { stroke: '#334155', style: { fontSize: '11px', fill: '#64748b' } };
const GRID_STYLE = { strokeDasharray: '3 3', stroke: '#1e293b' };

// ── Componente de KPI Card ────────────────────────────────────────────────────
function KpiCard({
  label,
  subtitle,
  value,
  sub,
  icon: Icon,
  accent,
  accentBg,
  accentBorder,
  trend,
  trendLabel,
}: {
  label: string;
  subtitle: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  accentBg: string;
  accentBorder: string;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = (trend ?? 0) > 0;
  const isNegative = (trend ?? 0) < 0;

  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-slate-900/70 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${accentBorder}`}>
      <div className={`pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full ${accentBg} blur-3xl opacity-50 transition-opacity group-hover:opacity-80`} />

      <div className="relative flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentBg} border ${accentBorder}`}>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        {typeof trend === 'number' && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums border ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : isNegative ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}>
            {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : isNegative ? <TrendingDown className="h-2.5 w-2.5" /> : null}
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{subtitle}</p>
        <div className={`mt-1 text-3xl font-black tabular-nums tracking-tight ${accent}`}>{value}</div>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        {trendLabel && <p className="mt-1 text-xs text-slate-400">{trendLabel}</p>}
      </div>
    </div>
  );
}

// ── Panel Section Header ──────────────────────────────────────────────────────
function SectionHeader({ subtitle, title, icon: Icon, accentColor = 'text-indigo-400' }: {
  subtitle: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
        <Icon className={`h-4 w-4 ${accentColor}`} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{subtitle}</p>
        <h3 className="text-sm font-bold text-slate-100">{title}</h3>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const { analytics, loading, error, refresh } = useAnalytics();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-5">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
          <Loader2 className="h-9 w-9 animate-spin text-indigo-400" />
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 blur-xl" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300">Cargando analíticas</p>
          <p className="text-xs text-slate-500">Consultando la base de datos…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
          <AlertTriangle className="h-9 w-9 text-rose-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Error al cargar datos</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">{error}</p>
        </div>
        <Button onClick={handleRefresh} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  const { growthData, planDistribution, activityData, revenueData, topOrganizations } = analytics;

  const currentMonth = growthData[growthData.length - 1]?.count || 0;
  const previousMonth = growthData[growthData.length - 2]?.count || 0;
  const growthPct = previousMonth > 0
    ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
    : 0;

  const totalOrgsFromGrowth = growthData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">

      {/* ── Refresh strip ── */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">
            Generado {new Date(analytics.generatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 gap-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="orgs"
          subtitle="TOTAL ORGANIZACIONES"
          value={totalOrgsFromGrowth}
          sub={`+${currentMonth} este mes`}
          icon={Building2}
          accent="text-indigo-400"
          accentBg="bg-indigo-500/10"
          accentBorder="border-indigo-500/20"
          trend={growthPct}
          trendLabel="vs mes anterior"
        />
        <KpiCard
          label="mrr"
          subtitle="MRR ESTIMADO"
          value={`$${revenueData.mrr.toLocaleString()}`}
          sub={`ARR: $${revenueData.arr.toLocaleString()}`}
          icon={DollarSign}
          accent="text-emerald-400"
          accentBg="bg-emerald-500/10"
          accentBorder="border-emerald-500/20"
        />
        <KpiCard
          label="subs"
          subtitle="SUSCRIPCIONES ACTIVAS"
          value={revenueData.activeSubscriptions}
          sub={`Prom: $${revenueData.averageRevenuePerSub.toFixed(2)}/sub`}
          icon={Sparkles}
          accent="text-violet-400"
          accentBg="bg-violet-500/10"
          accentBorder="border-violet-500/20"
        />
        <KpiCard
          label="growth"
          subtitle="TASA DE CRECIMIENTO"
          value={`${growthPct > 0 ? '+' : ''}${growthPct}%`}
          sub="vs mes anterior"
          icon={Activity}
          accent="text-amber-400"
          accentBg="bg-amber-500/10"
          accentBorder="border-amber-500/20"
          trend={growthPct}
        />
      </div>

      {/* ── Charts Row 1: Growth + Plan Distribution ── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Growth line chart — 3 cols */}
        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
          <SectionHeader subtitle="ÚLTIMOS 6 MESES" title="Crecimiento de Organizaciones" icon={BarChart3} accentColor="text-indigo-400" />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={growthData} margin={{ left: -20, right: 8 }}>
              <defs>
                <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="month" {...AXIS_STYLE} />
              <YAxis {...AXIS_STYLE} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={CHART_COLORS.indigo}
                strokeWidth={2.5}
                fill="url(#gradIndigo)"
                dot={{ fill: CHART_COLORS.indigo, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: CHART_COLORS.indigo, stroke: '#1e1b4b', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
          <SectionHeader subtitle="POR ORGANIZACIONES" title="Distribución de Planes" icon={PieChartIcon} accentColor="text-violet-400" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
              >
                {planDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PLAN_COLORS[entry.name] || CHART_COLORS.slate}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-1 space-y-1.5">
            {planDistribution.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: PLAN_COLORS[entry.name] || CHART_COLORS.slate }}
                  />
                  <span className="text-slate-400">{entry.name}</span>
                </div>
                <span className="font-semibold tabular-nums text-slate-300">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Activity + Top Orgs ── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Bar chart — 3 cols */}
        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
          <SectionHeader subtitle="ACTIVOS VS INACTIVOS" title="Actividad de Usuarios por Mes" icon={Users} accentColor="text-emerald-400" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityData} margin={{ left: -20, right: 8 }} barSize={10}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="month" {...AXIS_STYLE} />
              <YAxis {...AXIS_STYLE} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '12px' }}
                formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
              />
              <Bar dataKey="active" fill={CHART_COLORS.emerald} name="Activos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inactive" fill={CHART_COLORS.slate} name="Inactivos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top orgs — 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
          <SectionHeader subtitle="POR CANTIDAD DE USUARIOS" title="Top Organizaciones" icon={Medal} accentColor="text-amber-400" />

          <div className="space-y-2">
            {topOrganizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Building2 className="mb-2 h-8 w-8 text-slate-700" />
                <p className="text-xs text-slate-500">Sin datos disponibles</p>
              </div>
            ) : (
              topOrganizations.map((org, index) => {
                const MEDAL_COLORS = [
                  'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  'bg-slate-500/20 text-slate-300 border-slate-500/30',
                  'bg-orange-500/20 text-orange-400 border-orange-500/30',
                ];
                const medalClass = MEDAL_COLORS[index] || 'bg-slate-800 text-slate-500 border-slate-700';
                const maxCount = topOrganizations[0]?.user_count || 1;
                const barPct = (org.user_count / maxCount) * 100;

                return (
                  <div key={index} className="group flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-slate-700 hover:bg-slate-900">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${medalClass}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-200">{org.name}</p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500/70 transition-all"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Users className="h-3 w-3 text-slate-600" />
                      <span className="text-xs font-bold tabular-nums text-slate-300">{org.user_count}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Revenue quick stat */}
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">ARPU estimado</span>
              </div>
              <span className="text-sm font-black text-emerald-400">
                ${revenueData.activeSubscriptions > 0
                  ? (revenueData.mrr / revenueData.activeSubscriptions).toFixed(0)
                  : '0'}
                <span className="text-[10px] font-medium text-slate-500">/sub</span>
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
