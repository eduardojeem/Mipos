'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useAdminData } from '../hooks/useAdminData';

export function SystemOverview() {
  const { stats, organizations, loading, error } = useAdminData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPlanCount = (plan: string) => {
    return organizations.filter(org => org.subscription_plan === plan).length;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-red-300/50 dark:border-red-700/50 shadow-xl">
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-50" />
          <p className="text-red-600 dark:text-red-400">Error al cargar las estadísticas</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Organizations */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-purple-300/50 dark:border-purple-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              Organizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {stats.totalOrganizations}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                  {stats.activeSubscriptions} activas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-blue-300/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/50">
                <Users className="h-4 w-4 text-white" />
              </div>
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                  Total en el sistema
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MRR (Monthly Recurring Revenue) */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-green-300/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/50">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              MRR Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Ingreso recurrente mensual
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-orange-300/50 dark:border-orange-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/50">
                <Activity className="h-4 w-4 text-white" />
              </div>
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {stats.activeSubscriptions}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800">
                  {stats.totalOrganizations > 0 
                    ? `${Math.round((stats.activeSubscriptions / stats.totalOrganizations) * 100)}% del total` 
                    : '0%'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Plan */}
      {stats.totalOrganizations > 0 && (
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              Distribución por Planes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">FREE</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {getPlanCount('FREE')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formatCurrency(0)}/mes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">PRO</div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {getPlanCount('PRO') + getPlanCount('PROFESSIONAL')}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  $29/mes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-900 border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">ENTERPRISE</div>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {getPlanCount('ENTERPRISE')}
                </div>
                <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  $99/mes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
