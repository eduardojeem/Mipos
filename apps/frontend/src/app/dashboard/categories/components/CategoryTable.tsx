'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CategoryWithCount, SortDirection, SortField } from '../hooks/useCategoryManagement';

interface CategoryTableProps {
  categories: CategoryWithCount[];
  selectedCategories: Set<string>;
  onSelectAll: (selected: boolean) => void;
  onSelectCategory: (id: string, selected: boolean) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (category: CategoryWithCount) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export function CategoryTable({
  categories,
  selectedCategories,
  onSelectAll,
  onSelectCategory,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryTableProps) {
  const selectedOnPage = categories.filter((category) => selectedCategories.has(category.id)).length;
  const allOnPageSelected = categories.length > 0 && selectedOnPage === categories.length;

  const SortButton = ({ field, children }: { field: SortField; children: ReactNode }) => (
    <Button variant="ghost" size="sm" onClick={() => onSort(field)} className="h-8 px-2 lg:px-3 hover:bg-muted/50 -ml-3">
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={allOnPageSelected ? true : selectedOnPage > 0 ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label="Seleccionar categorías de esta página"
                />
              </TableHead>
              <TableHead><SortButton field="name">Nombre</SortButton></TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead><SortButton field="products">Productos</SortButton></TableHead>
              <TableHead><SortButton field="is_active">Estado</SortButton></TableHead>
              <TableHead className="text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No se encontraron categorías.
                </TableCell>
              </TableRow>
            ) : categories.map((category) => {
              const productCount = category._count?.products || 0;
              const canDelete = productCount === 0;

              return (
                <TableRow key={category.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={(checked) => onSelectCategory(category.id, checked === true)}
                      aria-label={`Seleccionar ${category.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate" title={category.description || ''}>
                    {category.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{productCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => onToggleStatus(category.id, category.is_active)}
                        aria-label={category.is_active ? 'Desactivar categoría' : 'Activar categoría'}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {category.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => canDelete && onDelete(category.id)}
                          className={canDelete ? 'text-destructive focus:bg-destructive/10' : 'opacity-50 cursor-not-allowed'}
                          disabled={!canDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
