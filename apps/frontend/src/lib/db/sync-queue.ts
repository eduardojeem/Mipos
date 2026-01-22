/**
 * Cola de Sincronización para BeautyPOS
 * 
 * Gestiona las operaciones pendientes de sincronización cuando el sistema
 * está offline. Cuando vuelve la conexión, sincroniza automáticamente.
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

import { db, type SyncOperation } from './indexed-db'
export type { SyncOperation } from './indexed-db'

/**
 * Gestor de la cola de sincronización
 */
export class SyncQueue {
    private readonly storeName = 'sync_queue'
    private readonly maxRetries = 3

    /**
     * Agrega una operación a la cola de sincronización
     */
    async add(
        operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retries' | 'maxRetries'>
    ): Promise<string> {
        const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const syncOp: SyncOperation = {
            id,
            ...operation,
            timestamp: Date.now(),
            status: 'pending',
            retries: 0,
            maxRetries: this.maxRetries
        }

        await db.put(this.storeName, syncOp)
        console.log(`✅ Operación agregada a cola de sincronización: ${id}`, syncOp)

        return id
    }

    /**
     * Obtiene la siguiente operación pendiente
     */
    async getNext(): Promise<SyncOperation | null> {
        const pending = await db.query<SyncOperation>(
            this.storeName,
            'by-status',
            'pending'
        )

        if (pending.length === 0) {
            return null
        }

        // Ordenar por timestamp (más antiguas primero)
        pending.sort((a, b) => a.timestamp - b.timestamp)

        return pending[0]
    }

    /**
     * Obtiene todas las operaciones pendientes
     */
    async getPending(): Promise<SyncOperation[]> {
        const pending = await db.query<SyncOperation>(
            this.storeName,
            'by-status',
            'pending'
        )

        // Ordenar por timestamp
        return pending.sort((a, b) => a.timestamp - b.timestamp)
    }

    /**
     * Obtiene operaciones por entidad
     */
    async getByEntity(entity: 'product' | 'sale' | 'customer'): Promise<SyncOperation[]> {
        return db.query<SyncOperation>(
            this.storeName,
            'by-entity',
            entity
        )
    }

    /**
     * Marca una operación como sincronizada
     */
    async markSynced(id: string): Promise<void> {
        const operation = await db.get<SyncOperation>(this.storeName, id)

        if (!operation) {
            console.warn(`⚠️ Operación no encontrada: ${id}`)
            return
        }

        operation.status = 'synced'
        await db.put(this.storeName, operation)

        console.log(`✅ Operación sincronizada: ${id}`)
    }

    /**
     * Marca una operación como en proceso de sincronización
     */
    async markSyncing(id: string): Promise<void> {
        const operation = await db.get<SyncOperation>(this.storeName, id)

        if (!operation) {
            console.warn(`⚠️ Operación no encontrada: ${id}`)
            return
        }

        operation.status = 'syncing'
        await db.put(this.storeName, operation)
    }

    /**
     * Marca una operación como error y la reintenta si es posible
     */
    async markError(id: string, error: string): Promise<void> {
        const operation = await db.get<SyncOperation>(this.storeName, id)

        if (!operation) {
            console.warn(`⚠️ Operación no encontrada: ${id}`)
            return
        }

        operation.retries++
        operation.error = error

        if (operation.retries >= operation.maxRetries) {
            operation.status = 'error'
            console.error(`❌ Operación falló después de ${operation.retries} intentos: ${id}`, error)
        } else {
            operation.status = 'pending'
            console.warn(`⚠️ Operación falló (intento ${operation.retries}/${operation.maxRetries}): ${id}`, error)
        }

        await db.put(this.storeName, operation)
    }

    /**
     * Reintenta una operación que falló
     */
    async retry(id: string): Promise<void> {
        const operation = await db.get<SyncOperation>(this.storeName, id)

        if (!operation) {
            console.warn(`⚠️ Operación no encontrada: ${id}`)
            return
        }

        operation.status = 'pending'
        operation.retries = 0
        operation.error = undefined

        await db.put(this.storeName, operation)
        console.log(`🔄 Operación reintentada: ${id}`)
    }

    /**
     * Elimina una operación de la cola
     */
    async remove(id: string): Promise<void> {
        await db.delete(this.storeName, id)
        console.log(`🗑️ Operación eliminada de la cola: ${id}`)
    }

    /**
     * Limpia todas las operaciones sincronizadas
     */
    async clearSynced(): Promise<void> {
        const synced = await db.query<SyncOperation>(
            this.storeName,
            'by-status',
            'synced'
        )

        for (const operation of synced) {
            await this.remove(operation.id)
        }

        console.log(`✅ ${synced.length} operaciones sincronizadas eliminadas`)
    }

    /**
     * Limpia todas las operaciones (útil para testing)
     */
    async clearAll(): Promise<void> {
        await db.clear(this.storeName)
        console.log('✅ Cola de sincronización limpiada')
    }

    /**
     * Obtiene estadísticas de la cola
     */
    async getStats(): Promise<{
        total: number
        pending: number
        syncing: number
        synced: number
        error: number
    }> {
        const all = await db.getAll<SyncOperation>(this.storeName)

        return {
            total: all.length,
            pending: all.filter(op => op.status === 'pending').length,
            syncing: all.filter(op => op.status === 'syncing').length,
            synced: all.filter(op => op.status === 'synced').length,
            error: all.filter(op => op.status === 'error').length
        }
    }

    /**
     * Procesa la cola de sincronización
     */
    async processQueue(
        onSync: (operation: SyncOperation) => Promise<void>,
        onError?: (operation: SyncOperation, error: Error) => void
    ): Promise<{ synced: number; errors: number }> {
        const pending = await this.getPending()
        let synced = 0
        let errors = 0

        console.log(`🔄 Procesando cola de sincronización: ${pending.length} operaciones pendientes`)

        for (const operation of pending) {
            try {
                await this.markSyncing(operation.id)
                await onSync(operation)
                await this.markSynced(operation.id)
                synced++
            } catch (error) {
                errors++
                const errorMessage = error instanceof Error ? error.message : String(error)
                await this.markError(operation.id, errorMessage)

                if (onError) {
                    onError(operation, error instanceof Error ? error : new Error(String(error)))
                }
            }
        }

        console.log(`✅ Sincronización completada: ${synced} exitosas, ${errors} errores`)

        return { synced, errors }
    }

    /**
     * Obtiene operaciones que fallaron
     */
    async getErrors(): Promise<SyncOperation[]> {
        return db.query<SyncOperation>(
            this.storeName,
            'by-status',
            'error'
        )
    }

    /**
     * Reintenta todas las operaciones que fallaron
     */
    async retryAll(): Promise<void> {
        const errors = await this.getErrors()

        for (const operation of errors) {
            await this.retry(operation.id)
        }

        console.log(`🔄 ${errors.length} operaciones reintentadas`)
    }

    /**
     * Exporta la cola para debugging
     */
    async export(): Promise<SyncOperation[]> {
        return db.getAll<SyncOperation>(this.storeName)
    }

    /**
     * Importa operaciones (útil para testing o migración)
     */
    async import(operations: SyncOperation[]): Promise<void> {
        for (const operation of operations) {
            await db.put(this.storeName, operation)
        }

        console.log(`✅ ${operations.length} operaciones importadas`)
    }
}

// Instancia singleton
export const syncQueue = new SyncQueue()

// Helper para crear operaciones de sincronización
export const createSyncOperation = {
    /**
     * Crea una operación de creación
     */
    create(entity: 'product' | 'sale' | 'customer', data: any, localId?: string) {
        return syncQueue.add({
            type: 'CREATE',
            entity,
            data,
            localId
        })
    },

    /**
     * Crea una operación de actualización
     */
    update(entity: 'product' | 'sale' | 'customer', data: any) {
        return syncQueue.add({
            type: 'UPDATE',
            entity,
            data
        })
    },

    /**
     * Crea una operación de eliminación
     */
    delete(entity: 'product' | 'sale' | 'customer', id: string) {
        return syncQueue.add({
            type: 'DELETE',
            entity,
            data: { id }
        })
    }
}
