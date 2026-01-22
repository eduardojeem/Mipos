'use client'

import { useState, useEffect, useCallback } from 'react';

export interface AuditLogEntry {
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

export interface AuditStats {
  total: number;
  byAction: { action: string; count: number }[];
  byResource: { resource: string; count: number }[];
  recentActivity: any[];
}

export interface AuditFilters {
  action: string;
  resource: string;
  userId: string;
  userEmail: string;
  startDate: string;
  endDate: string;
  status: string;
  search: string;
  ipAddress: string;
  tags: string[];
}

export interface AuditPagination {
  limit: number;
  page: number;
  total: number;
}

export function useAuditData() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    resource: '',
    userId: '',
    userEmail: '',
    startDate: '',
    endDate: '',
    status: '',
    search: '',
    ipAddress: '',
    tags: []
  });
  
  const [pagination, setPagination] = useState<AuditPagination>({
    limit: 20,
    page: 1,
    total: 0,
  });

  // Función para construir parámetros de consulta
  const buildQueryParams = useCallback((customFilters?: Partial<AuditFilters>, customPagination?: Partial<AuditPagination>) => {
    const currentFilters = { ...filters, ...customFilters };
    const currentPagination = { ...pagination, ...customPagination };
    
    const params = new URLSearchParams();
    
    // Filtros
    if (currentFilters.action) params.append('actionEq', currentFilters.action);
    if (currentFilters.resource) params.append('resourceEq', currentFilters.resource);
    if (currentFilters.userId) params.append('userId', currentFilters.userId);
    if (currentFilters.userEmail) params.append('userEmail', currentFilters.userEmail);
    if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
    if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
    if (currentFilters.status) params.append('status', currentFilters.status);
    if (currentFilters.search) params.append('q', currentFilters.search);
    if (currentFilters.ipAddress) params.append('ipAddress', currentFilters.ipAddress);
    if (currentFilters.tags.length > 0) params.append('tags', currentFilters.tags.join(','));
    
    // Paginación
    params.append('limit', currentPagination.limit.toString());
    params.append('page', currentPagination.page.toString());
    
    return params;
  }, [filters, pagination]);

  // Función para obtener logs
  const fetchLogs = useCallback(async (customFilters?: Partial<AuditFilters>, customPagination?: Partial<AuditPagination>) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = buildQueryParams(customFilters, customPagination);
      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      // Normalizar datos
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
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  // Función para obtener estadísticas
  const fetchStats = useCallback(async (customFilters?: Partial<AuditFilters>) => {
    try {
      const params = new URLSearchParams();
      const currentFilters = { ...filters, ...customFilters };
      
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
      if (currentFilters.action) params.append('actionEq', currentFilters.action);
      if (currentFilters.resource) params.append('resourceEq', currentFilters.resource);

      const response = await fetch(`/api/admin/audit/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
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
  }, [filters]);

  // Función para exportar datos
  const exportData = useCallback(async (options: {
    format: 'csv' | 'pdf' | 'json' | 'xlsx';
    dateRange?: { start: string; end: string };
    fields: string[];
    includeDetails: boolean;
    maxRecords?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      
      // Aplicar filtros actuales
      Object.entries(filters).forEach(([key, value]) => {
        if (value && (Array.isArray(value) ? value.length > 0 : true)) {
          if (key === 'tags') {
            params.append(key, (value as string[]).join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      
      // Aplicar opciones de exportación
      if (options.dateRange) {
        params.set('startDate', options.dateRange.start);
        params.set('endDate', options.dateRange.end);
      }
      
      params.append('format', options.format);
      params.append('fields', options.fields.join(','));
      params.append('includeDetails', options.includeDetails.toString());
      
      if (options.maxRecords) {
        params.append('limit', options.maxRecords.toString());
      } else {
        params.append('limit', '10000'); // Límite por defecto para exportación
      }

      const response = await fetch(`/api/admin/audit/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Manejar diferentes tipos de respuesta según el formato
      if (options.format === 'json') {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `audit-export-${new Date().toISOString().split('T')[0]}.json`);
      } else if (options.format === 'csv') {
        const csvContent = await response.text();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        downloadBlob(blob, `audit-export-${new Date().toISOString().split('T')[0]}.csv`);
      } else if (options.format === 'pdf') {
        const pdfBlob = await response.blob();
        downloadBlob(pdfBlob, `audit-export-${new Date().toISOString().split('T')[0]}.pdf`);
      } else if (options.format === 'xlsx') {
        const xlsxBlob = await response.blob();
        downloadBlob(xlsxBlob, `audit-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }, [filters]);

  // Función auxiliar para descargar blobs
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Función para actualizar filtros
  const updateFilters = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset a la primera página
  }, []);

  // Función para actualizar paginación
  const updatePagination = useCallback((newPagination: Partial<AuditPagination>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  // Efecto para cargar datos cuando cambien los filtros o paginación
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Efecto para cargar estadísticas cuando cambien los filtros relevantes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Función para refrescar todos los datos
  const refreshData = useCallback(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  return {
    // Estado
    logs,
    stats,
    loading,
    error,
    filters,
    pagination,
    
    // Acciones
    setFilters: updateFilters,
    setPagination: updatePagination,
    fetchLogs,
    fetchStats,
    exportData,
    refreshData,
  };
}