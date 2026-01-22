import React from 'react';
import { Search, Package, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'no-products' | 'no-results' | 'no-category';
  searchQuery?: string;
  categoryName?: string;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  searchQuery,
  categoryName,
  onClearFilters,
  onClearSearch,
  className
}) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-results':
        return {
          icon: <Search className="h-16 w-16 text-muted-foreground/50" />,
          title: 'No se encontraron productos',
          description: searchQuery 
            ? `No hay productos que coincidan con "${searchQuery}"`
            : 'No hay productos que coincidan con los filtros aplicados',
          actions: (
            <div className="flex flex-col sm:flex-row gap-3">
              {searchQuery && onClearSearch && (
                <Button variant="outline" onClick={onClearSearch} className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Limpiar búsqueda
                </Button>
              )}
              {onClearFilters && (
                <Button variant="default" onClick={onClearFilters} className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          )
        };
      
      case 'no-category':
        return {
          icon: <Package className="h-16 w-16 text-muted-foreground/50" />,
          title: 'Categoría vacía',
          description: categoryName 
            ? `No hay productos en la categoría "${categoryName}"`
            : 'Esta categoría no tiene productos disponibles',
          actions: onClearFilters && (
            <Button variant="default" onClick={onClearFilters} className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ver todos los productos
            </Button>
          )
        };
      
      default: // no-products
        return {
          icon: <Package className="h-16 w-16 text-muted-foreground/50" />,
          title: 'No hay productos disponibles',
          description: 'Aún no se han agregado productos al catálogo',
          actions: (
            <Button variant="default" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Agregar primer producto
            </Button>
          )
        };
    }
  };

  const { icon, title, description, actions } = getEmptyStateContent();

  return (
    <Card className={cn('border-2 border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="mb-6 p-4 bg-muted/30 rounded-full">
          {icon}
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>

        {actions && (
          <div className="flex flex-col sm:flex-row gap-3">
            {actions}
          </div>
        )}

        {type === 'no-results' && (
          <div className="mt-8 p-4 bg-muted/20 rounded-lg max-w-md">
            <h4 className="font-medium mb-2 text-sm">Sugerencias:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Verifica la ortografía de tu búsqueda</li>
              <li>• Usa términos más generales</li>
              <li>• Prueba con sinónimos o palabras relacionadas</li>
              <li>• Revisa los filtros aplicados</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;