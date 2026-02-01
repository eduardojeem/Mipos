'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMonitoringConfig } from './useMonitoringConfig';

interface StorageStats {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizePretty: string;
    byBucket: Array<{
        bucketName: string;
        fileCount: number;
        sizeBytes: number;
        sizePretty: string;
    }>;
    largestFiles?: Array<{
        name: string;
        bucketId: string;
        sizeBytes: number;
        sizePretty: string;
        createdAt: string;
    }>;
}

interface UseStorageStatsOptions {
    enabled?: boolean;
    includeDetails?: boolean;
    refetchInterval?: number | false;
}

/**
 * Hook para obtener estadísticas de Storage
 */
export function useStorageStats(options: UseStorageStatsOptions = {}) {
    const { config } = useMonitoringConfig();
    const { enabled = true, includeDetails = false, refetchInterval } = options;

    const [data, setData] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cached, setCached] = useState(false);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    const fetchStats = useCallback(
        async (force: boolean = false) => {
            if (!enabled) return;

            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams();

                if (force) {
                    params.append('force', 'true');
                }

                if (includeDetails) {
                    params.append('details', 'true');
                }

                const response = await fetch(`/api/superadmin/monitoring/storage-stats?${params}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch storage stats');
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
                console.error('[useStorageStats] Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        },
        [enabled, includeDetails]
    );

    // Initial fetch
    useEffect(() => {
        if (enabled) {
            fetchStats();
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
                fetchStats();
            }, interval);

            return () => clearInterval(timer);
        }
    }, [config.autoRefresh, config.refreshInterval, refetchInterval, enabled]);

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
