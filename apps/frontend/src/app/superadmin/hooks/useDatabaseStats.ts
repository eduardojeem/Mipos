'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMonitoringConfig } from './useMonitoringConfig';

interface DatabaseStats {
    totalSize: {
        bytes: number;
        pretty: string;
    };
    performance: {
        cacheHitRatio: number;
        activeConnections: number;
        idleConnections: number;
        transactionsCommitted: number;
        transactionsRolledBack: number;
    };
    largestTables?: Array<{
        tableName: string;
        sizeBytes: number;
        sizePretty: string;
        rowCount: number;
    }>;
    unusedIndexes?: Array<{
        schemaName: string;
        tableName: string;
        indexName: string;
        sizePretty: string;
    }>;
}

interface UseDatabaseStatsOptions {
    enabled?: boolean;
    refetchInterval?: number | false;
}

/**
 * Hook para obtener estadísticas de la base de datos
 */
export function useDatabaseStats(options: UseDatabaseStatsOptions = {}) {
    const { config } = useMonitoringConfig();
    const { enabled = true, refetchInterval } = options;

    const [data, setData] = useState<DatabaseStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cached, setCached] = useState(false);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    /**
     * Fetch database stats
     */
    const fetchStats = useCallback(
        async (force: boolean = false) => {
            if (!enabled) return;

            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    mode: config.mode.toLowerCase(),
                });

                if (force) {
                    params.append('force', 'true');
                }

                const response = await fetch(`/api/superadmin/monitoring/database-stats?${params}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch database stats');
                }

                const result = await response.json();

                if (result.success) {
                    setData(result.data);
                    setCached(result.cached || false);
                    setLastFetch(new Date());
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (err: any) {
                console.error('[useDatabaseStats] Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        },
        [config.mode, enabled]
    );

    // Initial fetch
    useEffect(() => {
        if (enabled) {
            fetchStats();
        }
    }, [enabled]); // Solo en mount o cuando enabled cambia

    // Auto-refresh
    useEffect(() => {
        if (!enabled) return;

        const interval = refetchInterval !== false
            ? refetchInterval || config.refreshInterval
            : null;

        if (interval && config.autoRefresh) {
            const timer = setInterval(() => {
                fetchStats();
            }, interval);

            return () => clearInterval(timer);
        }
    }, [config.autoRefresh, config.refreshInterval, refetchInterval, enabled]);

    /**
     * Force refresh
     */
    const refresh = useCallback(() => {
        return fetchStats(true);
    }, [fetchStats]);

    return {
        data,
        loading,
        error,
        cached,
        lastFetch,
        refresh,
    };
}
