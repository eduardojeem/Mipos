'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, HardDrive, Activity, Users, Gauge, Zap } from 'lucide-react';
import { useDatabaseStats } from '../../hooks/useDatabaseStats';
import { useStorageStats } from '../../hooks/useStorageStats';
import { useOrganizations } from '../../hooks/useOrganizations';
import { cn } from '@/lib/utils';

export function MonitoringStats() {
    const { data: dbStats, loading: dbLoading } = useDatabaseStats();
    const { data: storageStats, loading: storageLoading } = useStorageStats();
    const { organizations } = useOrganizations({ pageSize: 1000 });

    const activeOrgs = organizations.filter((org: any) => org.subscription_status === 'ACTIVE').length;

    const stats = [
        {
            title: 'Database Size',
            value: dbStats?.totalSize.pretty || '...',
            description: 'Total database size',
            icon: Database,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-950/30',
            loading: dbLoading,
        },
        {
            title: 'Cache Hit Ratio',
            value: dbStats
                ? `${dbStats.performance.cacheHitRatio.toFixed(1)}%`
                : '...',
            description: 'Database cache efficiency',
            icon: Gauge,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-100 dark:bg-green-950/30',
            loading: dbLoading,
        },
        {
            title: 'Active Connections',
            value: dbStats
                ? dbStats.performance.activeConnections.toString()
                : '...',
            description: 'Current database connections',
            icon: Activity,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-100 dark:bg-purple-950/30',
            loading: dbLoading,
        },
        {
            title: 'Storage Usage',
            value: storageStats?.totalSizePretty || '...',
            description: `${storageStats?.totalFiles || 0} files stored`,
            icon: HardDrive,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-100 dark:bg-orange-950/30',
            loading: storageLoading,
        },
        {
            title: 'Active Organizations',
            value: `${activeOrgs} / ${organizations.length}`,
            description: 'Organizations with active subscription',
            icon: Users,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-950/30',
            loading: false,
        },
        {
            title: 'Transactions',
            value: dbStats
                ? dbStats.performance.transactionsCommitted.toLocaleString()
                : '...',
            description: 'Total committed transactions',
            icon: Zap,
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-100 dark:bg-yellow-950/30',
            loading: dbLoading,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
                <Card
                    key={index}
                    className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow"
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {stat.title}
                            </CardTitle>
                            <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                                <stat.icon className={cn('h-4 w-4', stat.color)} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            'text-2xl font-bold text-slate-900 dark:text-slate-100',
                            stat.loading && 'animate-pulse'
                        )}>
                            {stat.value}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {stat.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
