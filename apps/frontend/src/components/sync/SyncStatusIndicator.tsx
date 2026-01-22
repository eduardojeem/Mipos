/**
 * Indicador de Estado de Sincronización
 * 
 * Muestra el estado de conectividad y sincronización offline.
 * Incluye contador de operaciones pendientes y botón para sincronizar manualmente.
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

'use client'

import React from 'react'
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useOfflineSync } from '@/hooks/use-offline-sync'

interface SyncStatusIndicatorProps {
    className?: string
    showDetails?: boolean
    size?: 'sm' | 'md' | 'lg'
}

/**
 * Indicador de estado de sincronización
 */
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

    // Tamaños de iconos
    const iconSize = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    }[size]

    // Tamaños de texto
    const textSize = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    }[size]

    // Determinar estado y mensaje
    const getStatus = () => {
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
                description: `${errorCount} operación${errorCount !== 1 ? 'es' : ''} con error. Click para reintentar.`,
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
    }

    const status = getStatus()
    const Icon = status.icon

    // Manejar click
    const handleClick = () => {
        if (errorCount > 0) {
            retryErrors()
        } else if (pendingCount > 0 && isOnline && !isSyncing) {
            syncNow()
        }
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200',
                            status.bgColor,
                            (status.clickable || (pendingCount > 0 && isOnline)) && 'cursor-pointer hover:opacity-80',
                            className
                        )}
                        onClick={handleClick}
                    >
                        {/* Icono de estado */}
                        <Icon
                            className={cn(
                                iconSize,
                                status.color,
                                status.animate && 'animate-spin'
                            )}
                        />

                        {/* Texto (solo en tamaños md y lg) */}
                        {showDetails && size !== 'sm' && (
                            <span className={cn('font-medium', status.color, textSize)}>
                                {status.label}
                            </span>
                        )}

                        {/* Badge de operaciones pendientes */}
                        {pendingCount > 0 && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'h-5 min-w-[20px] px-1.5 flex items-center justify-center',
                                    textSize
                                )}
                            >
                                {pendingCount > 99 ? '99+' : pendingCount}
                            </Badge>
                        )}

                        {/* Badge de errores */}
                        {errorCount > 0 && (
                            <Badge
                                variant="destructive"
                                className={cn(
                                    'h-5 min-w-[20px] px-1.5 flex items-center justify-center',
                                    textSize
                                )}
                            >
                                {errorCount}
                            </Badge>
                        )}

                        {/* Icono de sincronizado (cuando todo está OK) */}
                        {isOnline && pendingCount === 0 && errorCount === 0 && syncedCount > 0 && (
                            <CheckCircle2 className={cn(iconSize, 'text-green-600 dark:text-green-400')} />
                        )}
                    </div>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2">
                        <p className="font-semibold">{status.label}</p>
                        <p className="text-xs text-muted-foreground">{status.description}</p>

                        {/* Estadísticas detalladas */}
                        {showDetails && (pendingCount > 0 || syncedCount > 0 || errorCount > 0) && (
                            <div className="pt-2 border-t space-y-1 text-xs">
                                {pendingCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Pendientes:</span>
                                        <span className="font-medium">{pendingCount}</span>
                                    </div>
                                )}
                                {syncedCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sincronizadas:</span>
                                        <span className="font-medium text-green-600">{syncedCount}</span>
                                    </div>
                                )}
                                {errorCount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Errores:</span>
                                        <span className="font-medium text-red-600">{errorCount}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botón de acción */}
                        {(errorCount > 0 || (pendingCount > 0 && isOnline && !isSyncing)) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-2"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleClick()
                                }}
                            >
                                {errorCount > 0 ? 'Reintentar' : 'Sincronizar ahora'}
                            </Button>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

/**
 * Versión compacta del indicador (solo icono)
 */
export function SyncStatusIcon({ className }: { className?: string }) {
    return (
        <SyncStatusIndicator
            className={className}
            showDetails={false}
            size="sm"
        />
    )
}

/**
 * Versión con detalles expandidos
 */
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
        <div className={cn('space-y-3 p-4 rounded-lg border bg-card', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Estado de Sincronización</h3>
                <SyncStatusIndicator size="sm" showDetails={false} />
            </div>

            {/* Estadísticas */}
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

            {/* Última sincronización */}
            {lastSyncTime && (
                <p className="text-xs text-muted-foreground text-center">
                    Última sincronización: {lastSyncTime.toLocaleString()}
                </p>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
                {errorCount > 0 && (
                    <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={retryErrors}
                    >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Reintentar errores
                    </Button>
                )}
                {pendingCount > 0 && isOnline && !isSyncing && (
                    <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={syncNow}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar ahora
                    </Button>
                )}
            </div>

            {/* Estado offline */}
            {!isOnline && (
                <div className="flex items-center gap-2 p-2 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                    <WifiOff className="w-4 h-4" />
                    <p className="text-xs">
                        Sin conexión. Los cambios se sincronizarán automáticamente cuando vuelva la conexión.
                    </p>
                </div>
            )}
        </div>
    )
}
