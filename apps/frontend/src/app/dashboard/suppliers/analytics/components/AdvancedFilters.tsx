'use client';

import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  DollarSign,
  Users,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface AdvancedFiltersState {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  performanceRange: [number, number];
  categories: string[];
  regions: string[];
  minOrderValue: number;
  maxOrderValue: number;
  activeOnly: boolean;
  sortBy: 'name' | 'performance' | 'totalPurchases' | 'totalOrders' | 'lastPurchase';
  sortOrder: 'asc' | 'desc';
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
  availableCategories: string[];
  availableRegions: string[];
  isOpen: boolean;
  onToggle: () => void;
}

export const AdvancedFilters = memo(function AdvancedFilters({
  filters,
  onFiltersChange,
  availableCategories,
  availableRegions,
  isOpen,
  onToggle,
}: AdvancedFiltersProps) {
  const [tempFilters, setTempFilters] = useState<AdvancedFiltersState>(filters);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(tempFilters);
    onToggle();
  }, [tempFilters, onFiltersChange, onToggle]);

  const handleResetFilters = useCallback(() => {
    const defaultFilters: AdvancedFiltersState = {
      dateRange: { start: null, end: null },
      performanceRange: [0, 100],
      categories: [],
      regions: [],
      minOrderValue: 0,
      maxOrderValue: 1000000,
      activeOnly: false,
      sortBy: 'performance',
      sortOrder: 'desc',
    };
    setTempFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  const updateTempFilters = useCallback((key: keyof AdvancedFiltersState, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setTempFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  }, []);

  const toggleRegion = useCallback((region: string) => {
    setTempFilters(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }));
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.performanceRange[0] > 0 || filters.performanceRange[1] < 100) count++;
    if (filters.categories.length > 0) count++;
    if (filters.regions.length > 0) count++;
    if (filters.minOrderValue > 0 || filters.maxOrderValue < 1000000) count++;
    if (filters.activeOnly) count++;
    return count;
  }, [filters]);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={onToggle}
        className="relative"
      >
        <Filter className="mr-2 h-4 w-4" />
        Filtros Avanzados
        {getActiveFiltersCount() > 0 && (
          <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
            {getActiveFiltersCount()}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avanzados
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Rango de Fechas
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  {tempFilters.dateRange.start ? (
                    format(tempFilters.dateRange.start, 'dd/MM/yyyy', { locale: es })
                  ) : (
                    'Fecha inicio'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={tempFilters.dateRange.start || undefined}
                  onSelect={(date) => updateTempFilters('dateRange', { 
                    ...tempFilters.dateRange, 
                    start: date || null 
                  })}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  {tempFilters.dateRange.end ? (
                    format(tempFilters.dateRange.end, 'dd/MM/yyyy', { locale: es })
                  ) : (
                    'Fecha fin'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={tempFilters.dateRange.end || undefined}
                  onSelect={(date) => updateTempFilters('dateRange', { 
                    ...tempFilters.dateRange, 
                    end: date || null 
                  })}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator />

        {/* Performance Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rango de Rendimiento ({tempFilters.performanceRange[0]} - {tempFilters.performanceRange[1]})
          </Label>
          <Slider
            value={tempFilters.performanceRange}
            onValueChange={(value) => updateTempFilters('performanceRange', value as [number, number])}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Order Value Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor de Órdenes
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                type="number"
                value={tempFilters.minOrderValue}
                onChange={(e) => updateTempFilters('minOrderValue', Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                type="number"
                value={tempFilters.maxOrderValue}
                onChange={(e) => updateTempFilters('maxOrderValue', Number(e.target.value))}
                placeholder="1000000"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Categories */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Categorías
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => (
              <Badge
                key={category}
                variant={tempFilters.categories.includes(category) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                {category}
                {tempFilters.categories.includes(category) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Regions */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Regiones
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableRegions.map((region) => (
              <Badge
                key={region}
                variant={tempFilters.regions.includes(region) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleRegion(region)}
              >
                {region}
                {tempFilters.regions.includes(region) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Additional Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Solo proveedores activos</Label>
            <Switch
              checked={tempFilters.activeOnly}
              onCheckedChange={(checked) => updateTempFilters('activeOnly', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Sort Options */}
        <div className="space-y-3">
          <Label>Ordenar por</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={tempFilters.sortBy}
              onValueChange={(value) => updateTempFilters('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="performance">Rendimiento</SelectItem>
                <SelectItem value="totalPurchases">Total Compras</SelectItem>
                <SelectItem value="totalOrders">Total Órdenes</SelectItem>
                <SelectItem value="lastPurchase">Última Compra</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={tempFilters.sortOrder}
              onValueChange={(value) => updateTempFilters('sortOrder', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascendente</SelectItem>
                <SelectItem value="desc">Descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleApplyFilters} className="flex-1">
            Aplicar Filtros
          </Button>
          <Button variant="outline" onClick={handleResetFilters}>
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});