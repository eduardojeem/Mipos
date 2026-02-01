'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ChevronDown,
    ChevronUp,
    Settings,
    RotateCcw,
    Save,
    Info,
} from 'lucide-react';
import { useMonitoringConfig } from '../../hooks/useMonitoringConfig';
import {
    MONITORING_MODES,
    AVAILABLE_METRICS,
    MonitoringMode,
    MetricKey,
    formatRefreshInterval,
    getImpactBadge,
} from '@/lib/monitoring-config';
import { cn } from '@/lib/utils';

export function MonitoringConfigPanel() {
    const { config, saving, impact, updateConfig, resetToDefault, isMetricEnabled } =
        useMonitoringConfig();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleModeChange = (mode: MonitoringMode) => {
        updateConfig({ mode });
    };

    const handleMetricToggle = (metric: MetricKey, enabled: boolean) => {
        const currentMetrics = config.customMetrics || [];

        if (enabled) {
            // Add metric if not already in custom list
            if (!currentMetrics.includes(metric)) {
                updateConfig({
                    customMetrics: [...currentMetrics, metric],
                });
            }
        } else {
            // Remove metric
            updateConfig({
                customMetrics: currentMetrics.filter(m => m !== metric),
            });
        }
    };

    const handleAutoRefreshToggle = (enabled: boolean) => {
        updateConfig({ autoRefresh: enabled });
    };

    const handleIntervalChange = (value: number[]) => {
        updateConfig({ refreshInterval: value[0] });
    };

    const impactBadge = getImpactBadge(impact);

    return (
        <Card className="border-slate-200 dark:border-slate-800">
            {/* Collapsed Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            Monitoring Configuration
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Current mode: {MONITORING_MODES[config.mode].name}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        variant={impactBadge.variant}
                        className={cn('text-xs', impactBadge.color)}
                    >
                        {impactBadge.label}
                    </Badge>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-6">
                    {/* Mode Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Monitoring Mode</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {Object.entries(MONITORING_MODES).map(([key, mode]) => (
                                <Card
                                    key={key}
                                    className={cn(
                                        'cursor-pointer transition-all hover:shadow-md',
                                        config.mode === key
                                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                                            : 'border-slate-200 dark:border-slate-800'
                                    )}
                                    onClick={() => handleModeChange(key as MonitoringMode)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={config.mode === key}
                                                    onChange={() => handleModeChange(key as MonitoringMode)}
                                                    className="text-blue-600"
                                                />
                                                <span className="font-semibold text-sm">{mode.name}</span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-xs',
                                                    mode.impact === 'low' && 'text-green-600 border-green-600',
                                                    mode.impact === 'medium' && 'text-yellow-600 border-yellow-600',
                                                    mode.impact === 'high' && 'text-red-600 border-red-600'
                                                )}
                                            >
                                                {mode.impact === 'low' && '⚡ Low Impact'}
                                                {mode.impact === 'medium' && '⚠️ Medium Impact'}
                                                {mode.impact === 'high' && '🔥 High Impact'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {mode.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Custom Metrics */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Custom Metrics</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(AVAILABLE_METRICS).map(([key, metric]) => (
                                <div key={key} className="flex items-start space-x-3 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                                    <Checkbox
                                        id={`metric-${key}`}
                                        checked={isMetricEnabled(key as MetricKey)}
                                        disabled={metric.alwaysEnabled || config.mode === 'FULL'}
                                        onCheckedChange={(checked) =>
                                            handleMetricToggle(key as MetricKey, checked as boolean)
                                        }
                                    />
                                    <div className="flex-1">
                                        <Label
                                            htmlFor={`metric-${key}`}
                                            className="text-sm font-medium cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                {metric.name}
                                                {metric.alwaysEnabled && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Always On
                                                    </Badge>
                                                )}
                                            </div>
                                        </Label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {metric.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Auto-Refresh Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="auto-refresh" className="text-sm font-medium">
                                    Auto-refresh
                                </Label>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Automatically update metrics at regular intervals
                                </p>
                            </div>
                            <Switch
                                id="auto-refresh"
                                checked={config.autoRefresh}
                                onCheckedChange={handleAutoRefreshToggle}
                            />
                        </div>

                        {config.autoRefresh && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Refresh Interval</Label>
                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                        {formatRefreshInterval(config.refreshInterval)}
                                    </span>
                                </div>
                                <Slider
                                    value={[config.refreshInterval]}
                                    onValueChange={handleIntervalChange}
                                    min={30000}
                                    max={600000}
                                    step={30000}
                                    className="w-full"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Lower intervals provide more real-time data but increase resource usage
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Alert */}
                    {impact === 'high' && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                            <Info className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                    High Resource Usage
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                    Your current configuration may impact database performance. Consider using
                                    Light or Standard mode for production environments.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetToDefault()}
                            disabled={saving}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset to Default
                        </Button>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-xs', impactBadge.color)}>
                                {impactBadge.label}
                            </Badge>
                            {saving && (
                                <Badge variant="secondary" className="text-xs">
                                    <Save className="h-3 w-3 mr-1 animate-pulse" />
                                    Saving...
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
