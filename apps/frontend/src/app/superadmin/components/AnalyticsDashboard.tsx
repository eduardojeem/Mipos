'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Button } from '@/components/ui/button';
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
  ResponsiveContainer 
} from 'recharts';

const COLORS = {
  Free: '#94a3b8',
  Starter: '#3b82f6',
  Professional: '#8b5cf6',
  Pro: '#8b5cf6',
  Enterprise: '#f59e0b',
};

export function AnalyticsDashboard() {
  const { analytics, loading, error, refresh } = useAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-slate-500 font-medium">Cargando analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Error al cargar</h2>
          <p className="text-slate-500 mt-2">{error}</p>
        </div>
        <Button onClick={() => refresh()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  const { growthData, planDistribution, activityData, revenueData, topOrganizations } = analytics;

  // Calculate growth percentage
  const currentMonth = growthData[growthData.length - 1]?.count || 0;
  const previousMonth = growthData[growthData.length - 2]?.count || 0;
  const growthPercentage = previousMonth > 0 
    ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Organizations */}
        <Card className="backdrop-blur-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Total Organizaciones
              </CardTitle>
              <div className="p-2 rounded-xl bg-purple-500 shadow-lg">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {growthData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{currentMonth} este mes
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="backdrop-blur-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                MRR (Ingresos Mensuales)
              </CardTitle>
              <div className="p-2 rounded-xl bg-emerald-500 shadow-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              ${revenueData.mrr.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              ARR: ${revenueData.arr.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Suscripciones Activas
              </CardTitle>
              <div className="p-2 rounded-xl bg-blue-500 shadow-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {revenueData.activeSubscriptions}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Prom: ${revenueData.averageRevenuePerSub.toFixed(2)}/sub
            </p>
          </CardContent>
        </Card>

        {/* Growth Rate */}
        <Card className="backdrop-blur-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Tasa de Crecimiento
              </CardTitle>
              <div className="p-2 rounded-xl bg-amber-500 shadow-lg">
                <Activity className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {growthPercentage > 0 ? '+' : ''}{growthPercentage}%
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Crecimiento de Organizaciones
                </CardTitle>
                <CardDescription>Últimos 6 meses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fill="url(#colorGrowth)"
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-blue-600" />
                  Distribución de Planes
                </CardTitle>
                <CardDescription>Por cantidad de organizaciones</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Actividad de Usuarios
                </CardTitle>
                <CardDescription>Activos vs Inactivos por mes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend />
                <Bar dataKey="active" fill="#10b981" name="Activos" radius={[8, 8, 0, 0]} />
                <Bar dataKey="inactive" fill="#64748b" name="Inactivos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Organizations */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  Top 5 Organizaciones
                </CardTitle>
                <CardDescription>Por cantidad de usuarios</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topOrganizations.map((org, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-amber-500 text-white' : ''}
                      ${index === 1 ? 'bg-slate-400 text-white' : ''}
                      ${index === 2 ? 'bg-orange-600 text-white' : ''}
                      ${index > 2 ? 'bg-slate-300 text-slate-700' : ''}
                    `}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {org.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {org.user_count}
                    </span>
                  </div>
                </div>
              ))}
              {topOrganizations.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No hay datos disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-xs text-slate-500 text-center">
        Última actualización: {new Date(analytics.generatedAt).toLocaleString('es-ES')}
      </div>
    </div>
  );
}
