'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    MonitoringSettings,
    DEFAULT_MONITORING_CONFIG,
    isMetricEnabled as checkMetricEnabled,
    MetricKey,
    calculateConfigImpact,
    MonitoringImpact,
} from '@/lib/monitoring-config';
import { useToast } from '@/components/ui/use-toast';

const STORAGE_KEY = 'monitoring_config';

/**
 * Hook para gestionar la configuración de monitorización
 * 
 * Sincroniza configuración entre:
 * - API (base de datos)
 * - LocalStorage (fallback y cache)
 * - BroadcastChannel (sincronización entre tabs)
 */
export function useMonitoringConfig() {
    const { toast } = useToast();
    const [config, setConfig] = useState<MonitoringSettings>(DEFAULT_MONITORING_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [impact, setImpact] = useState<MonitoringImpact>('low');

    // Cargar configuración inicial
    useEffect(() => {
        loadConfig();
    }, []);

    // Calcular impacto cuando cambia la config
    useEffect(() => {
        const newImpact = calculateConfigImpact(config);
        setImpact(newImpact);
    }, [config]);

    // Sincronización entre tabs usando BroadcastChannel
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const channel = new BroadcastChannel('monitoring_config');

        channel.onmessage = (event) => {
            if (event.data.type === 'config_updated') {
                setConfig(event.data.config);
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    /**
     * Cargar configuración desde API o localStorage
     */
    const loadConfig = async () => {
        setLoading(true);

        try {
            // Intentar cargar desde localStorage primero (más rápido)
            const cached = loadFromLocalStorage();
            if (cached) {
                setConfig(cached);
            }

            // Luego cargar desde API para sincronizar
            const response = await fetch('/api/superadmin/monitoring/config');

            if (!response.ok) {
                throw new Error('Failed to fetch config');
            }

            const data = await response.json();

            if (data.success && data.config) {
                setConfig(data.config);
                saveToLocalStorage(data.config);
            }
        } catch (error) {
            console.error('[useMonitoringConfig] Error loading config:', error);
            // Si falla, usar config de localStorage o default
            const fallback = loadFromLocalStorage() || DEFAULT_MONITORING_CONFIG;
            setConfig(fallback);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Actualizar configuración
     */
    const updateConfig = useCallback(
        async (newConfig: Partial<MonitoringSettings>): Promise<{ success: boolean; error?: string }> => {
            setSaving(true);

            try {
                const updatedConfig: MonitoringSettings = {
                    ...config,
                    ...newConfig,
                };

                // Guardar en API
                const response = await fetch('/api/superadmin/monitoring/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ config: updatedConfig }),
                });

                if (!response.ok) {
                    throw new Error('Failed to save config');
                }

                const data = await response.json();

                if (data.success) {
                    setConfig(updatedConfig);
                    saveToLocalStorage(updatedConfig);

                    // Notificar a otros tabs
                    if (typeof window !== 'undefined') {
                        const channel = new BroadcastChannel('monitoring_config');
                        channel.postMessage({
                            type: 'config_updated',
                            config: updatedConfig,
                        });
                        channel.close();
                    }

                    toast({
                        title: 'Configuration saved',
                        description: 'Monitoring configuration has been updated successfully.',
                    });

                    return { success: true };
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            } catch (error: any) {
                console.error('[useMonitoringConfig] Error updating config:', error);

                toast({
                    variant: 'destructive',
                    title: 'Error saving configuration',
                    description: error.message || 'Failed to save monitoring configuration.',
                });

                return { success: false, error: error.message };
            } finally {
                setSaving(false);
            }
        },
        [config, toast]
    );

    /**
     * Resetear a configuración por defecto
     */
    const resetToDefault = useCallback(async () => {
        return await updateConfig(DEFAULT_MONITORING_CONFIG);
    }, [updateConfig]);

    /**
     * Verificar si una métrica está habilitada
     */
    const isMetricEnabled = useCallback(
        (metric: MetricKey): boolean => {
            return checkMetricEnabled(metric, config);
        },
        [config]
    );

    /**
     * Guardar en localStorage
     */
    const saveToLocalStorage = (cfg: MonitoringSettings) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
            }
        } catch (error) {
            console.error('[useMonitoringConfig] Error saving to localStorage:', error);
        }
    };

    /**
     * Cargar desde localStorage
     */
    const loadFromLocalStorage = (): MonitoringSettings | null => {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    return JSON.parse(stored);
                }
            }
        } catch (error) {
            console.error('[useMonitoringConfig] Error loading from localStorage:', error);
        }
        return null;
    };

    return {
        config,
        loading,
        saving,
        impact,
        updateConfig,
        resetToDefault,
        isMetricEnabled,
        refresh: loadConfig,
    };
}
