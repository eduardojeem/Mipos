'use client';
import React, { useState } from 'react';
import { useInventorySync } from '../hooks/use-sync';

export function InventorySyncDemo() {
  const { inventory, syncState, isLoading, actions } = useInventorySync();
  const [newSku, setNewSku] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [deltaSku, setDeltaSku] = useState('');
  const [deltaAmount, setDeltaAmount] = useState(0);

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSku.trim()) {
      actions.updateStock(newSku.trim(), newQuantity);
      setNewSku('');
      setNewQuantity(0);
    }
  };

  const handleDeltaStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (deltaSku.trim()) {
      actions.incrementStock(deltaSku.trim(), deltaAmount);
      setDeltaSku('');
      setDeltaAmount(0);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📦 Sincronización de Inventario</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className={`px-2 py-1 rounded ${syncState.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {syncState.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          <span>Versión: {syncState.version}</span>
          <span>Última sinc.: {syncState.lastSync ? new Date(syncState.lastSync).toLocaleTimeString() : 'Nunca'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de actualización de stock */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Actualizar Stock</h3>
          <form onSubmit={handleUpdateStock} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: SKU-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Actualizar Stock
            </button>
          </form>
        </div>

        {/* Formulario de delta de stock */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Modificar Stock (Delta)</h3>
          <form onSubmit={handleDeltaStock} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={deltaSku}
                onChange={(e) => setDeltaSku(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ej: SKU-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delta (+/-)</label>
              <input
                type="number"
                value={deltaAmount}
                onChange={(e) => setDeltaAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Aplicar Delta
            </button>
          </form>
        </div>
      </div>

      {/* Inventario actual */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Inventario Actual</h3>
        {Object.keys(inventory.stock).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay productos en el inventario</p>
            <p className="text-sm">Abre esta página en otra pestaña para ver la sincronización en acción</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(inventory.stock).map(([sku, quantity]) => (
                  <tr key={sku} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        quantity > 10 ? 'bg-green-100 text-green-800' :
                        quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => actions.incrementStock(sku, 1)}
                          className="text-green-600 hover:text-green-900"
                          title="Añadir 1"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => actions.incrementStock(sku, -1)}
                          className="text-red-600 hover:text-red-900"
                          title="Restar 1"
                        >
                          -1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Información de sincronización */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Información de Sincronización</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Dispositivo:</span> {navigator.userAgent.includes('Mobile') ? '📱' : '💻'} {navigator.platform}
          </div>
          <div>
            <span className="font-medium">Total productos:</span> {Object.keys(inventory.stock).length}
          </div>
          <div>
            <span className="font-medium">Actualizado por:</span> {inventory.updatedBy}
          </div>
          <div>
            <span className="font-medium">Última actualización:</span> {new Date(inventory.lastUpdate).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}