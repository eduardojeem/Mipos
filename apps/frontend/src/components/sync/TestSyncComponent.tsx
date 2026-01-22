/**
 * Componente de prueba para sincronización offline
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  useProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useProductBySku 
} from '@/hooks/use-products'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wifi, WifiOff, RefreshCw, Plus, Edit, Trash2 } from 'lucide-react'

export function TestSyncComponent() {
  const isOnline = useOnlineStatus()
  const { 
    isSyncing, 
    pendingCount, 
    syncedCount, 
    errorCount, 
    syncNow,
    getStats 
  } = useOfflineSync()
  
  const { data: products, loading, error, isOffline, source } = useProducts({ limit: 10 })
  const { createProduct } = useCreateProduct()
  const { updateProduct } = useUpdateProduct()
  const { deleteProduct } = useDeleteProduct()
  
  const [testProduct, setTestProduct] = useState<any>(null)
  const [syncStats, setSyncStats] = useState<any>(null)

  // Update sync stats
  useEffect(() => {
    const updateStats = async () => {
      const stats = await getStats()
      setSyncStats(stats)
    }
    updateStats()
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [getStats])

  const handleCreateTestProduct = async () => {
    try {
      const newProduct = {
        name: `Producto de Prueba ${Date.now()}`,
        sku: `TEST-${Date.now()}`,
        description: 'Producto creado para pruebas de sincronización offline',
        cost_price: 50,
        sale_price: 100,
        stock_quantity: 20,
        min_stock: 5,
        category_id: 'test-category',
        is_active: true
      }
      
      const created = await createProduct(newProduct)
      setTestProduct(created)
      console.log('✅ Producto creado:', created)
    } catch (error) {
      console.error('❌ Error al crear producto:', error)
    }
  }

  const handleUpdateTestProduct = async () => {
    if (!testProduct) return
    
    try {
      const updated = await updateProduct(testProduct.id, {
        ...testProduct,
        name: `${testProduct.name} (Actualizado)`,
        sale_price: testProduct.sale_price + 10
      })
      setTestProduct(updated)
      console.log('✅ Producto actualizado:', updated)
    } catch (error) {
      console.error('❌ Error al actualizar producto:', error)
    }
  }

  const handleDeleteTestProduct = async () => {
    if (!testProduct) return
    
    try {
      await deleteProduct(testProduct.id)
      setTestProduct(null)
      console.log('✅ Producto eliminado')
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error)
    }
  }

  const handleManualSync = async () => {
    try {
      await syncNow()
      console.log('✅ Sincronización manual completada')
    } catch (error) {
      console.error('❌ Error en sincronización manual:', error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            Estado de Conexión
          </CardTitle>
          <CardDescription>
            Estado actual del sistema y sincronización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Badge variant="outline">
              Fuente: {source}
            </Badge>
            {isOffline && (
              <Badge variant="secondary">
                Modo Offline Activado
              </Badge>
            )}
          </div>
          
          {syncStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{syncStats.total}</div>
                <div className="text-sm text-gray-500">Total Ops</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{syncStats.pending}</div>
                <div className="text-sm text-gray-500">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncStats.synced}</div>
                <div className="text-sm text-gray-500">Sincronizadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{syncStats.error}</div>
                <div className="text-sm text-gray-500">Errores</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pruebas de Sincronización</CardTitle>
          <CardDescription>
            Crear, actualizar y eliminar productos para probar la sincronización offline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleCreateTestProduct} disabled={isSyncing}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Producto de Prueba
              </Button>
              
              <Button onClick={handleUpdateTestProduct} disabled={!testProduct || isSyncing}>
                <Edit className="h-4 w-4 mr-2" />
                Actualizar Producto
              </Button>
              
              <Button onClick={handleDeleteTestProduct} disabled={!testProduct || isSyncing} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Producto
              </Button>
              
              <Button onClick={handleManualSync} disabled={isSyncing || isOnline} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Ahora
              </Button>
            </div>

            {testProduct && (
              <Alert>
                <AlertDescription>
                  <strong>Producto de prueba actual:</strong><br />
                  ID: {testProduct.id}<br />
                  Nombre: {testProduct.name}<br />
                  SKU: {testProduct.sku}<br />
                  Precio: ${testProduct.sale_price}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos Cargados ({products?.length || 0})</CardTitle>
          <CardDescription>
            Lista de productos obtenidos (desde API o IndexedDB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Cargando productos...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>
                Error al cargar productos: {error.message}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {products?.slice(0, 5).map((product) => (
                <div key={product.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${product.sale_price}</div>
                    <div className="text-sm text-gray-500">Stock: {product.stock_quantity}</div>
                  </div>
                </div>
              ))}
              {products && products.length > 5 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... y {products.length - 5} productos más
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}