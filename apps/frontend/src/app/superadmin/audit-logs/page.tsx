'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  metadata: Record<string, any>;
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

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (isRefresh = false) => {
    const supabase = createClient();

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);

      if (isRefresh) {
        toast.success('Logs actualizados', {
          description: `Se cargaron ${data?.length || 0} registros`
        });
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Error al cargar logs', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Crítico
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Advertencia
          </Badge>
        );
      case 'INFO':
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">
            <Info className="h-3 w-3 mr-1" />
            Info
          </Badge>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('created')) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Creado</Badge>;
    }
    if (action.includes('updated')) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Actualizado</Badge>;
    }
    if (action.includes('deleted')) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Eliminado</Badge>;
    }
    if (action.includes('login')) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Login</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                <Shield className="h-7 w-7 text-white" />
              </div>
              Logs de Auditoría
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Historial completo de acciones en el sistema
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-4 py-2 text-sm bg-blue-50 border-blue-200 text-blue-700">
              {filteredLogs.length} registros
            </Badge>
            <Button
              onClick={() => loadLogs(true)}
              disabled={refreshing}
              variant="outline"
              className="border-slate-300 dark:border-slate-700"
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
          </div>
        </div>

        {/* Filters */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Búsqueda</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar en logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Acción</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium">Entidad</label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium">Severidad</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
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
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registros de Auditoría
            </CardTitle>
            <CardDescription>
              Últimos 100 eventos del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Severidad</TableHead>
                    <TableHead className="font-semibold">Acción</TableHead>
                    <TableHead className="font-semibold">Entidad</TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Usuario
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Organización</TableHead>
                    <TableHead className="font-semibold">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                          <div>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                              {searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || severityFilter !== 'all'
                                ? 'No se encontraron logs'
                                : 'No hay logs de auditoría'}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(log.created_at)}</span>
                            <span className="text-xs text-slate-500">{getRelativeTime(log.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.entity_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_email || <span className="text-slate-400">Sistema</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.organization_name || <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs truncate">
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
