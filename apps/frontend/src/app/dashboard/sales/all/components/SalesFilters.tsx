'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

export function SalesFilters({ filters, onFiltersChange, onClear }: SalesFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SalesFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof SalesFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="search">Búsqueda</Label>
          <Input
            id="search"
            placeholder="ID de venta o cliente..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
          />
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Fecha desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localFilters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFilters.dateFrom ? (
                  format(localFilters.dateFrom, "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={localFilters.dateFrom}
                onSelect={(date) => handleFilterChange('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Fecha hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localFilters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFilters.dateTo ? (
                  format(localFilters.dateTo, "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={localFilters.dateTo}
                onSelect={(date) => handleFilterChange('dateTo', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Customer ID */}
        <div className="space-y-2">
          <Label htmlFor="customerId">ID Cliente</Label>
          <Input
            id="customerId"
            placeholder="ID del cliente..."
            value={localFilters.customerId || ''}
            onChange={(e) => handleFilterChange('customerId', e.target.value || undefined)}
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Método de Pago</Label>
          <Select
            value={localFilters.paymentMethod || 'all'}
            onValueChange={(value) => handleFilterChange('paymentMethod', value === 'all' ? undefined : value)}
          >
            <SelectTrigger id="paymentMethod">
              <SelectValue placeholder="Seleccionar método" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={localFilters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sale Type */}
        <div className="space-y-2">
          <Label htmlFor="saleType">Tipo de Venta</Label>
          <Select
            value={localFilters.saleType || 'all'}
            onValueChange={(value) => handleFilterChange('saleType', value === 'all' ? undefined : value)}
          >
            <SelectTrigger id="saleType">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {saleTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <Label htmlFor="minAmount">Monto Mínimo</Label>
          <Input
            id="minAmount"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={localFilters.minAmount || ''}
            onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxAmount">Monto Máximo</Label>
          <Input
            id="maxAmount"
            type="number"
            placeholder="999999.99"
            step="0.01"
            value={localFilters.maxAmount || ''}
            onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        {/* Coupon Filter */}
        <div className="space-y-2">
          <Label htmlFor="hasCoupon">¿Tiene Cupón?</Label>
          <Select
            value={localFilters.hasCoupon === undefined ? '' : localFilters.hasCoupon.toString()}
            onValueChange={(value) => handleFilterChange('hasCoupon', value === '' || value === 'all' ? undefined : value === 'true')}
          >
            <SelectTrigger id="hasCoupon">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
