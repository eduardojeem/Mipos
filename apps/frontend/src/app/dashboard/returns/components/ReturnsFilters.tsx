'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Search, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import type { useReturnFilters } from '../hooks/useReturnFilters';

type FiltersBase = ReturnType<typeof useReturnFilters>;
type Filters = Omit<FiltersBase, 'setStatus'> & { setStatus: (status: string) => void };

interface ReturnsFiltersProps {
  filters: Filters;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  processed: 'Procesada',
  rejected: 'Rechazada',
};

const REFUND_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  bank_transfer: 'Transferencia',
  other: 'Otro',
};

export function ReturnsFilters({ filters }: ReturnsFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDateRangeForCalendar = useCallback((): DateRange | undefined => {
    if (!filters.dateRange.from && !filters.dateRange.to) {
      return undefined;
    }
    return { from: filters.dateRange.from, to: filters.dateRange.to };
  }, [filters.dateRange]);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      filters.setDateRange({});
      return;
    }
    filters.setDateRange({ from: range.from, to: range.to });
    if (range.from && range.to) {
      setIsCalendarOpen(false);
    }
  };

  const formatDateLabel = () => {
    if (!filters.dateRange.from) return 'Rango de fecha';
    if (filters.dateRange.to) {
      return `${filters.dateRange.from.toLocaleDateString('es')} – ${filters.dateRange.to.toLocaleDateString('es')}`;
    }
    return filters.dateRange.from.toLocaleDateString('es');
  };

  // Count active filters for the badge
  const activeFilterCount = [
    filters.searchTerm,
    filters.status !== 'all',
    filters.dateRange.from,
    filters.refundMethod !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-2">
      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por razón, cliente o venta..."
            value={filters.searchTerm}
            onChange={(event) => filters.setSearchTerm(event.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        <Select value={filters.status} onValueChange={filters.setStatus}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="approved">Aprobada</SelectItem>
            <SelectItem value="processed">Procesada</SelectItem>
            <SelectItem value="rejected">Rechazada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.refundMethod} onValueChange={filters.setRefundMethod}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Reembolso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="card">Tarjeta</SelectItem>
            <SelectItem value="bank_transfer">Transferencia</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 gap-2 text-sm ${
                filters.dateRange.from
                  ? 'border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                  : 'text-muted-foreground'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              {formatDateLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={filters.dateRange.from}
              selected={getDateRangeForCalendar()}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {filters.hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={filters.resetFilters}
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {filters.hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.searchTerm && (
            <FilterChip
              label={`"${filters.searchTerm}"`}
              onRemove={() => filters.setSearchTerm('')}
            />
          )}
          {filters.status !== 'all' && (
            <FilterChip
              label={`Estado: ${STATUS_LABELS[filters.status] ?? filters.status}`}
              onRemove={() => {
                filters.setStatus('all');
              }}
            />
          )}
          {filters.refundMethod !== 'all' && (
            <FilterChip
              label={`Reembolso: ${REFUND_LABELS[filters.refundMethod] ?? filters.refundMethod}`}
              onRemove={() => filters.setRefundMethod('all')}
            />
          )}
          {filters.dateRange.from && (
            <FilterChip
              label={`Fecha: ${formatDateLabel()}`}
              onRemove={() => filters.setDateRange({})}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:text-orange-900 dark:hover:text-orange-200"
        aria-label="Quitar filtro"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
