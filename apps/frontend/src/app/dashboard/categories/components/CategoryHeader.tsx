'use client';

import { Search, Plus, List, Grid, FolderTree } from 'lucide-react';
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
  onNewClick
}: CategoryHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground">Gestiona las categorías de productos</p>
        </div>
        <Button onClick={onNewClick} className="gap-2 shadow-sm transition-all hover:scale-[1.02]">
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-background/50 border-muted-foreground/20"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full lg:w-[180px] bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="active">Solo Activas</SelectItem>
                <SelectItem value="inactive">Solo Inactivas</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-1.5 p-1 rounded-md border border-muted-foreground/20 bg-muted/30">
               <Button 
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'} 
                size="icon" 
                className={`h-8 w-8 ${viewMode === 'cards' ? 'shadow-sm' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Vista de cuadrícula"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="icon" 
                className={`h-8 w-8 ${viewMode === 'table' ? 'shadow-sm' : ''}`}
                onClick={() => setViewMode('table')}
                title="Vista de tabla"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'tree' ? 'secondary' : 'ghost'} 
                size="icon" 
                className={`h-8 w-8 ${viewMode === 'tree' ? 'shadow-sm' : ''}`}
                onClick={() => setViewMode('tree')}
                title="Vista de árbol"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
