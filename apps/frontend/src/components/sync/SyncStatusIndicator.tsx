'use client'

import React from 'react'
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useOfflineSync } from '@/hooks/use-offline-sync'

interface SyncStatusIndicatorProps {
    className?: string
    showDetails?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export function SyncStatusIndicator({
    className,
    showDetails = true,
    size = 'md'
}: SyncStatusIndicatorProps) {
    const {
        isOnline,
        isSyncing,
        pendingCount,
        syncedCount,
        errorCount,
        lastSyncTime,
        syncNow,
        retryErrors
    } = useOfflineSync()

    const iconSize = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    }[size]

    const textSize = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    }[size]

    const status = (() => {
        if (!isOnline) {
            return {
                icon: WifiOff,
                color: 'text-orange-600 dark:text-orange-400',
                bgColor: 'bg-orange-50 dark:bg-orange-900/20',
                label: 'Sin conexión',
                description: 'Trabajando offline. Los cambios se sincronizarán cuando vuelva la conexión.'
            }
        }

        if (isSyncing) {
            return {
                icon: RefreshCw,
                color: 'text-blue-600 dark:text-blue-400',
                bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                label: 'Sincronizando',
                description: `Sincronizando ${pendingCount} operación${pendingCount !== 1 ? 'es' : ''}...`,
                animate: true
            }
        }

        if (errorCount > 0) {
            return {
                icon: AlertCircle,
                color: 'text-red-600 dark:text-red-400',
                bgColor: 'bg-red-50 dark:bg-red-900/20',
                label: 'Error',
                description: `${errorCount} operación${errorCount !== 1 ? 'es' : ''} con error. Haz clic para reintentar.`,
                clickable: true
            }
        }

        if (pendingCount > 0) {
            return {
                icon: Clock,
                color: 'text-yellow-600 dark:text-yellow-400',
                bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                label: 'Pendiente',
                description: `${pendingCount} operación${pendingCount !== 1 ? 'es' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de sincronización.`
            }
        }

        return {
            icon: Wifi,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            label: 'En línea',
            description: lastSyncTime
                ? `Última sincronización: ${lastSyncTime.toLocaleTimeString()}`
                : 'Todo sincronizado'
        }
    })()

    const Icon = status.icon

    const handleClick = () => {
        if (errorCount > 0) {
            void retryErrors()
        } else if (pendingCount > 0 && isOnline && !isSyncing) {
            void syncNow()
        }
    }

    return (
        <button
            type="button"
            className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-200',
                status.bgColor,
                (status.clickable || (pendingCount > 0 && isOnline)) && 'cursor-pointer hover:opacity-80',
                className
            )}
            onClick={handleClick}
            title={status.description}
            aria-label={`${status.label}. ${status.description}`}
        >
            <Icon
                className={cn(
                    iconSize,
                    status.color,
                    status.animate && 'animate-spin'
                )}
            />

            {showDetails && size !== 'sm' && (
                <span className={cn('font-medium', status.color, textSize)}>
                    {status.label}
                </span>
            )}

            {pendingCount > 0 && (
                <Badge
                    variant="secondary"
                    className={cn('flex h-5 min-w-[20px] items-center justify-center px-1.5', textSize)}
                >
                    {pendingCount > 99 ? '99+' : pendingCount}
                </Badge>
            )}

            {errorCount > 0 && (
                <Badge
                    variant="destructive"
                    className={cn('flex h-5 min-w-[20px] items-center justify-center px-1.5', textSize)}
                >
                    {errorCount}
                </Badge>
            )}

            {isOnline && pendingCount === 0 && errorCount === 0 && syncedCount > 0 && (
                <CheckCircle2 className={cn(iconSize, 'text-green-600 dark:text-green-400')} />
            )}
        </button>
    )
}

export function SyncStatusIcon({ className }: { className?: string }) {
    return <SyncStatusIndicator className={className} showDetails={false} size="sm" />
}

export function SyncStatusDetailed({ className }: { className?: string }) {
    const {
        isOnline,
        isSyncing,
        pendingCount,
        syncedCount,
        errorCount,
        lastSyncTime,
        syncNow,
        retryErrors
    } = useOfflineSync()

    return (
        <div className={cn('space-y-3 rounded-lg border bg-card p-4', className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Estado de Sincronización</h3>
                <SyncStatusIndicator size="sm" showDetails={false} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                    <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600">{syncedCount}</p>
                    <p className="text-xs text-muted-foreground">Sincronizadas</p>
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                    <p className="text-xs text-muted-foreground">Errores</p>
                </div>
            </div>

            {lastSyncTime && (
                <p className="text-center text-xs text-muted-foreground">
                    Última sincronización: {lastSyncTime.toLocaleString()}
                </p>
            )}

            <div className="flex gap-2">
                {errorCount > 0 && (
                    <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => void retryErrors()}
                    >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Reintentar errores
                    </Button>
                )}
                {pendingCount > 0 && isOnline && !isSyncing && (
                    <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => void syncNow()}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sincronizar ahora
                    </Button>
                )}
            </div>

            {!isOnline && (
                <div className="flex items-center gap-2 rounded bg-orange-50 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                    <WifiOff className="h-4 w-4" />
                    <p className="text-xs">
                        Sin conexión. Los cambios se sincronizarán automáticamente cuando vuelva la conexión.
                    </p>
                </div>
            )}
        </div>
    )
}
