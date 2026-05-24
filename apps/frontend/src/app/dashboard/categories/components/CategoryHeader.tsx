'use client';

import { FolderTree, Grid, List, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { StatusFilter } from '../hooks/useCategoryManagement';

interface CategoryHeaderProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  viewMode: 'cards' | 'table' | 'tree';
  setViewMode: (mode: 'cards' | 'table' | 'tree') => void;
  onNewClick: () => void;
}

export function CategoryHeader({
  searchInput,
  setSearchInput,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
  onNewClick,
}: CategoryHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground">Gestiona la clasificación interna de productos.</p>
        </div>
        <Button onClick={onNewClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 p-1 rounded-md border bg-muted/30">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('table')}
                title="Vista de tabla"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('tree')}
                title="Vista de árbol"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('cards')}
                title="Vista de cuadrícula"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
