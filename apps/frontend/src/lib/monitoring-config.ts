/**
 * Monitoring Configuration
 * 
 * Configuración centralizada para el sistema de monitorización de Supabase.
 * Define modos de monitorización, métricas disponibles y configuraciones por defecto.
 */

/**
 * Todas las métricas disponibles en el sistema
 */
export const AVAILABLE_METRICS = {
    // Siempre activas (muy ligeras)
    database_size: {
        name: 'Database Size',
        description: 'Total database size across all organizations',
        cost: 'low' as const,
        alwaysEnabled: true,
    },

    // Configurables - Bajo costo
    storage_basic: {
        name: 'Storage Usage',
        description: 'File storage metrics from Supabase Storage',
        cost: 'low' as const,
        alwaysEnabled: false,
    },
    org_counts: {
        name: 'Organization Counts',
        description: 'Record counts per organization',
        cost: 'low' as const,
        alwaysEnabled: false,
    },

    // Configurables - Costo medio
    connections: {
        name: 'Active Connections',
        description: 'Current database connections and their states',
        cost: 'medium' as const,
        alwaysEnabled: false,
    },
    cache_hit_ratio: {
        name: 'Cache Hit Ratio',
        description: 'Database cache efficiency percentage',
        cost: 'medium' as const,
        alwaysEnabled: false,
    },
    top_tables: {
        name: 'Largest Tables',
        description: 'Tables sorted by size',
        cost: 'medium' as const,
        alwaysEnabled: false,
    },

    // Configurables - Alto costo
    slow_queries: {
        name: 'Slow Queries',
        description: 'Queries with high execution time (requires pg_stat_statements)',
        cost: 'high' as const,
        alwaysEnabled: false,
    },
    index_analysis: {
        name: 'Index Usage Analysis',
        description: 'Unused and inefficient indexes',
        cost: 'high' as const,
        alwaysEnabled: false,
    },
    performance_charts: {
        name: 'Performance Charts',
        description: 'Historical performance data and trends',
        cost: 'high' as const,
        alwaysEnabled: false,
    },
} as const;

export type MetricKey = keyof typeof AVAILABLE_METRICS;
export type EnabledMetrics = MetricKey[] | ['all'];

export const MONITORING_MODES = {
    LIGHT: {
        name: 'Light Mode',
        description: 'Basic resource monitoring for minimal impact. Focuses on core system health.',
        enabledMetrics: ['database_size', 'storage_basic', 'org_counts'] as MetricKey[],
        refreshInterval: 300000, // 5 min
        cacheTime: 300000, // 5 min
        enableRealtime: false,
        impact: 'low' as const,
    },
    STANDARD: {
        name: 'Standard Mode',
        description: 'Balanced monitoring with performance metrics. Suitable for most deployments.',
        enabledMetrics: [
            'database_size',
            'storage_basic',
            'org_counts',
            'connections',
            'top_tables',
            'cache_hit_ratio',
        ] as MetricKey[],
        refreshInterval: 120000, // 2 min
        cacheTime: 300000, // 5 min
        enableRealtime: false,
        impact: 'medium' as const,
    },
    FULL: {
        name: 'Full Mode',
        description: 'Deep dive monitoring with detailed analytics. Higher resource utilization.',
        enabledMetrics: ['all'] as const,
        refreshInterval: 30000, // 30 sec
        cacheTime: 60000, // 1 min
        enableRealtime: true,
        impact: 'high' as const,
    },
} as const;

export type MonitoringMode = keyof typeof MONITORING_MODES;
export type MonitoringImpact = 'low' | 'medium' | 'high';

/**
 * Configuración de monitorización
 */
export interface MonitoringSettings {
    mode: MonitoringMode;
    customMetrics?: MetricKey[];
    autoRefresh: boolean;
    refreshInterval: number; // milliseconds
}

/**
 * Configuración por defecto (LIGHT mode)
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringSettings = {
    mode: 'LIGHT',
    customMetrics: [],
    autoRefresh: false,
    refreshInterval: 300000, // 5 min
};

/**
 * Verifica si una métrica está habilitada basándose en la configuración actual
 */
export function isMetricEnabled(
    metric: MetricKey,
    config: MonitoringSettings
): boolean {
    // Métricas que siempre están activas
    if (AVAILABLE_METRICS[metric].alwaysEnabled) {
        return true;
    }

    // En modo FULL, todas las métricas están habilitadas
    if (config.mode === 'FULL') {
        return true;
    }

    // Verificar si está en las métricas del modo seleccionado
    const modeConfig = MONITORING_MODES[config.mode];
    const enabledMetrics = modeConfig.enabledMetrics as readonly (MetricKey | 'all')[];

    if (enabledMetrics.includes('all' as MetricKey)) {
        return true;
    }

    if (enabledMetrics.includes(metric)) {
        return true;
    }

    // Verificar si está en las métricas personalizadas
    if (config.customMetrics && config.customMetrics.includes(metric)) {
        return true;
    }

    return false;
}

/**
 * Calcula el impacto estimado de una configuración
 */
export function calculateConfigImpact(config: MonitoringSettings): MonitoringImpact {
    // Modo FULL siempre es high impact
    if (config.mode === 'FULL') {
        return 'high';
    }

    // Contar métricas habilitadas por costo
    let highCostCount = 0;
    let mediumCostCount = 0;

    const allMetrics = Object.keys(AVAILABLE_METRICS) as MetricKey[];

    allMetrics.forEach(metric => {
        if (isMetricEnabled(metric, config)) {
            const cost = AVAILABLE_METRICS[metric].cost;
            if (cost === 'high') highCostCount++;
            else if (cost === 'medium') mediumCostCount++;
        }
    });

    // Si hay alguna métrica de alto costo, el impacto es alto
    if (highCostCount > 0) {
        return 'high';
    }

    // Si hay más de 3 métricas de costo medio, el impacto es medio
    if (mediumCostCount > 3) {
        return 'medium';
    }

    // Si el intervalo de refresh es muy bajo, aumentar impacto
    if (config.autoRefresh && config.refreshInterval < 60000) {
        return 'high';
    }

    return config.mode === 'STANDARD' ? 'medium' : 'low';
}

/**
 * Obtiene el badge de impacto para mostrar en la UI
 */
export function getImpactBadge(impact: MonitoringImpact): {
    label: string;
    color: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
    switch (impact) {
        case 'low':
            return {
                label: 'Low Impact',
                color: 'text-green-600',
                variant: 'outline',
            };
        case 'medium':
            return {
                label: 'Medium Impact',
                color: 'text-yellow-600',
                variant: 'outline',
            };
        case 'high':
            return {
                label: 'High Impact',
                color: 'text-red-600',
                variant: 'destructive',
            };
    }
}

/**
 * Formatea el intervalo de refresh para mostrar en UI
 */
export function formatRefreshInterval(ms: number): string {
    if (ms < 60000) {
        return `Every ${ms / 1000} seconds`;
    } else if (ms < 3600000) {
        return `Every ${ms / 60000} minutes`;
    } else {
        return `Every ${ms / 3600000} hours`;
    }
}
