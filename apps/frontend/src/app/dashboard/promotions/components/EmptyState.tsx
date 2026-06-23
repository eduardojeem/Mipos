'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Search, FilterX } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-promotions' | 'no-results';
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

export function EmptyState({ type, onCreateClick, onClearFilters }: EmptyStateProps) {
  if (type === 'no-promotions') {
    return (
      <Card className="border-dashed border-2 border-border bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Tag className="h-8 w-8" />
          </div>

          <h3 className="mb-2 text-2xl font-semibold text-foreground">
            Todavía no hay promociones
          </h3>
          <p className="mb-8 max-w-xl text-sm text-muted-foreground sm:text-base">
            Este módulo centraliza campañas, descuentos y material público de una organización.
            Empezá creando tu primera promoción para productos o servicios y después administrala desde el mismo panel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
            {onCreateClick && (
              <Button
                onClick={onCreateClick}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Crear primera promoción
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => window.open('https://docs.MITIENDA.com/promotions', '_blank')}
            >
              <Tag className="h-4 w-4" />
              Ver guía
            </Button>
          </div>

          <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-muted p-2">
                <Tag className="h-4 w-4" />
              </div>
              <span className="font-medium text-foreground">Descuentos</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-muted p-2">
                <Search className="h-4 w-4" />
              </div>
              <span className="font-medium text-foreground">Segmentación</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-muted p-2">
                <Tag className="h-4 w-4" />
              </div>
              <span className="font-medium text-foreground">Publicación</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-border bg-muted/10">
      <CardContent className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <FilterX className="absolute -right-1 -top-1 h-5 w-5 text-muted-foreground" />
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>

        <h3 className="mb-2 text-xl font-semibold text-foreground">
          No se encontraron promociones
        </h3>
        <p className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base">
          No hay resultados que coincidan con tu búsqueda o filtros activos.
          Probá con un término más general o restablecé el panel.
        </p>

        {onClearFilters && (
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="gap-2"
          >
            <FilterX className="h-4 w-4" />
            Limpiar filtros y búsqueda
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
