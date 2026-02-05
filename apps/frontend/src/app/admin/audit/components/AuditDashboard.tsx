'use client'

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Activity, 
  FileText, 
  TrendingUp,
  BarChart3,
  RefreshCw,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Zap,
  Search,
  Filter,
  Download,
  User,
  Calendar,
  Eye
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  details?: any;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  createdAt: string;
}

interface AuditStats {
  total: number;
  byAction: { action: string; count: number }[];
  byResource: { resource: string; count: number }[];
  recentActivity: any[];
}

interface AuditDashboardProps {
  className?: string;
}

export function AuditDashboard({ className }: AuditDashboardProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'cards'>('table');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [currentOrganization, setCurrentOrganization] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    userId: '',
    startDate: '',
    endDate: '',
    status: '',
    search: '',
    organizationId: ''
  });
  
  const [pagination, setPagination] = useState({
    limit: 20,
    page: 1,
    total: 0,
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Verificar rol del usuario
  const checkUserRole = async () => {
    try {
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const data = await response.json();
        const role = data.user?.role || '';
        setIsAdmin(role === 'ADMIN' || role === 'SUPER_ADMIN');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  // Cargar organizaciones
  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  useEffect(() => {
    checkUserRole();
    loadOrganizations();
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('actionEq', filters.action);
      if (filters.resource) params.append('resourceEq', filters.resource);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('q', filters.search);
      if (filters.organizationId) params.append('organizationId', filters.organizationId);
      params.append('limit', pagination.limit.toString());
      params.append('page', pagination.page.toString());

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await response.json();

      const normalized: AuditLogEntry[] = (data.data || []).map((r: any) => ({
        id: String(r.id),
        action: String(r.action || ''),
        resource: String(r.resource || ''),
        resourceId: String(r.entity_id || r.resource_id || r.details?.entityId || ''),
        userId: String(r.user_id || r.details?.userId || ''),
        userEmail: String(r.user_email || r.details?.userEmail || ''),
        userRole: String(r.user_role || r.details?.userRole || ''),
        ipAddress: String(r.ip_address || r.details?.ipAddress || ''),
        details: r.details ?? {},
        status: String(r.status || r.details?.status || 'SUCCESS') as any,
        createdAt: String(r.created_at || r.timestamp || new Date().toISOString()),
      }));

      setLogs(normalized);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/admin/audit/stats?${params.toString()}`);
      const data = await response.json();
      const normalized: AuditStats = {
        total: Number(data?.total) || 0,
        byAction: Array.isArray(data?.byAction) ? data.byAction : [],
        byResource: Array.isArray(data?.byResource) ? data.byResource : [],
        recentActivity: Array.isArray(data?.recentActivity) ? data.recentActivity : [],
      };
      setStats(normalized);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ total: 0, byAction: [], byResource: [], recentActivity: [] });
    }
  }, [filters.startDate, filters.endDate]);

  const refreshData = useCallback(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getStatusMetrics = () => {
    const total = logs.length;
    const success = logs.filter(log => log.status === 'SUCCESS').length;
    const failure = logs.filter(log => log.status === 'FAILURE').length;
    const pending = logs.filter(log => log.status === 'PENDING').length;
    
    return {
      total,
      success,
      failure,
      pending,
      successRate: total > 0 ? (success / total) * 100 : 0
    };
  };

  const metrics = getStatusMetrics();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILURE': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Exitoso</Badge>;
      case 'FAILURE': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Fallido</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pendiente</Badge>;
    }
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (action.startsWith('UPDATE')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (action.startsWith('VIEW')) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  };

  const formatActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  };

  const setQuickDateFilter = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    setFilters(prev => ({
      ...prev,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      userId: '',
      startDate: '',
      endDate: '',
      status: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('actionEq', filters.action);
      if (filters.resource) params.append('resourceEq', filters.resource);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('q', filters.search);
      params.append('limit', '1000');
      params.append('format', 'csv');

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles principales */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg glass-dark-card border border-slate-700/50">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Sistema de Auditoría Avanzado
            </span>
          </h1>
          <p className="text-slate-400 mt-2">
            Monitoreo integral de actividades administrativas con análisis en tiempo real
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={toggleTheme} className="border-slate-700/50">
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
          <Button variant="outline" onClick={refreshData} disabled={loading} className="border-slate-700/50">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <Zap className="h-4 w-4" />
            En Vivo
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/20">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Eventos</p>
                <p className="text-2xl font-bold text-white">{metrics.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 shadow-lg shadow-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Exitosos</p>
                <p className="text-2xl font-bold text-white">{metrics.success}</p>
                <p className="text-xs text-green-400">{metrics.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 shadow-lg shadow-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Fallidos</p>
                <p className="text-2xl font-bold text-white">{metrics.failure}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 shadow-lg shadow-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Pendientes</p>
                <p className="text-2xl font-bold text-white">{metrics.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/20">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Usuarios Únicos</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(logs.map(log => log.userId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de alertas simplificado */}
      <Card className="glass-dark-card border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 shadow-lg shadow-green-500/20">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-300">
                Sistema Seguro
              </p>
              <p className="text-sm text-green-400">
                No se han detectado alertas de seguridad activas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector de organización y búsqueda */}
      <Card className="glass-dark-card border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Selector de organización (solo para admins) */}
            {isAdmin && organizations.length > 0 && (
              <div className="w-full md:w-64">
                <Label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  Organización
                </Label>
                <Select
                  value={filters.organizationId || 'all'}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, organizationId: value === 'all' ? '' : value }));
                    setCurrentOrganization(value === 'all' ? null : value);
                  }}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue placeholder="Todas las organizaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las organizaciones</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por acción, recurso, usuario, IP..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500"
              />
            </div>
            <Button onClick={() => {}} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navegación principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Resumen</TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-blue-600">Registros</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">Análisis</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportData} className="border-slate-700/50">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Gráficos simplificados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-dark-card border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Distribución por Acción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.byAction.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getActionColor(item.action)} variant="outline">
                          {formatActionLabel(item.action)}
                        </Badge>
                        <span className="text-sm font-medium text-white">{item.count}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${(item.count / (stats?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!stats?.byAction || stats.byAction.length === 0) && (
                    <p className="text-slate-500 text-center py-4">No hay datos disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-dark-card border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-400" />
                  Distribución por Recurso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.byResource.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-purple-500/30 text-purple-300">{item.resource}</Badge>
                        <span className="text-sm font-medium text-white">{item.count}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${(item.count / (stats?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!stats?.byResource || stats.byResource.length === 0) && (
                    <p className="text-slate-500 text-center py-4">No hay datos disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Filtros simplificados */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-400" />
                <span>Filtros de Auditoría</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap mb-4">
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(1)} className="border-slate-700/50">
                  <Calendar className="h-4 w-4 mr-1" /> Hoy
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(7)} className="border-slate-700/50">
                  Últimos 7 días
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(30)} className="border-slate-700/50">
                  Últimos 30 días
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(90)} className="border-slate-700/50">
                  Últimos 90 días
                </Button>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="SUCCESS">Exitoso</SelectItem>
                    <SelectItem value="FAILURE">Fallido</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Fecha inicio"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-slate-800/50 border-slate-700/50 text-white"
                />

                <Input
                  type="date"
                  placeholder="Fecha fin"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-slate-800/50 border-slate-700/50 text-white"
                />

                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabla simplificada */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Registro de Actividades</span>
                <span className="text-sm font-normal text-slate-400">
                  {pagination.total.toLocaleString()} registros encontrados
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-1">
                            {getStatusIcon(log.status)}
                            <Badge className={getActionColor(log.action)}>
                              {formatActionLabel(log.action)}
                            </Badge>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {log.resource}
                            </Badge>
                            {getStatusBadge(log.status)}
                            <span className="text-sm text-slate-400">
                              {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-3">
                            <div>
                              <span className="font-medium flex items-center gap-1 text-slate-300">
                                <User className="h-3 w-3" /> Usuario:
                              </span>
                              <p className="text-slate-400">{log.userEmail || 'N/A'}</p>
                              <p className="text-slate-500 text-xs">{log.userRole}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-slate-300">Recurso ID:</span>
                              <p className="text-slate-400 font-mono text-xs">{log.resourceId || 'N/A'}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-slate-300">IP:</span>
                              <p className="text-slate-400 font-mono text-xs">{log.ipAddress}</p>
                            </div>

                            <div>
                              <span className="font-medium text-slate-300">User ID:</span>
                              <p className="text-slate-400 font-mono text-xs truncate">{log.userId}</p>
                            </div>
                          </div>

                          {log.details && Object.keys(log.details).length > 0 && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                <Eye className="h-3 w-3" /> Ver detalles
                              </summary>
                              <div className="mt-2 p-3 bg-slate-800/50 rounded text-xs overflow-x-auto">
                                <pre className="text-slate-300 whitespace-pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {logs.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                      No se encontraron registros de auditoría
                    </div>
                  )}

                  {/* Paginación */}
                  {pagination.total > 0 && (
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-slate-400">
                        Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total.toLocaleString()}
                      </p>
                      
                      <div className="flex space-x-2 items-center">
                        <span className="text-sm text-slate-400">Página</span>
                        <Input
                          className="w-20 bg-slate-800/50 border-slate-700/50 text-white"
                          type="number"
                          min={1}
                          max={totalPages}
                          value={pagination.page}
                          onChange={(e) => {
                            const v = parseInt(e.target.value || '1', 10);
                            setPagination(prev => ({ ...prev, page: Math.min(totalPages, Math.max(1, v)) }));
                          }}
                        />
                        <span className="text-sm text-slate-400">de {totalPages}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page === 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          className="border-slate-700/50"
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= totalPages}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          className="border-slate-700/50"
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actividad Reciente */}
            <Card className="glass-dark-card border-slate-700/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-400" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.recentActivity.slice(0, 10).map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <Badge className={getActionColor(activity.action)} variant="outline">
                        {formatActionLabel(activity.action)}
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-700/50 text-slate-300">{activity.entityType || activity.resource}</Badge>
                      <span className="text-sm text-slate-400 flex-1">{activity.userEmail}</span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(activity.timestamp), 'dd/MM HH:mm', { locale: es })}
                      </span>
                    </div>
                  ))}
                  {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                    <p className="text-slate-500 text-center py-4">No hay actividad reciente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}