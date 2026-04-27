'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StockAlertFilterOption } from '@/lib/stock-alerts';
import { Search, X } from 'lucide-react';

interface StockAlertsFiltersProps {
  filters: {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    severity: string;
    setSeverity: (severity: string) => void;
    category: string;
    setCategory: (category: string) => void;
    supplier: string;
    setSupplier: (supplier: string) => void;
    resetFilters: () => void;
  };
  categories: StockAlertFilterOption[];
  suppliers: StockAlertFilterOption[];
  alertCount: number;
}

export function StockAlertsFilters({
  filters,
  categories,
  suppliers,
  alertCount,
}: StockAlertsFiltersProps) {
  const hasActiveFilters =
    Boolean(filters.searchTerm) ||
    filters.severity !== 'all' ||
    filters.category !== 'all' ||
    filters.supplier !== 'all';

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU o proveedor"
            value={filters.searchTerm}
            onChange={(event) => filters.setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filters.severity} onValueChange={filters.setSeverity}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Criticas</SelectItem>
            <SelectItem value="low">Bajo minimo</SelectItem>
            <SelectItem value="warning">Advertencia</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={filters.setCategory}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {suppliers.length > 0 && (
          <Select value={filters.supplier} onValueChange={filters.setSupplier}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.value} value={supplier.value}>
                  {supplier.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={filters.resetFilters} aria-label="Limpiar filtros">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {alertCount.toLocaleString()} alertas visibles
      </p>
    </div>
  );
}
