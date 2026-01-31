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
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-destructive opacity-50" />
          <p className="text-destructive font-medium">Error al cargar las estadísticas</p>
          <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Organizations */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Organizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {stats.totalOrganizations}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
                  {stats.activeSubscriptions} activas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  Total en el sistema
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MRR (Monthly Recurring Revenue) */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              MRR Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
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
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {stats.activeSubscriptions}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400">
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
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              Distribución por Planes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground mb-1">FREE</div>
                <div className="text-2xl font-bold text-foreground">
                  {getPlanCount('FREE')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(0)}/mes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-200/50 dark:border-blue-800/50">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">PRO</div>
                <div className="text-2xl font-bold text-foreground">
                  {getPlanCount('PRO') + getPlanCount('PROFESSIONAL')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  $29/mes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-200/50 dark:border-purple-800/50">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">ENTERPRISE</div>
                <div className="text-2xl font-bold text-foreground">
                  {getPlanCount('ENTERPRISE')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
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
