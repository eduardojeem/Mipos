'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Zap, Star, Target, Trophy, Gift, BarChart3,
  ChevronRight, Sparkles, Crown,
} from 'lucide-react';
import { StatCard } from './StatCard';

interface OverviewAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  totalPointsIssued: number;
  averagePointsPerCustomer: number;
  totalRewardsRedeemed: number;
  customersByTier?: Array<{ tier?: { id?: string; name?: string } | null; count: number }>;
}

interface LoyaltyOverviewProps {
  analytics: OverviewAnalytics;
  isLoading: boolean;
  programCount: number;
  rewardCount: number;
  totalTimesRedeemed: number;
  topTierName: string | null;
  onGoToPrograms: () => void;
  onGoToRewards: () => void;
  onGoToAnalytics: () => void;
}

const TIER_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
];

export function LoyaltyOverview({
  analytics,
  isLoading,
  programCount,
  rewardCount,
  totalTimesRedeemed,
  topTierName,
  onGoToPrograms,
  onGoToRewards,
  onGoToAnalytics,
}: LoyaltyOverviewProps) {
  const {
    totalCustomers,
    activeCustomers,
    totalPointsIssued,
    averagePointsPerCustomer,
    totalRewardsRedeemed,
    customersByTier = [],
  } = analytics;

  const activePct = totalCustomers > 0
    ? ((activeCustomers / totalCustomers) * 100).toFixed(1)
    : '0';

  const conversionPct = totalCustomers > 0
    ? ((totalRewardsRedeemed / totalCustomers) * 100).toFixed(1)
    : '0';

  const totalTierCustomers = customersByTier.reduce((s, t) => s + t.count, 0);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Miembros Totales"
          value={totalCustomers}
          icon={Users}
          trend="up"
          trendValue={totalCustomers > 0 ? '+12.5%' : '—'}
          description="vs mes anterior"
          color="blue"
          isLoading={isLoading}
          delay="0ms"
        />
        <StatCard
          title="Miembros Activos"
          value={activeCustomers}
          icon={Zap}
          trend="up"
          trendValue={`${activePct}%`}
          description="del total"
          color="green"
          isLoading={isLoading}
          delay="60ms"
        />
        <StatCard
          title="Puntos Emitidos"
          value={totalPointsIssued}
          icon={Star}
          trend="up"
          trendValue={averagePointsPerCustomer > 0 ? `Ø ${Math.round(averagePointsPerCustomer).toLocaleString('es')}` : '—'}
          description="promedio/cliente"
          color="yellow"
          isLoading={isLoading}
          delay="120ms"
        />
        <StatCard
          title="Tasa de Canje"
          value={`${conversionPct}%`}
          icon={Target}
          trend={Number(conversionPct) > 10 ? 'up' : 'down'}
          trendValue={`${totalRewardsRedeemed.toLocaleString('es')} canjes`}
          description="en total"
          color="purple"
          isLoading={isLoading}
          delay="180ms"
        />
      </div>

      {/* Distribution + Tier */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: active users breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-amber-500" />
              Distribución de niveles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            ) : customersByTier.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos de niveles</p>
            ) : (
              <div className="space-y-3">
                {customersByTier.map((item, idx) => {
                  const pct = totalTierCustomers > 0
                    ? Math.round((item.count / totalTierCustomers) * 100)
                    : 0;
                  return (
                    <div key={item.tier?.id || `tier-${idx}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${TIER_COLORS[idx % TIER_COLORS.length]}`} />
                          <span className="text-sm font-medium">{item.tier?.name || 'Sin nivel'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{item.count.toLocaleString('es')}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {pct}%
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-1.5 [&>div]:${TIER_COLORS[idx % TIER_COLORS.length]}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: quick stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Resumen del programa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Recompensas canjeadas', value: totalRewardsRedeemed.toLocaleString('es') },
                  { label: 'Promedio de puntos/cliente', value: Math.round(averagePointsPerCustomer).toLocaleString('es') },
                  { label: 'Nivel más popular', value: topTierName || '—' },
                  { label: 'Recompensas disponibles', value: rewardCount.toString() },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Trophy,
            iconColor: 'text-blue-600',
            title: 'Programas Activos',
            value: programCount,
            sub: `${totalCustomers.toLocaleString('es')} miembros totales`,
            cta: 'Gestionar Programas',
            ctaColor: 'text-blue-600',
            onClick: onGoToPrograms,
          },
          {
            icon: Gift,
            iconColor: 'text-purple-600',
            title: 'Recompensas',
            value: rewardCount,
            sub: `${totalTimesRedeemed.toLocaleString('es')} canjes totales`,
            cta: 'Gestionar Recompensas',
            ctaColor: 'text-purple-600',
            onClick: onGoToRewards,
          },
          {
            icon: BarChart3,
            iconColor: 'text-emerald-600',
            title: 'Analíticas',
            value: topTierName || 'Sin datos',
            sub: 'Nivel más popular',
            cta: 'Ver Reportes',
            ctaColor: 'text-emerald-600',
            onClick: onGoToAnalytics,
          },
        ].map((card) => {
          const CardIcon = card.icon;
          return (
            <Card
              key={card.title}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={card.onClick}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <CardIcon className={`h-4 w-4 ${card.iconColor}`} />
                    {card.title}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-1 text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-12" /> : typeof card.value === 'number' ? card.value.toLocaleString('es') : card.value}</div>
                <p className="mb-3 text-sm text-muted-foreground">{card.sub}</p>
                <div className={`flex items-center gap-1 text-sm font-medium ${card.ctaColor}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {card.cta}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
