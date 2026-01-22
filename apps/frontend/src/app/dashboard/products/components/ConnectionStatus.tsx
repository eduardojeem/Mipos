'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Wifi, WifiOff, TestTube } from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';

export function ConnectionStatus() {
  const { isMockMode, canRetrySupabase, actions, error } = useProducts();

  if (isMockMode) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <TestTube className="w-3 h-3 mr-1" />
          Modo Prueba
        </Badge>
        {canRetrySupabase && (
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.switchToSupabase}
            className="h-6 px-2 text-xs"
          >
            <Database className="w-3 h-3 mr-1" />
            Conectar DB
          </Button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
          <WifiOff className="w-3 h-3 mr-1" />
          Sin conexión
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={actions.switchToMockData}
          className="h-6 px-2 text-xs"
        >
          <TestTube className="w-3 h-3 mr-1" />
          Modo Prueba
        </Button>
      </div>
    );
  }

  return (
    <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
      <Wifi className="w-3 h-3 mr-1" />
      Conectado
    </Badge>
  );
}