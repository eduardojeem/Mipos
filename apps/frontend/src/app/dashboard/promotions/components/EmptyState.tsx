'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Search, Sparkles, FilterX } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  type: 'no-promotions' | 'no-results';
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

export function EmptyState({ type, onCreateClick, onClearFilters }: EmptyStateProps) {
  if (type === 'no-promotions') {
    return (
      <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse" />
            <div className="relative p-8 bg-gradient-to-br from-white to-violet-50 dark:from-slate-900 dark:to-slate-800 rounded-full shadow-xl border border-violet-100 dark:border-violet-900/30">
              <Sparkles className="h-16 w-16 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="absolute -top-2 -right-2 p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
              <Tag className="h-6 w-6 text-indigo-500" />
            </div>
          </motion.div>
          
          <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            ¡Potencia tus Ventas con Promociones!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg text-lg leading-relaxed">
            Las promociones son una excelente manera de atraer nuevos clientes y fidelizar a los existentes. 
            Crea ofertas irresistibles, descuentos por tiempo limitado y campañas especiales.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
            {onCreateClick && (
              <Button 
                onClick={onCreateClick} 
                size="lg"
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                Crear Primera Promoción
              </Button>
            )}
            <Button 
              variant="outline" 
              size="lg"
              className="gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => window.open('https://docs.mipos.com/promotions', '_blank')}
            >
              <Sparkles className="h-4 w-4" />
              Ver Guía de Ejemplos
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-slate-500 dark:text-slate-400 w-full max-w-2xl border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                <Tag className="h-4 w-4" />
              </div>
              <span className="font-medium">Descuentos Flexibles</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-medium">Campañas Temporales</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                <Tag className="h-4 w-4" />
              </div>
              <span className="font-medium">Códigos Promocionales</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 bg-slate-100 dark:bg-slate-800/50 rounded-full relative group"
        >
          <div className="absolute -top-1 -right-1">
            <FilterX className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <Search className="h-12 w-12 text-slate-400 dark:text-slate-500 group-hover:text-violet-500 transition-colors duration-300" />
        </motion.div>
        
        <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
          No se encontraron promociones
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
          No hay resultados que coincidan con tu búsqueda o los filtros aplicados. 
          Intenta usar términos más generales o limpiar los filtros.
        </p>

        {onClearFilters && (
          <Button 
            onClick={onClearFilters}
            variant="outline"
            className="gap-2 border-slate-300 dark:border-slate-700 hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <FilterX className="h-4 w-4" />
            Limpiar Filtros y Búsqueda
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
