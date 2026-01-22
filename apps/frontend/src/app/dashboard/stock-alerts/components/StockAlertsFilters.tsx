'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';

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
}

export function StockAlertsFilters({ filters }: StockAlertsFiltersProps) {
  const hasActiveFilters = 
    filters.searchTerm || 
    filters.severity !== 'all' || 
    filters.category !== 'all' ||
    filters.supplier !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={filters.searchTerm}
          onChange={(e) => filters.setSearchTerm(e.target.value)}
          className="pl-8 w-full sm:w-64"
        />
      </div>

      {/* Severity Filter */}
      <Select value={filters.severity} onValueChange={filters.setSeverity}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Severidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="critical">Crítico</SelectItem>
          <SelectItem value="low">Bajo</SelectItem>
          <SelectItem value="warning">Advertencia</SelectItem>
        </SelectContent>
      </Select>

      {/* Category Filter */}
      <Select value={filters.category} onValueChange={filters.setCategory}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="makeup">Maquillaje</SelectItem>
          <SelectItem value="skincare">Cuidado de la piel</SelectItem>
          <SelectItem value="haircare">Cuidado del cabello</SelectItem>
          <SelectItem value="fragrance">Fragancias</SelectItem>
          <SelectItem value="tools">Herramientas</SelectItem>
        </SelectContent>
      </Select>

      {/* Supplier Filter */}
      <Select value={filters.supplier} onValueChange={filters.setSupplier}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Proveedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="supplier1">Proveedor 1</SelectItem>
          <SelectItem value="supplier2">Proveedor 2</SelectItem>
          <SelectItem value="supplier3">Proveedor 3</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={filters.resetFilters}
          className="px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}