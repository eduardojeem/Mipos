'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-promotions' | 'no-results';
  onCreateClick?: () => void;
}

export function EmptyState({ type, onCreateClick }: EmptyStateProps) {
  if (type === 'no-promotions') {
    return (
      <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 blur-3xl opacity-20 rounded-full" />
            <div className="relative p-6 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950 dark:to-indigo-950 rounded-full">
              <Tag className="h-16 w-16 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
            Aún no hay promociones
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
            Crea tu primera promoción para atraer clientes y aumentar tus ventas. 
            Define descuentos, fechas y productos aplicables para destacar tus ofertas.
          </p>
          
          {onCreateClick && (
            <Button 
              onClick={onCreateClick} 
              size="lg"
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Crear promoción
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Search className="h-12 w-12 text-slate-400 dark:text-slate-600" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
          No se encontraron resultados
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          Intenta ajustar los filtros o términos de búsqueda para encontrar lo que buscas.
        </p>
      </CardContent>
    </Card>
  );
}
