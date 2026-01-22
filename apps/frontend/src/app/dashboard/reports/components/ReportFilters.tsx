'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export interface ReportFilterValues {
  startDate: Date;
  endDate: Date;
  category?: string;
  status?: string;
  customerId?: string;
  productId?: string;
  branchId?: string;
  posId?: string;
  paymentMethod?: string;
}

interface ReportFiltersProps {
  filters: ReportFilterValues;
  onFiltersChange: (filters: ReportFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
  showAdvanced?: boolean;
}

const DATE_PRESETS = [
  { label: 'Hoy', days: 0 },
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Últimos 90 días', days: 90 },
  { label: 'Este mes', days: -1 },
  { label: 'Mes anterior', days: -2 },
];

export function ReportFilters({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  loading = false,
  showAdvanced = false,
}: ReportFiltersProps) {
  const [showCalendar, setShowCalendar] = useState<'start' | 'end' | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [posNodes, setPosNodes] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      const { data } = await supabase.from('categories').select('id,name').order('name', { ascending: true });
      if (mounted) {
        setCategories([{ id: 'all', name: 'Todas' }, ...(data || [])]);
      }
    };
    const loadBranchPos = async () => {
      try {
        // Intentar cargar branches reales primero
        const { data: bData, error: bError } = await supabase.from('branches').select('id,name');
        if (!bError && bData && bData.length > 0) {
          if (mounted) setBranches(['all', ...bData.map((b: any) => b.id)]);
        } else {
          throw new Error('Fallback to sync_events');
        }
      } catch {
        const { data } = await supabase
          .from('sync_events')
          .select('branch_id,pos_id')
          .not('branch_id', 'is', null)
          .limit(500);
        const branchesSet = new Set<string>();
        const posSet = new Set<string>();
        (data || []).forEach((row: any) => {
          if (row.branch_id) branchesSet.add(row.branch_id);
          if (row.pos_id) posSet.add(row.pos_id);
        });
        if (mounted) {
          setBranches(['all', ...Array.from(branchesSet)]);
          setPosNodes(['all', ...Array.from(posSet)]);
        }
      }
    };
    loadCategories();
    loadBranchPos();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDatePreset = (days: number) => {
    const end = new Date();
    let start = new Date();

    if (days === 0) {
      // Hoy
      start = new Date();
    } else if (days === -1) {
      // Este mes
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (days === -2) {
      // Mes anterior
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      end.setDate(0); // Último día del mes anterior
    } else {
      // Últimos N días
      start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    onFiltersChange({
      ...filters,
      startDate: start,
      endDate: end,
    });
  };

  const handleDateChange = (field: 'start' | 'end', date: Date | undefined) => {
    if (!date) return;

    onFiltersChange({
      ...filters,
      [field === 'start' ? 'startDate' : 'endDate']: date,
    });
    setShowCalendar(null);
  };

  const hasActiveFilters = () => {
    return filters.category || filters.status || filters.customerId || filters.productId || filters.paymentMethod || filters.branchId || filters.posId;
  };

  return (
    <Card className="dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Rango de Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Popover open={showCalendar === 'start'} onOpenChange={(open) => setShowCalendar(open ? 'start' : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal dark:bg-slate-900/50 dark:border-slate-800/50', !filters.startDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-slate-900/90 dark:border-slate-800/50" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleDateChange('start', date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Popover open={showCalendar === 'end'} onOpenChange={(open) => setShowCalendar(open ? 'end' : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal dark:bg-slate-900/50 dark:border-slate-800/50', !filters.endDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-slate-900/90 dark:border-slate-800/50" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleDateChange('end', date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Rango Rápido</Label>
              <Select onValueChange={(value) => handleDatePreset(Number(value))}>
                <SelectTrigger className="dark:bg-slate-900/50 dark:border-slate-800/50">
                  <SelectValue placeholder="Seleccionar rango" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.label} value={String(preset.days)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={onApply} disabled={loading} className="flex-1 dark:bg-slate-900/50 dark:border-slate-800/50">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar
              </Button>
              {hasActiveFilters() && (
                <Button onClick={onReset} variant="outline" size="icon" disabled={loading} className="dark:bg-slate-900/50 dark:border-slate-800/50">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros Avanzados */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t dark:border-slate-800/50">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={filters.category ?? 'all'}
                  onValueChange={(value) => onFiltersChange({ ...filters, category: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="dark:bg-slate-900/50 dark:border-slate-800/50">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={filters.status ?? 'all'}
                  onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="dark:bg-slate-900/50 dark:border-slate-800/50">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="COMPLETED">Completado</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={filters.paymentMethod ?? 'all'}
                  onValueChange={(value) => onFiltersChange({ ...filters, paymentMethod: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="dark:bg-slate-900/50 dark:border-slate-800/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="CARD">Tarjeta</SelectItem>
                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    <SelectItem value="QR">QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select
                  value={filters.branchId ?? 'all'}
                  onValueChange={(value) => onFiltersChange({ ...filters, branchId: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="dark:bg-slate-900/50 dark:border-slate-800/50">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b === 'all' ? 'Todas' : b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>POS</Label>
                <Select
                  value={filters.posId ?? 'all'}
                  onValueChange={(value) => onFiltersChange({ ...filters, posId: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="dark:bg-slate-900/50 dark:border-slate-800/50">
                    <SelectValue placeholder="Todos los POS" />
                  </SelectTrigger>
                  <SelectContent>
                    {posNodes.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === 'all' ? 'Todos' : p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ID Cliente</Label>
                <Input
                  placeholder="Buscar por ID"
                  value={filters.customerId || ''}
                  onChange={(e) => onFiltersChange({ ...filters, customerId: e.target.value || undefined })}
                  className="dark:bg-slate-900/50 dark:border-slate-800/50 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label>ID Producto</Label>
                <Input
                  placeholder="Buscar por ID"
                  value={filters.productId || ''}
                  onChange={(e) => onFiltersChange({ ...filters, productId: e.target.value || undefined })}
                  className="dark:bg-slate-900/50 dark:border-slate-800/50 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
