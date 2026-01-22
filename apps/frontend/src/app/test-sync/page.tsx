/**
 * Página de prueba para sincronización offline
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

import { TestSyncComponent } from '@/components/sync/TestSyncComponent'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pruebas de Sincronización Offline - BeautyPOS',
  description: 'Pruebas de sincronización offline para el sistema POS',
}

export default function TestSyncPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          🔄 Pruebas de Sincronización Offline
        </h1>
        <p className="text-muted-foreground">
          Esta página permite probar la funcionalidad de sincronización offline del sistema.
          Puedes crear, actualizar y eliminar productos tanto en modo online como offline.
        </p>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Instrucciones de Prueba:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Verifica el estado de conexión en la parte superior</li>
          <li>Crea un producto de prueba (funciona en ambos modos)</li>
          <li>Actualiza el producto creado</li>
          <li>Desconecta el internet (modo avión o desactiva WiFi)</li>
          <li>Intenta crear, actualizar o eliminar productos</li>
          <li>Reconecta el internet</li>
          <li>Observa cómo se sincronizan las operaciones pendientes</li>
          <li>Verifica las estadísticas de sincronización</li>
        </ol>
      </div>

      <TestSyncComponent />

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">🔍 Qué estás viendo:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li><strong>Estado de Conexión:</strong> Indica si estás online o offline</li>
          <li><strong>Fuente de Datos:</strong> Muestra si los productos vienen de la API o IndexedDB</li>
          <li><strong>Estadísticas de Sincronización:</strong> Total, pendientes, sincronizadas y errores</li>
          <li><strong>Productos Cargados:</strong> Lista de productos desde la fuente actual</li>
          <li><strong>Botones de Acción:</strong> Permiten crear, actualizar, eliminar y sincronizar</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Notas Importantes:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
          <li>Los productos creados offline tendrán IDs locales (prefijo "local-")</li>
          <li>Las operaciones offline se sincronizan automáticamente al volver online</li>
          <li>La sincronización manual solo está disponible en modo offline</li>
          <li>Los conflictos se resuelven con estrategia "Last Write Wins"</li>
          <li>Las estadísticas se actualizan cada 5 segundos</li>
        </ul>
      </div>
    </div>
  )
}