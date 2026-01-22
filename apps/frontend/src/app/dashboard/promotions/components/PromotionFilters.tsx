'use client';

import { Filter, ArrowUpDown, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PromotionFiltersProps {
  statusFilter: 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';
  setStatusFilter: (value: 'all' | 'active' | 'scheduled' | 'expired' | 'inactive') => void;
  sortBy: 'name' | 'date' | 'discount';
  setSortBy: (value: 'name' | 'date' | 'discount') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (value: 'grid' | 'list') => void;
}

export function PromotionFilters({
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}: PromotionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[160px] h-12" aria-label="Filtrar por estado">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="active">Activas</SelectItem>
          <SelectItem value="scheduled">Programadas</SelectItem>
          <SelectItem value="expired">Expiradas</SelectItem>
          <SelectItem value="inactive">Inactivas</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-12 gap-2" aria-label="Ordenar">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Ordenar</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSortBy('name')}>
            Por nombre
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortBy('date')}>
            Por fecha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortBy('discount')}>
            Por descuento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Mode Toggle */}
      <div className="flex border rounded-lg overflow-hidden">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="icon"
          className="h-12 w-12 rounded-none"
          onClick={() => setViewMode('grid')}
          aria-label="Vista de cuadrícula"
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="icon"
          className="h-12 w-12 rounded-none"
          onClick={() => setViewMode('list')}
          aria-label="Vista de lista"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
