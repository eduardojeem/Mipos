/**
 * Hook para Sincronización Offline
 * 
 * Detecta cambios de conectividad y sincroniza automáticamente
 * las operaciones pendientes cuando vuelve la conexión.
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { syncQueue, type SyncOperation } from '@/lib/db/sync-queue'
import { db } from '@/lib/db/indexed-db'

interface UseOfflineSyncReturn {
    isOnline: boolean
    isSyncing: boolean
    pendingCount: number
    syncedCount: number
    errorCount: number
    lastSyncTime: Date | null
    syncNow: () => Promise<void>
    retryErrors: () => Promise<void>
    clearSynced: () => Promise<void>
    getStats: () => Promise<SyncStats>
}

interface SyncStats {
    total: number
    pending: number
    syncing: number
    synced: number
    error: number
}

/**
 * Hook para gestión de sincronización offline
 */
export function useOfflineSync(): UseOfflineSyncReturn {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )
    const [isSyncing, setIsSyncing] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [syncedCount, setSyncedCount] = useState(0)
    const [errorCount, setErrorCount] = useState(0)
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isMountedRef = useRef(true)

    /**
     * Actualiza los contadores desde la cola
     */
    const updateCounts = useCallback(async () => {
        if (!isMountedRef.current) return

        try {
            const stats = await syncQueue.getStats()
            setPendingCount(stats.pending)
            setSyncedCount(stats.synced)
            setErrorCount(stats.error)
        } catch (error) {
            console.error('Error al actualizar contadores:', error)
        }
    }, [])

    /**
     * Sincroniza una operación individual
     */
    const syncOperation = useCallback(async (operation: SyncOperation): Promise<void> => {
        const { type, entity, data } = operation

        // Construir la URL del endpoint
        const endpoint = `/api/${entity}s` // products, sales, customers

        // Configurar el request según el tipo de operación
        let response: Response

        switch (type) {
            case 'CREATE':
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Sync-Operation': 'true',
                        'X-Local-Id': operation.localId || ''
                    },
                    body: JSON.stringify(data)
                })
                break

            case 'UPDATE':
                response = await fetch(`${endpoint}/${data.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Sync-Operation': 'true'
                    },
                    body: JSON.stringify(data)
                })
                break

            case 'DELETE':
                response = await fetch(`${endpoint}/${data.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Sync-Operation': 'true'
                    }
                })
                break

            default:
                throw new Error(`Tipo de operación no soportado: ${type}`)
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Error desconocido' }))
            throw new Error(error.message || `Error ${response.status}`)
        }

        // Si fue una creación, actualizar el ID local con el ID del servidor
        if (type === 'CREATE' && operation.localId) {
            const result = await response.json()
            const serverId = result.data?.id

            if (serverId) {
                // Actualizar en IndexedDB
                const localData = await db.get(entity + 's', operation.localId)
                if (localData) {
                    await db.delete(entity + 's', operation.localId)
                    await db.put(entity + 's', { ...localData, id: serverId })
                }
            }
        }
    }, [])

    /**
     * Procesa la cola de sincronización
     */
    const syncPendingOperations = useCallback(async (): Promise<void> => {
        if (isSyncing || !isOnline) {
            console.log('⏸️ Sincronización omitida:', { isSyncing, isOnline })
            return
        }

        setIsSyncing(true)

        try {
            console.log('🔄 Iniciando sincronización...')

            const result = await syncQueue.processQueue(
                syncOperation,
                (operation, error) => {
                    console.error(`❌ Error sincronizando operación ${operation.id}:`, error)
                }
            )

            console.log(`✅ Sincronización completada: ${result.synced} exitosas, ${result.errors} errores`)

            setLastSyncTime(new Date())

            // Actualizar contadores
            await updateCounts()

            // Limpiar operaciones sincronizadas después de 5 minutos
            if (result.synced > 0) {
                setTimeout(() => {
                    syncQueue.clearSynced().catch(console.error)
                }, 5 * 60 * 1000)
            }
        } catch (error) {
            console.error('❌ Error en sincronización:', error)
        } finally {
            if (isMountedRef.current) {
                setIsSyncing(false)
            }
        }
    }, [isSyncing, isOnline, syncOperation, updateCounts])

    /**
     * Reintenta operaciones que fallaron
     */
    const retryErrors = useCallback(async (): Promise<void> => {
        try {
            await syncQueue.retryAll()
            await updateCounts()

            // Intentar sincronizar inmediatamente
            if (isOnline) {
                await syncPendingOperations()
            }
        } catch (error) {
            console.error('Error al reintentar operaciones:', error)
        }
    }, [isOnline, syncPendingOperations, updateCounts])

    /**
     * Limpia operaciones sincronizadas
     */
    const clearSynced = useCallback(async (): Promise<void> => {
        try {
            await syncQueue.clearSynced()
            await updateCounts()
        } catch (error) {
            console.error('Error al limpiar sincronizadas:', error)
        }
    }, [updateCounts])

    /**
     * Obtiene estadísticas de la cola
     */
    const getStats = useCallback(async (): Promise<SyncStats> => {
        return syncQueue.getStats()
    }, [])

    // Detectar cambios de conectividad
    useEffect(() => {
        const handleOnline = () => {
            console.log('🟢 Conexión restaurada')
            setIsOnline(true)
        }

        const handleOffline = () => {
            console.log('🔴 Conexión perdida')
            setIsOnline(false)
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleOnline)
            window.addEventListener('offline', handleOffline)

            return () => {
                window.removeEventListener('online', handleOnline)
                window.removeEventListener('offline', handleOffline)
            }
        }
    }, [])

    // Sincronizar cuando vuelva la conexión
    useEffect(() => {
        if (isOnline && pendingCount > 0 && !isSyncing) {
            // Esperar 1 segundo antes de sincronizar para evitar múltiples intentos
            syncTimeoutRef.current = setTimeout(() => {
                syncPendingOperations()
            }, 1000)

            return () => {
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current)
                }
            }
        }
    }, [isOnline, pendingCount, isSyncing, syncPendingOperations])

    // Actualizar contadores periódicamente
    useEffect(() => {
        updateCounts()

        const interval = setInterval(updateCounts, 10000) // Cada 10 segundos

        return () => clearInterval(interval)
    }, [updateCounts])

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            isMountedRef.current = false
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
        }
    }, [])

    return {
        isOnline,
        isSyncing,
        pendingCount,
        syncedCount,
        errorCount,
        lastSyncTime,
        syncNow: syncPendingOperations,
        retryErrors,
        clearSynced,
        getStats
    }
}

/**
 * Hook simplificado para solo detectar conectividad
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleOnline)
            window.addEventListener('offline', handleOffline)

            return () => {
                window.removeEventListener('online', handleOnline)
                window.removeEventListener('offline', handleOffline)
            }
        }
    }, [])

    return isOnline
}
