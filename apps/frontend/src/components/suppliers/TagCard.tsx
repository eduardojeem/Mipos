'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Users } from 'lucide-react';
import { SupplierTag } from '@/types/suppliers';

interface TagCardProps {
  tag: SupplierTag;
  onEdit: (tag: SupplierTag) => void;
  onDelete: (tag: SupplierTag) => void;
  onAssign: (tag: SupplierTag) => void;
  categoryLabel: string;
}

const TAG_CATEGORIES = [
  { value: 'performance', label: 'Rendimiento', icon: '📊' },
  { value: 'location', label: 'Ubicación', icon: '📍' },
  { value: 'product', label: 'Producto', icon: '📦' },
  { value: 'relationship', label: 'Relación', icon: '🤝' },
  { value: 'custom', label: 'Personalizado', icon: '🏷️' }
] as const;

export function TagCard({ tag, onEdit, onDelete, onAssign, categoryLabel }: TagCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: tag.color }}
            />
            <CardTitle className="text-lg">{tag.name}</CardTitle>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssign(tag)}
              title="Asignar a proveedores"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(tag)}
              title="Editar etiqueta"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(tag)}
              title="Eliminar etiqueta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>{tag.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            {categoryLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {tag.supplierCount} proveedores
          </span>
        </div>
      </CardContent>
    </Card>
  );
}