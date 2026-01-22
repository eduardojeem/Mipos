'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Filter, Eye, Download, User, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLogEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  changes?: any;
  oldData?: any;
  newData?: any;
  timestamp: string;
  createdAt: string;
}

interface AuditStats {
  total: number;
  byAction: {
    create: number;
    update: number;
    delete: number;
  };
  byEntityType: {
    customer: number;
    user: number;
    product: number;
    sale: number;
  };
}

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [exactAction, setExactAction] = useState<string>('')
  const [actionOptions, setActionOptions] = useState<string[]>([])
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({})
  const [exactResource, setExactResource] = useState<string>('')
  const [resourceOptions, setResourceOptions] = useState<string[]>([])
  const [resourceCounts, setResourceCounts] = useState<Record<string, number>>({})
  const [pagination, setPagination] = useState({
    limit: 20,
    page: 1,
    total: 0,
    hasMore: false
  });

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.append('resource', filters.entityType);
      if (filters.action) params.append('action', filters.action);
      if (exactAction) params.append('actionEq', exactAction);
      if (exactResource) params.append('resourceEq', exactResource);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('q', filters.search);
      params.append('limit', pagination.limit.toString());
      params.append('page', pagination.page.toString());

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await response.json();

      const entries: AuditLogEntry[] = (data.data || []).map((log: any) => ({
        id: String(log.id),
        action: mapAction(String(log.action || '')),
        entityType: String(log.resource || ''),
        entityId: typeof log.details === 'object' && log.details && 'id' in log.details ? String(log.details.id) : '',
        userId: log.user_id ? String(log.user_id) : '',
        timestamp: String(log.created_at || ''),
        createdAt: String(log.created_at || ''),
      }))

      setLogs(entries);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        hasMore: ((data.total || 0) > prev.page * prev.limit)
      }));
      computeStats(entries);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem('audit_actions_cache_v1') : null
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && Array.isArray(parsed.items)) {
            setActionOptions(parsed.items as string[])
            if (parsed.counts && typeof parsed.counts === 'object') setActionCounts(parsed.counts as Record<string, number>)
            return
          }
        }
        const res = await fetch('/api/admin/audit?meta=actions&limit=500')
        const data = await res.json()
        const items: string[] = Array.isArray(data.items) ? data.items : []
        setActionOptions(items)
        if (data.counts && typeof data.counts === 'object') setActionCounts(data.counts as Record<string, number>)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('audit_actions_cache_v1', JSON.stringify({ items, counts: data.counts || {}, ts: Date.now() }))
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams()
        if (filters.entityType) params.append('resource', filters.entityType)
        if (filters.action) params.append('action', filters.action)
        if (exactAction) params.append('actionEq', exactAction)
        if (exactResource) params.append('resourceEq', exactResource)
        if (filters.userId) params.append('userId', filters.userId)
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.search) params.append('q', filters.search)
        params.append('meta', 'actions')
        params.append('limit', '500')
        const res = await fetch(`/api/admin/audit?${params.toString()}`)
        const data = await res.json()
        const items: string[] = Array.isArray(data.items) ? data.items : []
        setActionOptions(items)
        if (data.counts && typeof data.counts === 'object') setActionCounts(data.counts as Record<string, number>)
      } catch {}
    })()
  }, [filters, exactAction, exactResource])

  useEffect(() => {
    (async () => {
      try {
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem('audit_resources_cache_v1') : null
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && Array.isArray(parsed.items)) {
            setResourceOptions(parsed.items as string[])
            if (parsed.counts && typeof parsed.counts === 'object') setResourceCounts(parsed.counts as Record<string, number>)
            return
          }
        }
        const res = await fetch('/api/admin/audit?meta=resources&limit=500')
        const data = await res.json()
        const items: string[] = Array.isArray(data.items) ? data.items : []
        setResourceOptions(items)
        if (data.counts && typeof data.counts === 'object') setResourceCounts(data.counts as Record<string, number>)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('audit_resources_cache_v1', JSON.stringify({ items, counts: data.counts || {}, ts: Date.now() }))
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams()
        if (filters.entityType) params.append('resource', filters.entityType)
        if (filters.action) params.append('action', filters.action)
        if (exactAction) params.append('actionEq', exactAction)
        if (exactResource) params.append('resourceEq', exactResource)
        if (filters.userId) params.append('userId', filters.userId)
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.search) params.append('q', filters.search)
        params.append('meta', 'resources')
        params.append('limit', '500')
        const res = await fetch(`/api/admin/audit?${params.toString()}`)
        const data = await res.json()
        const items: string[] = Array.isArray(data.items) ? data.items : []
        setResourceOptions(items)
        if (data.counts && typeof data.counts === 'object') setResourceCounts(data.counts as Record<string, number>)
      } catch {}
    })()
  }, [filters, exactAction, exactResource])

  const computeStats = (entries: AuditLogEntry[]) => {
    const total = entries.length
    const byAction = entries.reduce((acc: Record<string, number>, e) => {
      const a = String(e.action || 'UNKNOWN').toUpperCase()
      acc[a] = (acc[a] || 0) + 1
      return acc
    }, {})
    const byEntityType = entries.reduce((acc: Record<string, number>, e) => {
      const t = String(e.entityType || 'UNKNOWN').toUpperCase()
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    setStats({
      total,
      byAction: {
        create: byAction['CREATE'] || 0,
        update: byAction['UPDATE'] || 0,
        delete: byAction['DELETE'] || 0,
      },
      byEntityType: {
        customer: byEntityType['CUSTOMER'] || 0,
        user: byEntityType['USER'] || 0,
        product: byEntityType['PRODUCT'] || 0,
        sale: byEntityType['SALE'] || 0,
      },
    })
  }

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, pagination.page]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'USER': return 'Usuario';
      case 'CUSTOMER': return 'Cliente';
      case 'PRODUCT': return 'Producto';
      case 'SALE': return 'Venta';
      case 'promotion': return 'Promoción';
      case 'user_profile': return 'Perfil de usuario';
      case 'customers': return 'Cliente';
      case 'products': return 'Producto';
      case 'sales': return 'Venta';
      default: return entityType;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Creado';
      case 'UPDATE': return 'Actualizado';
      case 'DELETE': return 'Eliminado';
      default: return action;
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.append('resource', filters.entityType);
      if (filters.action) params.append('action', filters.action);
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
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuarios</p>
                  <p className="text-2xl font-bold">{stats.byEntityType.user}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Actualizaciones</p>
                  <p className="text-2xl font-bold">{stats.byAction.update}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Eliminaciones</p>
                  <p className="text-2xl font-bold">{stats.byAction.delete}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Auditoría</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Select value={filters.entityType} onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="promotion">Promociones</SelectItem>
                <SelectItem value="user_profile">Perfil de usuario</SelectItem>
                <SelectItem value="customers">Clientes</SelectItem>
                <SelectItem value="products">Productos</SelectItem>
                <SelectItem value="sales">Ventas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="CREATE">Crear</SelectItem>
                <SelectItem value="UPDATE">Actualizar</SelectItem>
                <SelectItem value="DELETE">Eliminar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={exactAction} onValueChange={(value) => setExactAction(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Acción exacta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {actionOptions.map(a => (
                  <SelectItem key={a} value={a}>{`${a}${actionCounts[a] ? ` (${actionCounts[a]})` : ''}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={exactResource} onValueChange={(value) => setExactResource(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Recurso exacto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {resourceOptions.map(r => (
                  <SelectItem key={r} value={r}>{`${getEntityTypeLabel(r)}${resourceCounts[r] ? ` (${resourceCounts[r]})` : ''}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="ID de usuario"
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            />

            <Input
              type="date"
              placeholder="Fecha inicio"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />

            <Input
              type="date"
              placeholder="Fecha fin"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />

            <Input
              type="text"
              placeholder="Buscar acción/recurso/detalles"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />

            <Button onClick={exportLogs} variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getActionColor(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <Badge variant="outline">
                          {getEntityTypeLabel(log.entityType)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Usuario:</span>
                          <p className="text-gray-600">{log.userEmail}</p>
                          <p className="text-gray-500 text-xs">{log.userRole}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium">Entidad:</span>
                          <p className="text-gray-600">{log.entityId}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium">IP:</span>
                          <p className="text-gray-600">{log.ipAddress}</p>
                        </div>
                      </div>

                      {(log.oldData || log.newData) && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                            Ver detalles de cambios
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            {log.oldData && (
                              <div className="mb-2">
                                <span className="font-medium text-red-600">Datos anteriores:</span>
                                <pre className="mt-1 text-gray-600">{JSON.stringify(log.oldData, null, 2)}</pre>
                              </div>
                            )}
                            {log.newData && (
                              <div>
                                <span className="font-medium text-green-600">Datos nuevos:</span>
                                <pre className="mt-1 text-gray-600">{JSON.stringify(log.newData, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron registros de auditoría
                </div>
              )}

              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-gray-600">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
                </p>
                
              <div className="flex space-x-2 items-center">
                <span className="text-sm text-gray-600">Página</span>
                <Input
                  className="w-20"
                  type="number"
                  min={1}
                  max={Math.max(1, Math.ceil(pagination.total / pagination.limit))}
                  value={pagination.page}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || '1', 10)
                    const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.limit))
                    setPagination(prev => ({ ...prev, page: Math.min(maxPage, Math.max(1, v)) }))
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                >
                  Anterior
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function mapAction(a: string): 'CREATE' | 'UPDATE' | 'DELETE' | string {
  const x = a.toLowerCase()
  if (x.includes('created')) return 'CREATE'
  if (x.includes('deleted')) return 'DELETE'
  return 'UPDATE'
}

export default AuditLog;
