'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplierTag } from '@/types/suppliers';
import { Tag, Users, Palette, Hash } from 'lucide-react';

interface TagsStatsProps {
  tags: SupplierTag[];
  totalSuppliers: number;
}

export function TagsStats({ tags, totalSuppliers }: TagsStatsProps) {
  const totalTags = tags.length;
  const totalTaggedSuppliers = tags.reduce((sum, tag) => sum + tag.supplierCount, 0);
  const averageTagsPerSupplier = totalSuppliers > 0 ? (totalTaggedSuppliers / totalSuppliers).toFixed(1) : '0';
  
  const categoryStats = tags.reduce((acc, tag) => {
    acc[tag.category] = (acc[tag.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedCategory = Object.entries(categoryStats).reduce(
    (max, [category, count]) => count > max.count ? { category, count } : max,
    { category: '', count: 0 }
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Etiquetas</CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTags}</div>
          <p className="text-xs text-muted-foreground">
            Etiquetas creadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Proveedores Etiquetados</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTaggedSuppliers}</div>
          <p className="text-xs text-muted-foreground">
            Asignaciones totales
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promedio por Proveedor</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageTagsPerSupplier}</div>
          <p className="text-xs text-muted-foreground">
            Etiquetas por proveedor
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Categoría Popular</CardTitle>
          <Palette className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mostUsedCategory.count}</div>
          <p className="text-xs text-muted-foreground">
            {mostUsedCategory.category || 'N/A'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}