'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
// Removed date-fns dependency for simplicity

interface ReturnsFiltersProps {
  filters: {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    status: string;
    setStatus: (status: string) => void;
    dateRange: { from?: Date; to?: Date };
    setDateRange: (range: { from?: Date; to?: Date }) => void;
    customerId: string;
    setCustomerId: (id: string) => void;
    resetFilters: () => void;
  };
}

export function ReturnsFilters({ filters }: ReturnsFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const hasActiveFilters = 
    filters.searchTerm || 
    filters.status !== 'all' || 
    filters.dateRange.from || 
    filters.customerId;

  // Convert our date range format to react-day-picker DateRange format
  const getDateRangeForCalendar = (): DateRange | undefined => {
    if (!filters.dateRange.from && !filters.dateRange.to) {
      return undefined;
    }
    return {
      from: filters.dateRange.from,
      to: filters.dateRange.to,
    };
  };

  // Handle date range selection from calendar
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      filters.setDateRange({});
      return;
    }
    
    filters.setDateRange({
      from: range.from,
      to: range.to,
    });
    
    if (range.from && range.to) {
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar devoluciones..."
          value={filters.searchTerm}
          onChange={(e) => filters.setSearchTerm(e.target.value)}
          className="pl-8 w-full sm:w-64"
        />
      </div>

      {/* Status Filter */}
      <Select value={filters.status} onValueChange={filters.setStatus}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendientes</SelectItem>
          <SelectItem value="approved">Aprobadas</SelectItem>
          <SelectItem value="processed">Procesadas</SelectItem>
          <SelectItem value="rejected">Rechazadas</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full sm:w-64 justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange.from ? (
              filters.dateRange.to ? (
                <>
                  {filters.dateRange.from.toLocaleDateString()} -{" "}
                  {filters.dateRange.to.toLocaleDateString()}
                </>
              ) : (
                filters.dateRange.from.toLocaleDateString()
              )
            ) : (
              "Seleccionar fechas"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={filters.dateRange.from}
            selected={getDateRangeForCalendar()}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

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