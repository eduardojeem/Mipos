'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SaaSMetrics {
  // Revenue Metrics
  mrr: number;
  arr: number;
  arpu: number;
  
  // Growth Metrics
  newOrganizations: number;
  churnedOrganizations: number;
  churnRate: number;
  growthRate: number;
  
  // Engagement Metrics
  activeOrganizations: number;
  trialingOrganizations: number;
  
  // Customer Metrics
  totalOrganizations: number;
  totalUsers: number;
  avgUsersPerOrg: number;
}

export default function SaaSMetricsPage() {
  // Fetch metrics (mock data for now)
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: async () => {
      // TODO: Implement real API endpoint
      // For now, calculate from existing data
      const [orgsRes, subsRes, invoicesRes, paymentsRes] = await Promise.all([
        fetch('/api/organizations'),
        fetch('/api/subscriptions'),
        fetch('/api/invoices/stats/summary'),
        fetch('/api/payments/stats/summary')
      ]);

      const orgs = await orgsRes.json();
      const subs = await subsRes.json();
      const invoiceStats = await invoicesRes.json();
      const paymentStats = await paymentsRes.json();

      // Calculate MRR (Monthly Recurring Revenue)
      const activeSubs = subs.data?.filter((s: any) => s.status === 'active' || s.status === 'trialing') || [];
      const mrr = activeSubs.reduce((sum: number, sub: any) => {
        const monthlyPrice = sub.planInterval === 'yearly' ? sub.planPrice / 12 : 
                           sub.planInterval === 'quarterly' ? sub.planPrice / 3 : 
                           sub.planPrice;
        return sum + monthlyPrice;
      }, 0);

      const metrics: SaaSMetrics = {
        mrr,
        arr: mrr * 12,
        arpu: activeSubs.length > 0 ? mrr / activeSubs.length : 0,
        newOrganizations: orgs.data?.filter((o: any) => {
          const createdDate = new Date(o.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdDate >= thirtyDaysAgo;
        }).length || 0,
        churnedOrganizations: subs.data?.filter((s: any) => s.status === 'canceled').length || 0,
        churnRate: activeSubs.length > 0 ? 
          (subs.data?.filter((s: any) => s.status === 'canceled').length / activeSubs.length) * 100 : 0,
        growthRate: 15.5, // Mock
        activeOrganizations: activeSubs.length,
        trialingOrganizations: subs.data?.filter((s: any) => s.status === 'trialing').length || 0,
        totalOrganizations: orgs.pagination?.total || 0,
        totalUsers: orgs.data?.reduce((sum: number, org: any) => sum + (org.user_count || 0), 0) || 0,
        avgUsersPerOrg: orgs.data?.length > 0 ? 
          orgs.data.reduce((sum: number, org: any) => sum + (org.user_count || 0), 0) / orgs.data.length : 0
      };

      return metrics;
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando métricas...</div>
          <p className="text-sm text-muted-foreground">Calculando datos del sistema</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Métricas SaaS</h1>
        <p className="text-muted-foreground">
          Indicadores clave de rendimiento del negocio
        </p>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ingresos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics?.mrr || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Monthly Recurring Revenue
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  +{formatPercentage(metrics?.growthRate || 0)} vs mes anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ARR</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(metrics?.arr || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Annual Recurring Revenue
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                Proyección anual basada en MRR
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ARPU</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(metrics?.arpu || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average Revenue Per User
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                Ingreso promedio por organización
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Growth Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Crecimiento</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevas Organizaciones</CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.newOrganizations || 0}</div>
              <p className="text-xs text-muted-foreground">
                Últimos 30 días
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics?.churnedOrganizations || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Organizaciones canceladas
              </p>
              <div className="text-xs text-red-600 font-medium mt-2">
                {formatPercentage(metrics?.churnRate || 0)} tasa de churn
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Crecimiento</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{formatPercentage(metrics?.growthRate || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Crecimiento mensual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Prueba</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {metrics?.trialingOrganizations || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Organizaciones en trial
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Engagement</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizaciones Activas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.activeOrganizations || 0}</div>
              <p className="text-xs text-muted-foreground">
                Con suscripción activa
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                {metrics?.totalOrganizations ? 
                  formatPercentage((metrics.activeOrganizations / metrics.totalOrganizations) * 100) : '0%'} del total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                En todas las organizaciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios por Org</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.avgUsersPerOrg?.toFixed(1) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio de usuarios
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Health Indicators */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Indicadores de Salud</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Salud del Negocio</CardTitle>
              <CardDescription>Indicadores clave de rendimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasa de Churn</span>
                <div className="flex items-center gap-2">
                  <Badge variant={metrics && metrics.churnRate < 5 ? 'default' : 'destructive'}>
                    {formatPercentage(metrics?.churnRate || 0)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {metrics && metrics.churnRate < 5 ? 'Saludable' : 'Requiere atención'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasa de Crecimiento</span>
                <div className="flex items-center gap-2">
                  <Badge variant={metrics && metrics.growthRate > 10 ? 'default' : 'secondary'}>
                    +{formatPercentage(metrics?.growthRate || 0)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {metrics && metrics.growthRate > 10 ? 'Excelente' : 'Moderado'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conversión Trial</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {metrics && metrics.trialingOrganizations > 0 ? 
                      formatPercentage((metrics.activeOrganizations / (metrics.activeOrganizations + metrics.trialingOrganizations)) * 100) : 
                      '0%'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    De trial a pago
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Objetivos del Mes</CardTitle>
              <CardDescription>Metas y progreso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">MRR Objetivo: $10,000</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics ? formatPercentage((metrics.mrr / 10000) * 100) : '0%'}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 transition-all"
                    style={{ width: `${metrics ? Math.min((metrics.mrr / 10000) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Nuevas Orgs: 20</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics ? formatPercentage((metrics.newOrganizations / 20) * 100) : '0%'}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${metrics ? Math.min((metrics.newOrganizations / 20) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Churn &lt; 5%</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics && metrics.churnRate < 5 ? '✓ Cumplido' : '✗ No cumplido'}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${metrics && metrics.churnRate < 5 ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
