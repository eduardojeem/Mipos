'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, CheckCircle, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onCreateOrder: () => void;
  onMarkResolved: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onCreateOrder, 
  onMarkResolved, 
  onClearSelection 
}: BulkActionsBarProps) {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateOrder}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Crear Orden de Compra
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkResolved}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Marcar como Resuelto
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Limpiar Selección
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}