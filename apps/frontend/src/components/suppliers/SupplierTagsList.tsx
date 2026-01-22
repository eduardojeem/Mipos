'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Users } from 'lucide-react';
import { SupplierTag } from '@/types/suppliers';

interface TaggedSupplier {
  id: string;
  name: string;
  email: string;
  tags: SupplierTag[];
  category: string;
  status: string;
}

interface SupplierTagsListProps {
  suppliers: TaggedSupplier[];
  onRemoveTag: (supplierId: string, tagId: string) => void;
}

export function SupplierTagsList({ suppliers, onRemoveTag }: SupplierTagsListProps) {
  if (suppliers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay proveedores</h3>
          <p className="text-muted-foreground text-center">
            No se encontraron proveedores que coincidan con tu búsqueda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {suppliers.map((supplier) => (
        <Card key={supplier.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{supplier.name}</h3>
                    <p className="text-sm text-muted-foreground">{supplier.email}</p>
                  </div>
                  <Badge variant="outline">{supplier.category}</Badge>
                  <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                    {supplier.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <span className="text-sm text-muted-foreground">Etiquetas:</span>
                  {supplier.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {supplier.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="flex items-center space-x-1 hover:bg-opacity-80 transition-colors"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          <span>{tag.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => onRemoveTag(supplier.id, tag.id)}
                            title={`Remover etiqueta ${tag.name}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin etiquetas</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}