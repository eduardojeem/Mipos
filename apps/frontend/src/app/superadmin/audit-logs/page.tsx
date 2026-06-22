'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Search,
  RefreshCw,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Info,
  Loader2,
  Filter
} from 'lucide-react';
// import { createClient } from '@/lib/supabase/client'; // Removed
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  created_at: string;
}

const ACTION_TYPES = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.login',
  'user.logout',
  'organization.created',
  'organization.updated',
  'organization.deleted',
  'plan.changed',
  'settings.updated',
  'permission.granted',
  'permission.revoked',
];

const ENTITY_TYPES = [
  'user',
  'organization',
  'plan',
  'settings',
  'permission',
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval] = useState(30000);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const e = error as { message?: string; error?: string; details?: string; hint?: string; code?: string; status?: number };
      const base = e.message || e.error || e.details || e.hint;
      const code = e.code ? ` [${e.code}]` : '';
      const status = typeof e.status === 'number' ? ` (HTTP ${e.status})` : '';
      return base ? `${base}${code}${status}` : 'Error desconocido';
    }
    return 'Error desconocido';
  };

  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/superadmin/audit-logs?limit=100');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const newLogs = Array.isArray(result) ? result : (result.data || []);

      setLogs(newLogs);

      if (isRefresh) {
        toast.success('Logs actualizados', {
          description: `Se cargaron ${newLogs.length} registros`
        });
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error loading audit logs:', message);
      toast.error('Error al cargar logs', {
        description: message
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const handle = setInterval(() => loadLogs(true), refreshInterval);
    return () => clearInterval(handle);
  }, [autoRefresh, refreshInterval, loadLogs]);

  

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
      const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;

      return matchesSearch && matchesAction && matchesEntity && matchesSeverity;
    });
  }, [logs, searchQuery, actionFilter, entityFilter, severityFilter]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 backdrop-blur-md shadow-sm dark:text-red-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Crítico
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 backdrop-blur-md shadow-sm dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Advertencia
          </Badge>
        );
      case 'INFO':
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 backdrop-blur-md shadow-sm dark:text-blue-400">
            <Info className="h-3 w-3 mr-1" />
            Info
          </Badge>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('created')) {
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 backdrop-blur-md">Creado</Badge>;
    }
    if (action.includes('updated')) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 backdrop-blur-md">Actualizado</Badge>;
    }
    if (action.includes('deleted')) {
      return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 backdrop-blur-md">Eliminado</Badge>;
    }
    if (action.includes('login')) {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 backdrop-blur-md">Login</Badge>;
    }
    return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 backdrop-blur-md">{action}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Cargando logs de auditoría...</p>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl p-8">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-xl">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Logs de Auditoría
                </h1>
                <p className="text-muted-foreground mt-2 text-lg font-medium">
                  Historial completo de acciones y seguridad del sistema
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-4 py-2 text-sm bg-background/50 backdrop-blur-md border-border/50 text-foreground shadow-sm">
                {filteredLogs.length} registros
              </Badge>
              <Button
                onClick={() => loadLogs(true)}
                disabled={refreshing}
                variant="outline"
                className="bg-background/50 backdrop-blur-md border-border/50 hover:bg-muted/50 transition-all shadow-sm hover:shadow-md"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </>
                )}
              </Button>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  "transition-all shadow-sm hover:shadow-md",
                  autoRefresh 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0" 
                    : "bg-background/50 backdrop-blur-md border-border/50 hover:bg-muted/50"
                )}
              >
                {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-background/60 backdrop-blur-xl border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-blue-500/20" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Eventos Info</p>
                  <p className="text-3xl font-bold text-foreground">
                    {logs.filter(l => l.severity === 'INFO').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                  <Info className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-xl border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-yellow-500/20" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Advertencias</p>
                  <p className="text-3xl font-bold text-foreground">
                    {logs.filter(l => l.severity === 'WARNING').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-xl border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-red-500/20" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Críticos</p>
                  <p className="text-3xl font-bold text-foreground">
                    {logs.filter(l => l.severity === 'CRITICAL').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-background/60 backdrop-blur-xl border-border/50 shadow-lg relative overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-indigo-500" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Búsqueda</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Acción</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {ACTION_TYPES.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Entidad</label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Todas las entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las entidades</SelectItem>
                    {ENTITY_TYPES.map(entity => (
                      <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Severidad</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Todas las severidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Advertencia</SelectItem>
                    <SelectItem value="CRITICAL">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-background/60 backdrop-blur-xl border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Registros de Auditoría
            </CardTitle>
            <CardDescription>
              Últimos 100 eventos del sistema registrados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="font-semibold text-foreground/80 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80">Severidad</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Acción</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Entidad</TableHead>
                    <TableHead className="font-semibold text-foreground/80">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Usuario
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80">Organización</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border border-border/50 shadow-inner">
                            <FileText className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              {searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || severityFilter !== 'all'
                                ? 'No se encontraron logs'
                                : 'No hay logs de auditoría'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || severityFilter !== 'all'
                                ? 'Intenta con otros filtros'
                                : 'Los eventos del sistema aparecerán aquí'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="border-b border-border/50 transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{formatDate(log.created_at)}</span>
                            <span className="text-xs text-muted-foreground">{getRelativeTime(log.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-background/50 border-border/50 backdrop-blur-sm">
                            {log.entity_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground/90 font-medium">
                          {log.user_email || <span className="text-muted-foreground/70 italic">Sistema</span>}
                        </TableCell>
                        <TableCell className="text-sm text-foreground/90">
                          {log.organization_name || <span className="text-muted-foreground/70 italic">-</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                          {log.metadata && Object.keys(log.metadata).length > 0
                            ? JSON.stringify(log.metadata)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminGuard>
  );
}
