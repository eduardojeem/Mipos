'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMonitoringConfig } from './useMonitoringConfig';

export interface OrganizationUsageData {
    organizationId: string;
    organizationName: string;
    dbSizeMb: number | null;
    storageSizeMb: number | null;
    recordCounts: {
        products: number;
        customers: number;
        suppliers: number;
        sales: number;
        saleItems: number;
    };
    activity?: {
        queriesPerMinute: number;
        lastActivity: string | null;
    };
}

interface UseOrganizationUsageOptions {
    enabled?: boolean;
    includeActivity?: boolean;
    refetchInterval?: number | false;
}

/**
 * Hook para obtener métricas de uso por organización
 * Usa la nueva API optimizada con datos reales
 */
export function useOrganizationUsage(options: UseOrganizationUsageOptions = {}) {
    const { config } = useMonitoringConfig();
    const { enabled = true, includeActivity = false, refetchInterval } = options;

    const [data, setData] = useState<OrganizationUsageData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cached, setCached] = useState(false);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    const fetchUsage = useCallback(
        async (force: boolean = false) => {
            if (!enabled) return;

            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams();

                if (force) {
                    params.append('force', 'true');
                }

                if (includeActivity) {
                    params.append('activity', 'true');
                }

                const response = await fetch(`/api/superadmin/monitoring/organization-usage?${params}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch organization usage');
                }

                const result = await response.json();

                if (result.success) {
                    setData(result.data || []);
                    setCached(result.cached || false);
                    setLastFetch(new Date());
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (err: any) {
                console.error('[useOrganizationUsage] Error:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        },
        [enabled, includeActivity]
    );

    // Initial fetch
    useEffect(() => {
        if (enabled) {
            fetchUsage();
        }
    }, [enabled]);

    // Auto-refresh
    useEffect(() => {
        if (!enabled) return;

        const interval = refetchInterval !== false
            ? refetchInterval || config.refreshInterval
            : null;

        if (interval && config.autoRefresh) {
            const timer = setInterval(() => {
                fetchUsage();
            }, interval);

            return () => clearInterval(timer);
        }
    }, [config.autoRefresh, config.refreshInterval, refetchInterval, enabled]);

    const refresh = useCallback(() => {
        return fetchUsage(true);
    }, [fetchUsage]);

    /**
     * Convertir a formato compatible con OrganizationUsageTable
     */
    const usageByOrg = data.reduce((acc, org) => {
        acc[org.organizationId] = {
            db_size_mb: org.dbSizeMb,
            storage_size_mb: org.storageSizeMb,
            bandwidth_mb: null, // No disponible aún
            counts: org.recordCounts,
        };
        return acc;
    }, {} as Record<string, any>);

    return {
        data,
        usageByOrg,
        loading,
        error,
        cached,
        lastFetch,
        refresh,
    };
}
