'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface SalesFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  paymentMethod?: string;
  status?: string;
  saleType?: string;
  minAmount?: number;
  maxAmount?: number;
  hasCoupon?: boolean;
}

interface SalesFiltersProps {
  filters: SalesFilters;
  onFiltersChange: (filters: SalesFilters) => void;
  onClear: () => void;
}

const paymentMethods = [
  { value: 'all', label: 'Todos los métodos' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'DIGITAL_WALLET', label: 'Billetera Digital' },
  { value: 'OTHER', label: 'Otro' },
];

const statuses = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'REFUNDED', label: 'Reembolsada' },
];

const saleTypes = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'RETAIL', label: 'Minorista' },
  { value: 'WHOLESALE', label: 'Mayorista' },
];

const datePresets = [
  {
    label: 'Hoy',
    getRange: () => ({ dateFrom: startOfDay(new Date()), dateTo: endOfDay(new Date()) }),
  },
  {
    label: 'Esta semana',
    getRange: () => ({ dateFrom: startOfWeek(new Date(), { locale: es }), dateTo: endOfWeek(new Date(), { locale: es }) }),
  },
  {
    label: 'Este mes',
    getRange: () => ({ dateFrom: startOfMonth(new Date()), dateTo: endOfMonth(new Date()) }),
  },
];

export function SalesFilters({ filters, onFiltersChange, onClear }: SalesFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SalesFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (key: keyof SalesFilters, value: any) => {
    const next = { ...localFilters, [key]: value };
    setLocalFilters(next);
    onFiltersChange(next);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
  };

  const applyPreset = (preset: typeof datePresets[0]) => {
    const range = preset.getRange();
    const next = { ...localFilters, ...range };
    setLocalFilters(next);
    onFiltersChange(next);
  };

  const activeCount = Object.values(localFilters).filter(
    (v) => v !== undefined && v !== '' && v !== null,
  ).length;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filtros</h3>
          {activeCount > 0 && (
            <Badge variant="secondary">{activeCount}</Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Date presets */}
      <div className="flex gap-2 flex-wrap">
        {datePresets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Búsqueda</Label>
          <Input
            id="search"
            placeholder="Nombre de cliente, notas..."
            value={localFilters.search || ''}
            onChange={(e) => handleChange('search', e.target.value || undefined)}
          />
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label>Fecha desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !localFilters.dateFrom && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFilters.dateFrom ? format(localFilters.dateFrom, 'PPP', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={localFilters.dateFrom}
                onSelect={(date) => handleChange('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label>Fecha hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !localFilters.dateTo && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFilters.dateTo ? format(localFilters.dateTo, 'PPP', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={localFilters.dateTo}
                onSelect={(date) => handleChange('dateTo', date)}
                disabled={(date) => localFilters.dateFrom ? date < localFilters.dateFrom : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label>Método de Pago</Label>
          <Select
            value={localFilters.paymentMethod || 'all'}
            onValueChange={(v) => handleChange('paymentMethod', v === 'all' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={localFilters.status || 'all'}
            onValueChange={(v) => handleChange('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sale Type */}
        <div className="space-y-2">
          <Label>Tipo de Venta</Label>
          <Select
            value={localFilters.saleType || 'all'}
            onValueChange={(v) => handleChange('saleType', v === 'all' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {saleTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Min Amount */}
        <div className="space-y-2">
          <Label htmlFor="minAmount">Monto Mínimo</Label>
          <Input
            id="minAmount"
            type="number"
            placeholder="0.00"
            min={0}
            step="0.01"
            value={localFilters.minAmount ?? ''}
            onChange={(e) => handleChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        {/* Max Amount */}
        <div className="space-y-2">
          <Label htmlFor="maxAmount">Monto Máximo</Label>
          <Input
            id="maxAmount"
            type="number"
            placeholder="Sin límite"
            min={0}
            step="0.01"
            value={localFilters.maxAmount ?? ''}
            onChange={(e) => handleChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );
}
