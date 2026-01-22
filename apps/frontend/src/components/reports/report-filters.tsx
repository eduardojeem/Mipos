'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FilterIcon, XIcon, RefreshCwIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReportFilter, DATE_PRESETS } from '@/hooks/use-reports';
import SearchWithAutocomplete from '@/components/pos/SearchWithAutocomplete';
import { useProducts } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import type { Product, Category } from '@/types';
import CustomerAutocomplete from '@/components/customers/CustomerAutocomplete';

interface ReportFiltersProps {
  filters: ReportFilter;
  onFiltersChange: (filters: ReportFilter) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showProductFilter?: boolean;
  showCategoryFilter?: boolean;
  showCustomerFilter?: boolean;
  showSupplierFilter?: boolean;
  showUserFilter?: boolean;
  showStatusFilter?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading = false,
  showProductFilter = true,
  showCategoryFilter = true,
  showCustomerFilter = true,
  showSupplierFilter = false,
  showUserFilter = false,
  showStatusFilter = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined
  );
  const [productQuery, setProductQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');

  // Debounce para inputs simples (supplierId, userId)
  const supplierDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persistencia en URL y localStorage
  const STORAGE_KEY = 'reports:filters';
  const syncFiltersToUrl = useCallback((next: ReportFilter) => {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const keys: (keyof ReportFilter)[] = ['startDate','endDate','productId','categoryId','customerId','supplierId','userId','status','since'];
      keys.forEach((k) => {
        const val = next[k];
        if (val) params.set(k, String(val));
        else params.delete(k);
      });
      window.history.replaceState({}, '', `${url.pathname}?${params.toString()}`);
    } catch {}
  }, []);

  const loadFiltersFromUrl = useCallback(() => {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const parsed: ReportFilter = {
        startDate: params.get('startDate') || undefined,
        endDate: params.get('endDate') || undefined,
        productId: params.get('productId') || undefined,
        categoryId: params.get('categoryId') || undefined,
        customerId: params.get('customerId') || undefined,
        supplierId: params.get('supplierId') || undefined,
        userId: params.get('userId') || undefined,
        status: params.get('status') || undefined,
        since: params.get('since') || undefined,
      };
      // Si no hay fechas, aplicar últimos 30 días por defecto
      if (!parsed.startDate || !parsed.endDate) {
        const end = new Date();
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        parsed.startDate = start.toISOString().split('T')[0];
        parsed.endDate = end.toISOString().split('T')[0];
      }
      onFiltersChange({ ...filters, ...parsed });
      // Sincronizar estado local de fechas
      setStartDate(parsed.startDate ? new Date(parsed.startDate) : undefined);
      setEndDate(parsed.endDate ? new Date(parsed.endDate) : undefined);
      // Persistir en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  }, [filters, onFiltersChange]);

  useEffect(() => {
    // Cargar desde URL si disponible; si no, intentar desde localStorage
    if (typeof window !== 'undefined') {
      const hasParams = new URL(window.location.href).search.length > 0;
      if (hasParams) {
        loadFiltersFromUrl();
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const stored: ReportFilter = JSON.parse(raw);
            onFiltersChange({ ...filters, ...stored });
            setStartDate(stored.startDate ? new Date(stored.startDate) : undefined);
            setEndDate(stored.endDate ? new Date(stored.endDate) : undefined);
            syncFiltersToUrl(stored);
          } else if (!filters.startDate || !filters.endDate) {
            // Fallback a últimos 30 días si no hay filtros
            const end = new Date();
            const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
            const next: ReportFilter = {
              ...filters,
              startDate: start.toISOString().split('T')[0],
              endDate: end.toISOString().split('T')[0],
            };
            onFiltersChange(next);
            setStartDate(new Date(next.startDate!));
            setEndDate(new Date(next.endDate!));
            syncFiltersToUrl(next);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Cada cambio de filtros: persistir y sincronizar URL
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      syncFiltersToUrl(filters);
    } catch {}
  }, [filters, syncFiltersToUrl]);

  // Datos para autocompletado
  const { data: productsData } = useProducts({ is_active: true, limit: 200 });
  const products = (productsData ?? []) as Product[];
  const { data: categoriesData } = useCategories();
  const categories = (categoriesData ?? []) as Category[];

  const handleFilterChange = useCallback((key: keyof ReportFilter, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  }, [filters, onFiltersChange]);

  const handleDatePreset = useCallback((preset: keyof typeof DATE_PRESETS) => {
    const { startDate: start, endDate: end } = DATE_PRESETS[preset].getValue();
    setStartDate(new Date(start));
    setEndDate(new Date(end));
    onFiltersChange({
      ...filters,
      startDate: start,
      endDate: end,
    });
  }, [filters, onFiltersChange]);

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    setStartDate(date);
    onFiltersChange({
      ...filters,
      startDate: date ? date.toISOString().split('T')[0] : undefined,
    });
  }, [filters, onFiltersChange]);

  const handleEndDateChange = useCallback((date: Date | undefined) => {
    setEndDate(date);
    onFiltersChange({
      ...filters,
      endDate: date ? date.toISOString().split('T')[0] : undefined,
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFiltersChange({});
  }, [onFiltersChange]);

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value.trim() !== '').length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filtros de Reporte
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                title={isLoading ? 'Actualizando' : 'Actualizar datos'}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Date Range Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Rango de Fechas</Label>
            
            {/* Date Presets */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(DATE_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset(key as keyof typeof DATE_PRESETS)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm">Fecha Inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm">Fecha Fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {showProductFilter && (
              <div className="space-y-2">
                <Label htmlFor="product-filter" className="text-sm">Producto</Label>
                <SearchWithAutocomplete
                  products={products}
                  categories={[]}
                  value={productQuery}
                  onChange={setProductQuery}
                  onProductSelect={(product) => {
                    handleFilterChange('productId', product.id);
                    setProductQuery(`${product.name} (${product.sku})`);
                  }}
                  placeholder="Buscar producto por nombre, SKU o código"
                  className="w-full"
                />
              </div>
            )}

            {showCategoryFilter && (
              <div className="space-y-2">
                <Label htmlFor="category-filter" className="text-sm">Categoría</Label>
                <SearchWithAutocomplete
                  products={[]}
                  categories={categories}
                  value={categoryQuery}
                  onChange={setCategoryQuery}
                  onCategorySelect={(categoryId) => {
                    handleFilterChange('categoryId', categoryId);
                    const selected = categories.find(c => c.id === categoryId);
                    setCategoryQuery(selected ? selected.name : categoryId);
                  }}
                  placeholder="Buscar categoría"
                  className="w-full"
                />
              </div>
            )}

            {showCustomerFilter && (
              <div className="space-y-2">
                <Label htmlFor="customer-filter" className="text-sm">Cliente</Label>
                <CustomerAutocomplete
                  value={customerQuery}
                  onChange={setCustomerQuery}
                  onSelect={(customer) => {
                    handleFilterChange('customerId', customer.id);
                    setCustomerQuery(`${customer.name}${customer.email ? ` (${customer.email})` : ''}`);
                  }}
                  placeholder="Buscar cliente por nombre, email o teléfono"
                  className="w-full"
                />
              </div>
            )}

            {showSupplierFilter && (
              <div className="space-y-2">
                <Label htmlFor="supplier-filter" className="text-sm">Proveedor</Label>
                <Input
                  id="supplier-filter"
                  placeholder="ID del proveedor"
                  value={filters.supplierId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (supplierDebounceRef.current) clearTimeout(supplierDebounceRef.current);
                    supplierDebounceRef.current = setTimeout(() => {
                      handleFilterChange('supplierId', val);
                    }, 300);
                  }}
                />
              </div>
            )}

            {showUserFilter && (
              <div className="space-y-2">
                <Label htmlFor="user-filter" className="text-sm">Usuario</Label>
                <Input
                  id="user-filter"
                  placeholder="ID del usuario"
                  value={filters.userId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (userDebounceRef.current) clearTimeout(userDebounceRef.current);
                    userDebounceRef.current = setTimeout(() => {
                      handleFilterChange('userId', val);
                    }, 300);
                  }}
                />
              </div>
            )}

            {showStatusFilter && (
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm">Estado</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtros Activos</Label>
              <div className="flex flex-wrap gap-2">
                {filters.startDate && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Desde: {format(new Date(filters.startDate), 'dd/MM/yyyy')}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('startDate', undefined)}
                    />
                  </Badge>
                )}
                {filters.endDate && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Hasta: {format(new Date(filters.endDate), 'dd/MM/yyyy')}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('endDate', undefined)}
                    />
                  </Badge>
                )}
                {filters.productId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Producto: {filters.productId}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('productId', undefined)}
                    />
                  </Badge>
                )}
                {filters.categoryId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Categoría: {filters.categoryId}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('categoryId', undefined)}
                    />
                  </Badge>
                )}
                {filters.customerId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Cliente: {filters.customerId}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('customerId', undefined)}
                    />
                  </Badge>
                )}
                {filters.supplierId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Proveedor: {filters.supplierId}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('supplierId', undefined)}
                    />
                  </Badge>
                )}
                {filters.userId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Usuario: {filters.userId}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('userId', undefined)}
                    />
                  </Badge>
                )}
                {filters.status && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Estado: {filters.status}
                    <XIcon
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange('status', undefined)}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};