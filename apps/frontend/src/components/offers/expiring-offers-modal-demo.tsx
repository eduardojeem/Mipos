'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExpiringOffersNotification, ExpiringOffer } from './expiring-offers-notification';

// Datos de ejemplo para la demostración
const mockExpiringOffers: ExpiringOffer[] = [
  {
    id: '1',
    productName: 'iPhone 15 Pro Max',
    promotionName: 'Black Friday Especial',
    endDate: '2024-12-13T10:00:00Z',
    discountPercent: 25,
    hoursRemaining: 2
  },
  {
    id: '2',
    productName: 'MacBook Air M3',
    promotionName: 'Cyber Monday',
    endDate: '2024-12-13T18:00:00Z',
    discountPercent: 15,
    hoursRemaining: 8
  },
  {
    id: '3',
    productName: 'AirPods Pro 2',
    promotionName: 'Oferta Flash',
    endDate: '2024-12-14T12:00:00Z',
    discountPercent: 30,
    hoursRemaining: 20
  }
];

export default function ExpiringOffersModalDemo() {
  const [showModal, setShowModal] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
  };

  const handleViewOffer = (offerId: string) => {
    addLog(`Ver oferta: ${offerId}`);
    console.log('Ver oferta:', offerId);
    // Aquí iría la lógica para mostrar los detalles de la oferta
  };

  return (
    <div className="p-8 space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Demo: Modal de Ofertas por Expirar</h1>
        <p className="text-gray-600 mb-6">
          Haz clic en el botón para ver el nuevo diseño del modal temporal
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={() => {
              setShowModal(true);
              addLog('Modal activado manualmente');
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            Mostrar Modal de Ofertas
          </Button>
          
          <Button 
            onClick={() => {
              setShowModal(false);
              addLog('Modal desactivado manualmente');
            }}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Forzar Cierre (Test)
          </Button>
          
          <Button 
            onClick={() => {
              setDebugLogs([]);
            }}
            variant="outline"
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Limpiar Logs
          </Button>
          
          <Button 
            onClick={() => {
              setShowModal(false);
              addLog('Reset completo - modal puede mostrarse de nuevo');
              // Simular reset completo
              setTimeout(() => {
                setShowModal(true);
                addLog('Modal reactivado después de reset');
              }, 100);
            }}
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            Reset & Reabrir
          </Button>
        </div>

        {/* Debug Logs */}
        {debugLogs.length > 0 && (
          <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <h3 className="text-white font-bold mb-2">Debug Logs:</h3>
            {debugLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        )}
      </div>

      {/* Características del nuevo modal */}
      <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          ✨ Características del Modal Mejorado:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Auto-cierre en <strong>4 segundos</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Pausa al hacer hover</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Animaciones 3D avanzadas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Indicadores de urgencia inteligentes</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Contador regresivo visual</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Efectos de partículas decorativas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-teal-500 to-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Gradientes dinámicos por urgencia</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Interacciones micro-animadas</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎯 Niveles de Urgencia:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-full"></div>
              <span><strong>CRÍTICO</strong> (&lt;4h): Fondo rojo, icono de fuego 🔥</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
              <span><strong>URGENTE</strong> (&lt;12h): Fondo naranja, icono de rayo ⚡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></div>
              <span><strong>NORMAL</strong> (&lt;24h): Fondo ámbar, icono de timer ⏲️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Component */}
      <ExpiringOffersNotification
        offers={showModal ? mockExpiringOffers : []}
        onViewOffer={handleViewOffer}
      />
    </div>
  );
}