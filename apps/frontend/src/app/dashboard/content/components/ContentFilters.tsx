'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { ContentFilters as ContentFiltersType } from '../hooks/useContentFilters';
// Removed date-fns to avoid compatibility issues

interface ContentFiltersProps {
  filters: ContentFiltersType;
  onUpdateFilter: (key: keyof ContentFiltersType, value: any) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  filterCount: number;
  activeTab: 'pages' | 'banners' | 'media';
}

export function ContentFilters({
  filters,
  onUpdateFilter,
  onResetFilters,
  hasActiveFilters,
  filterCount,
  activeTab
}: ContentFiltersProps) {
  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    onUpdateFilter('dateRange', {
      ...filters.dateRange,
      [field]: date
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={`Buscar ${activeTab === 'pages' ? 'páginas' : activeTab === 'banners' ? 'banners' : 'archivos'}...`}
            value={filters.searchTerm}
            onChange={(e) => onUpdateFilter('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sort Controls */}
          <Select value={filters.sortBy} onValueChange={(value) => onUpdateFilter('sortBy', value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Título</SelectItem>
              <SelectItem value="date">Fecha</SelectItem>
              {activeTab === 'pages' && <SelectItem value="views">Vistas</SelectItem>}
              {activeTab === 'media' && <SelectItem value="size">Tamaño</SelectItem>}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar ({filterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => onUpdateFilter('status', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {activeTab === 'pages' && (
              <>
                <SelectItem value="published">Publicadas</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
              </>
            )}
            {activeTab === 'banners' && (
              <>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {/* Category Filter (Pages) */}
        {activeTab === 'pages' && (
          <Select value={filters.category} onValueChange={(value) => onUpdateFilter('category', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="Principal">Principal</SelectItem>
              <SelectItem value="Institucional">Institucional</SelectItem>
              <SelectItem value="Legal">Legal</SelectItem>
              <SelectItem value="Productos">Productos</SelectItem>
              <SelectItem value="Blog">Blog</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Position Filter (Banners) */}
        {activeTab === 'banners' && (
          <Select value={filters.position} onValueChange={(value) => onUpdateFilter('position', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Posición" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              <SelectItem value="HERO">Hero</SelectItem>
              <SelectItem value="SIDEBAR">Sidebar</SelectItem>
              <SelectItem value="FOOTER">Footer</SelectItem>
              <SelectItem value="POPUP">Popup</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* File Type Filter (Media) */}
        {activeTab === 'media' && (
          <>
            <Select value={filters.fileType} onValueChange={(value) => onUpdateFilter('fileType', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo de archivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="images">Imágenes</SelectItem>
                <SelectItem value="documents">Documentos</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.folder} onValueChange={(value) => onUpdateFilter('folder', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Carpeta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las carpetas</SelectItem>
                <SelectItem value="banners">Banners</SelectItem>
                <SelectItem value="productos">Productos</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="documentos">Documentos</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-60 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange.from ? (
                filters.dateRange.to ? (
                  <>
                    {filters.dateRange.from.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} -{" "}
                    {filters.dateRange.to.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </>
                ) : (
                  filters.dateRange.from.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                )
              ) : (
                <span>Rango de fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) => handleDateRangeChange('from', date)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) => handleDateRangeChange('to', date)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateFilter('dateRange', {})}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: "{filters.searchTerm}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('searchTerm', '')}
              />
            </Badge>
          )}
          
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Estado: {filters.status}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('status', 'all')}
              />
            </Badge>
          )}
          
          {filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Categoría: {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('category', 'all')}
              />
            </Badge>
          )}
          
          {filters.position !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Posición: {filters.position}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('position', 'all')}
              />
            </Badge>
          )}
          
          {filters.fileType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {filters.fileType}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('fileType', 'all')}
              />
            </Badge>
          )}
          
          {filters.folder !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Carpeta: {filters.folder}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('folder', 'all')}
              />
            </Badge>
          )}
          
          {(filters.dateRange.from || filters.dateRange.to) && (
            <Badge variant="secondary" className="gap-1">
              Fecha: {filters.dateRange.from && filters.dateRange.from.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
              {filters.dateRange.from && filters.dateRange.to && " - "}
              {filters.dateRange.to && filters.dateRange.to.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('dateRange', {})}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}