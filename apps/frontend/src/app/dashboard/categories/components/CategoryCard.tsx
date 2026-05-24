'use client';

import { Calendar, Edit, Eye, EyeOff, Package, Tag, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Category } from '@/types';

interface CategoryWithCount extends Category {
  _count?: {
    products: number;
  };
}

interface CategoryCardProps {
  category: CategoryWithCount;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export function CategoryCard({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryCardProps) {
  const productCount = category._count?.products || 0;
  const canDelete = productCount === 0;

  return (
    <Card className={`border-border shadow-sm transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(checked === true)}
              className="mt-1"
              aria-label={`Seleccionar ${category.name}`}
            />
            <div className="min-w-0 space-y-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{category.name}</span>
              </CardTitle>
              <Badge variant={category.is_active ? 'default' : 'secondary'}>
                {category.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onToggleStatus}
              title={category.is_active ? 'Desactivar' : 'Activar'}
            >
              {category.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={canDelete ? onDelete : undefined}
              disabled={!canDelete}
              title={canDelete ? 'Eliminar categoría' : `No se puede eliminar: tiene ${productCount} producto${productCount !== 1 ? 's' : ''}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {category.description ? (
          <CardDescription className="line-clamp-2">{category.description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {productCount} producto{productCount !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {productCount === 0 ? 'Sin asignar' : 'Asignados'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(category.created_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}</span>
          </div>
          <span className="font-mono">ID: {category.id.slice(-8)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
