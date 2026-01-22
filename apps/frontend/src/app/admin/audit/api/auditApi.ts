// API client para el sistema de auditoría

export interface AuditApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

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
  byUser: { userEmail: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentActivity: any[];
  timeDistribution: { hour: number; count: number }[];
}

export interface AuditFilters {
  action?: string;
  resource?: string;
  userId?: string;
  userEmail?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  ipAddress?: string;
  tags?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json' | 'xlsx';
  dateRange?: {
    start: string;
    end: string;
  };
  fields: string[];
  filters?: AuditFilters;
  includeDetails: boolean;
  maxRecords?: number;
}

class AuditApi {
  private baseUrl = '/api/admin/audit';

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<AuditApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private buildQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            searchParams.append(key, value.join(','));
          }
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }

  // Obtener logs de auditoría
  async getLogs(
    filters: AuditFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<AuditApiResponse<AuditLogEntry[]>> {
    const params = this.buildQueryParams({
      ...filters,
      ...pagination,
      actionEq: filters.action,
      resourceEq: filters.resource,
      q: filters.search,
    });

    return this.request<AuditLogEntry[]>(`?${params}`);
  }

  // Obtener estadísticas
  async getStats(filters: AuditFilters = {}): Promise<AuditApiResponse<AuditStats>> {
    const params = this.buildQueryParams(filters);
    return this.request<AuditStats>(`/stats?${params}`);
  }

  // Obtener sugerencias para autocompletado
  async getSuggestions(query: string): Promise<AuditApiResponse<{
    actions: Array<{ value: string; label: string; count: number }>;
    resources: Array<{ value: string; label: string; count: number }>;
    users: Array<{ value: string; label: string; count: number }>;
  }>> {
    const params = this.buildQueryParams({ q: query });
    return this.request(`/suggestions?${params}`);
  }

  // Obtener metadatos (acciones, recursos, usuarios disponibles)
  async getMeta(type: 'actions' | 'resources' | 'users'): Promise<AuditApiResponse<{
    items: string[];
    counts: Record<string, number>;
  }>> {
    return this.request(`/meta?type=${type}`);
  }

  // Exportar datos
  async exportData(options: ExportOptions): Promise<Blob> {
    const params = this.buildQueryParams({
      format: options.format,
      fields: options.fields.join(','),
      includeDetails: options.includeDetails,
      maxRecords: options.maxRecords,
      ...options.filters,
      ...(options.dateRange && {
        startDate: options.dateRange.start,
        endDate: options.dateRange.end,
      }),
    });

    const response = await fetch(`${this.baseUrl}/export?${params}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Obtener detalles de un log específico
  async getLogDetails(logId: string): Promise<AuditApiResponse<AuditLogEntry>> {
    return this.request<AuditLogEntry>(`/${logId}`);
  }

  // Marcar logs como revisados
  async markAsReviewed(logIds: string[]): Promise<AuditApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/mark-reviewed', {
      method: 'POST',
      body: JSON.stringify({ logIds }),
    });
  }

  // Agregar etiquetas a logs
  async addTags(logIds: string[], tags: string[]): Promise<AuditApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/add-tags', {
      method: 'POST',
      body: JSON.stringify({ logIds, tags }),
    });
  }

  // Obtener alertas de seguridad
  async getSecurityAlerts(): Promise<AuditApiResponse<Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    count: number;
    timestamp: string;
    details: any;
  }>>> {
    return this.request('/alerts');
  }

  // Configurar reglas de alertas
  async updateAlertRules(rules: Array<{
    id: string;
    name: string;
    type: string;
    threshold: number;
    timeWindow: number;
    enabled: boolean;
    severity: string;
  }>): Promise<AuditApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/alert-rules', {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    });
  }

  // Obtener métricas en tiempo real
  async getRealTimeMetrics(): Promise<AuditApiResponse<{
    activeUsers: number;
    eventsPerMinute: number;
    errorRate: number;
    topActions: Array<{ action: string; count: number }>;
    recentErrors: Array<AuditLogEntry>;
  }>> {
    return this.request('/realtime');
  }

  // Generar reporte personalizado
  async generateReport(config: {
    title: string;
    description: string;
    filters: AuditFilters;
    dateRange: { start: string; end: string };
    includeCharts: boolean;
    includeDetails: boolean;
    format: 'pdf' | 'html';
  }): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Report generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Verificar salud del sistema de auditoría
  async getSystemHealth(): Promise<AuditApiResponse<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
      details?: any;
    }>;
    performance: {
      avgResponseTime: number;
      errorRate: number;
      throughput: number;
    };
  }>> {
    return this.request('/health');
  }
}

// Instancia singleton del cliente API
export const auditApi = new AuditApi();

// Hooks de React para usar con la API
export const useAuditApi = () => {
  return auditApi;
};

// Utilidades para formateo y validación
export const auditUtils = {
  formatActionLabel: (action: string): string => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  },

  getActionColor: (action: string): string => {
    if (action.startsWith('CREATE')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (action.startsWith('UPDATE')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (action.startsWith('VIEW')) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  },

  getStatusColor: (status: string): string => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600';
      case 'FAILURE': return 'text-red-600';
      case 'PENDING': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  },

  validateFilters: (filters: AuditFilters): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (start > end) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
      
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.push('El rango de fechas no puede ser mayor a 365 días');
      }
    }

    if (filters.search && filters.search.length < 2) {
      errors.push('La búsqueda debe tener al menos 2 caracteres');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  downloadBlob: (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};