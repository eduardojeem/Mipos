/**
 * IndexedDB Manager para BeautyPOS
 * 
 * Proporciona persistencia offline para productos, ventas y clientes.
 * Incluye soporte para sincronización automática cuando vuelve la conexión.
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

// Esquema de la base de datos
export interface DBSchema {
    products: {
        key: string
        value: Product
        indexes: {
            'by-sku': string
            'by-category': string
            'by-updated': number
        }
    }
    sales: {
        key: string
        value: Sale
        indexes: {
            'by-date': number
            'by-customer': string
            'by-status': string
        }
    }
    customers: {
        key: string
        value: Customer
        indexes: {
            'by-email': string
            'by-phone': string
        }
    }
    sync_queue: {
        key: string
        value: SyncOperation
        indexes: {
            'by-status': string
            'by-timestamp': number
            'by-entity': string
        }
    }
}

// Tipos para sincronización
export interface SyncOperation {
    id: string
    type: 'CREATE' | 'UPDATE' | 'DELETE'
    entity: 'product' | 'sale' | 'customer'
    data: any
    timestamp: number
    status: 'pending' | 'syncing' | 'synced' | 'error'
    retries: number
    maxRetries: number
    error?: string
    localId?: string // ID temporal para operaciones offline
}

// Tipos genéricos
interface Product {
    id: string
    sku: string
    name: string
    category_id: string
    sale_price: number
    cost_price?: number
    stock_quantity: number
    updated_at: string
    [key: string]: any
}

interface Sale {
    id: string
    total: number
    customer_id?: string
    payment_method: string
    status: string
    created_at: string
    [key: string]: any
}

interface Customer {
    id: string
    name: string
    email?: string
    phone?: string
    [key: string]: any
}

/**
 * Gestor de IndexedDB
 */
export class IndexedDBManager {
    private db: IDBDatabase | null = null
    private readonly dbName = 'beautypos-db'
    private readonly version = 1
    private initPromise: Promise<void> | null = null

    /**
     * Inicializa la base de datos
     */
    async init(): Promise<void> {
        // Si ya está inicializando, esperar a que termine
        if (this.initPromise) {
            return this.initPromise
        }

        // Si ya está inicializada, retornar
        if (this.db) {
            return Promise.resolve()
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version)

            request.onerror = () => {
                this.initPromise = null
                reject(new Error('Error al abrir IndexedDB'))
            }

            request.onsuccess = () => {
                this.db = request.result
                this.initPromise = null
                console.log('✅ IndexedDB inicializado correctamente')
                resolve()
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result

                // Store: products
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' })
                    productStore.createIndex('by-sku', 'sku', { unique: true })
                    productStore.createIndex('by-category', 'category_id', { unique: false })
                    productStore.createIndex('by-updated', 'updated_at', { unique: false })
                }

                // Store: sales
                if (!db.objectStoreNames.contains('sales')) {
                    const saleStore = db.createObjectStore('sales', { keyPath: 'id' })
                    saleStore.createIndex('by-date', 'created_at', { unique: false })
                    saleStore.createIndex('by-customer', 'customer_id', { unique: false })
                    saleStore.createIndex('by-status', 'status', { unique: false })
                }

                // Store: customers
                if (!db.objectStoreNames.contains('customers')) {
                    const customerStore = db.createObjectStore('customers', { keyPath: 'id' })
                    customerStore.createIndex('by-email', 'email', { unique: false })
                    customerStore.createIndex('by-phone', 'phone', { unique: false })
                }

                // Store: sync_queue
                if (!db.objectStoreNames.contains('sync_queue')) {
                    const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
                    syncStore.createIndex('by-status', 'status', { unique: false })
                    syncStore.createIndex('by-timestamp', 'timestamp', { unique: false })
                    syncStore.createIndex('by-entity', 'entity', { unique: false })
                }

                console.log('✅ Stores de IndexedDB creados')
            }
        })

        return this.initPromise
    }

    /**
     * Obtiene un registro por ID
     */
    async get<T>(storeName: string, key: string): Promise<T | undefined> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)
            const request = store.get(key)

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Guarda o actualiza un registro
     */
    async put<T>(storeName: string, value: T): Promise<void> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite')
            const store = transaction.objectStore(storeName)
            const request = store.put(value)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Elimina un registro
     */
    async delete(storeName: string, key: string): Promise<void> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite')
            const store = transaction.objectStore(storeName)
            const request = store.delete(key)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Obtiene todos los registros de un store
     */
    async getAll<T>(storeName: string): Promise<T[]> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)
            const request = store.getAll()

            request.onsuccess = () => resolve(request.result || [])
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Consulta registros por índice
     */
    async query<T>(
        storeName: string,
        indexName: string,
        value: any
    ): Promise<T[]> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)
            const index = store.index(indexName)
            const request = index.getAll(value)

            request.onsuccess = () => resolve(request.result || [])
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Consulta con rango
     */
    async queryRange<T>(
        storeName: string,
        indexName: string,
        lowerBound: any,
        upperBound: any
    ): Promise<T[]> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)
            const index = store.index(indexName)
            const range = IDBKeyRange.bound(lowerBound, upperBound)
            const request = index.getAll(range)

            request.onsuccess = () => resolve(request.result || [])
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Limpia todos los registros de un store
     */
    async clear(storeName: string): Promise<void> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite')
            const store = transaction.objectStore(storeName)
            const request = store.clear()

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Cuenta registros en un store
     */
    async count(storeName: string): Promise<number> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)
            const request = store.count()

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * Ejecuta múltiples operaciones en una transacción
     */
    async transaction<T>(
        storeNames: string[],
        mode: IDBTransactionMode,
        callback: (stores: IDBObjectStore[]) => Promise<T>
    ): Promise<T> {
        await this.init()
        if (!this.db) throw new Error('DB no inicializada')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeNames, mode)
            const stores = storeNames.map(name => transaction.objectStore(name))

            transaction.oncomplete = () => {
                // La transacción se completó exitosamente
            }

            transaction.onerror = () => {
                reject(transaction.error)
            }

            callback(stores)
                .then(resolve)
                .catch(reject)
        })
    }

    /**
     * Cierra la conexión a la base de datos
     */
    close(): void {
        if (this.db) {
            this.db.close()
            this.db = null
            console.log('✅ IndexedDB cerrado')
        }
    }

    /**
     * Elimina completamente la base de datos
     */
    static async deleteDatabase(dbName: string = 'beautypos-db'): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName)

            request.onsuccess = () => {
                console.log('✅ Base de datos eliminada')
                resolve()
            }

            request.onerror = () => {
                reject(new Error('Error al eliminar la base de datos'))
            }

            request.onblocked = () => {
                console.warn('⚠️ Eliminación bloqueada - cierre todas las pestañas')
            }
        })
    }
}

// Instancia singleton
export const db = new IndexedDBManager()

// Auto-inicializar en el navegador
if (typeof window !== 'undefined') {
    db.init().catch(console.error)
}
