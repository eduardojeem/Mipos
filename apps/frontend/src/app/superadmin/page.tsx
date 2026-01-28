'use client';

import { SuperAdminGuard } from './components/SuperAdminGuard';
import { SystemOverview } from './components/SystemOverview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  TrendingUp, 
  Users, 
  Building2, 
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAdminData } from './hooks/useAdminData';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SystemAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: Date;
}

export default function SuperAdminPage() {
  const { stats } = useAdminData();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [recentMetrics, setRecentMetrics] = useState({
    newUsersToday: 0,
    activeOrgs: 0,
    transactionsToday: 0,
  });

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    const supabase = createClient();
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get users created today
      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Get active organizations
      const { count: activeOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'ACTIVE');

      // Get sales today
      const { count: salesToday } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setRecentMetrics({
        newUsersToday: newUsers || 0,
        activeOrgs: activeOrgs || 0,
        transactionsToday: salesToday || 0,
      });

      // Generate system alerts based on real data
      const systemAlerts: SystemAlert[] = [];
      
      if (newUsers && newUsers > 0) {
        systemAlerts.push({
          id: '1',
          type: 'info',
          message: `${newUsers} ${newUsers === 1 ? 'nuevo usuario registrado' : 'nuevos usuarios registrados'} hoy`,
          timestamp: new Date(),
        });
      }

      if (activeOrgs && activeOrgs > 0) {
        systemAlerts.push({
          id: '2',
          type: 'success',
          message: `${activeOrgs} ${activeOrgs === 1 ? 'organización activa' : 'organizaciones activas'}`,
          timestamp: new Date(),
        });
      }

      setAlerts(systemAlerts);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      case 'info':
      default:
        return Activity;
    }
  };

  const getAlertColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'from-yellow-50/80 to-orange-50/80 dark:from-yellow-950/30 dark:to-orange-950/30',
          border: 'border-yellow-200/50 dark:border-yellow-800/50',
          icon: 'text-yellow-600 dark:text-yellow-400',
          iconBg: 'bg-yellow-500/20',
        };
      case 'success':
        return {
          bg: 'from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30',
          border: 'border-green-200/50 dark:border-green-800/50',
          icon: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-500/20',
        };
      case 'info':
      default:
        return {
          bg: 'from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30',
          border: 'border-blue-200/50 dark:border-blue-800/50',
          icon: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-500/20',
        };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Hace unos segundos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-pulse">
                <Crown className="h-7 w-7 text-white" />
              </div>
              Dashboard Super Admin
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Vista general del sistema SaaS y todas las organizaciones
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg shadow-green-500/50 hover:shadow-xl transition-shadow">
              <CheckCircle className="h-4 w-4 mr-2" />
              Sistema Operativo
            </Badge>
            <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white border-0 shadow-lg shadow-purple-500/50 hover:shadow-xl transition-shadow">
              <Crown className="h-4 w-4 mr-2" />
              Super Admin
            </Badge>
          </div>
        </div>

        {/* System Overview */}
        <SystemOverview />

        {/* Activity Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Alerts */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-blue-300/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/50">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                  Actividad Reciente
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => {
                    const Icon = getAlertIcon(alert.type);
                    const colors = getAlertColor(alert.type);
                    
                    return (
                      <div
                        key={alert.id}
                        className={`group flex items-center gap-3 p-4 bg-gradient-to-r ${colors.bg} rounded-xl border ${colors.border} hover:shadow-lg transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm`}
                      >
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <Icon className={`h-5 w-5 ${colors.icon}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {alert.message}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {formatTimeAgo(alert.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Metrics */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-purple-300/50 dark:border-purple-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                  Métricas Hoy
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* New Users Today */}
                <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nuevos usuarios hoy
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-slate-800 dark:text-slate-200">
                      {recentMetrics.newUsersToday}
                    </span>
                  </div>
                </div>

                {/* Active Organizations */}
                <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/50 dark:hover:from-green-950/20 dark:hover:to-emerald-950/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Organizaciones activas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-slate-800 dark:text-slate-200">
                      {recentMetrics.activeOrgs}
                    </span>
                    <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                      {stats.totalOrganizations > 0 
                        ? `${Math.round((recentMetrics.activeOrgs / stats.totalOrganizations) * 100)}%` 
                        : '0%'}
                    </Badge>
                  </div>
                </div>

                {/* Transactions Today */}
                <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-purple-950/20 dark:hover:to-pink-950/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Transacciones hoy
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-slate-800 dark:text-slate-200">
                      {recentMetrics.transactionsToday}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
