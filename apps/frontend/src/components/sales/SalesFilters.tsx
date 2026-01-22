import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, X, ChevronDown, ChevronUp, Calendar, DollarSign, Tag, Users } from 'lucide-react';
import type { SalesFilters as SalesFiltersType } from '@/hooks/useSalesFilters';
import type { Customer } from '@/types';
import { cn } from '@/lib/utils';

interface SalesFiltersProps {
    filters: SalesFiltersType;
    onFilterChange: <K extends keyof SalesFiltersType>(key: K, value: SalesFiltersType[K]) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
    customers?: Customer[];
    className?: string;
}

export const SalesFiltersComponent = memo(function SalesFilters({
    filters,
    onFilterChange,
    onClearFilters,
    hasActiveFilters,
    customers = [],
    className,
}: SalesFiltersProps) {
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    const quickFilters = [
        { value: 'today', label: 'Hoy', icon: Calendar },
        { value: 'week', label: 'Esta Semana', icon: Calendar },
        { value: 'month', label: 'Este Mes', icon: Calendar },
        { value: 'high-value', label: 'Alto Valor', icon: DollarSign },
    ];

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                        {hasActiveFilters && (
                            <Badge variant="secondary" className="ml-2">
                                Activos
                            </Badge>
                        )}
                    </CardTitle>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="h-8"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Limpiar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search */}
                <div className="space-y-2">
                    <Label htmlFor="search" className="text-sm font-medium">
                        Búsqueda
                    </Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search"
                            placeholder="Buscar por ID, cliente, email..."
                            value={filters.searchQuery}
                            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
                            className="pl-9"
                            aria-label="Buscar ventas"
                        />
                    </div>
                </div>

                {/* Quick Filters */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Filtros Rápidos</Label>
                    <div className="flex flex-wrap gap-2">
                        {quickFilters.map((qf) => {
                            const Icon = qf.icon;
                            const isActive = filters.quickFilter === qf.value;
                            return (
                                <Button
                                    key={qf.value}
                                    variant={isActive ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onFilterChange('quickFilter', isActive ? '' : qf.value)}
                                    className="h-8"
                                >
                                    <Icon className="h-3 w-3 mr-1" />
                                    {qf.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Basic Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer */}
                    <div className="space-y-2">
                        <Label htmlFor="customer" className="text-sm font-medium flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Cliente
                        </Label>
                        <Select
                            value={filters.selectedCustomer || '__all__'}
                            onValueChange={(value) => onFilterChange('selectedCustomer', value)}
                        >
                            <SelectTrigger id="customer">
                                <SelectValue placeholder="Todos los clientes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todos los clientes</SelectItem>
                                {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label htmlFor="payment-method" className="text-sm font-medium">
                            Método de Pago
                        </Label>
                        <Select
                            value={filters.selectedPaymentMethod || '__all__'}
                            onValueChange={(value) => onFilterChange('selectedPaymentMethod', value)}
                        >
                            <SelectTrigger id="payment-method">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todos</SelectItem>
                                <SelectItem value="CASH">Efectivo</SelectItem>
                                <SelectItem value="CARD">Tarjeta</SelectItem>
                                <SelectItem value="TRANSFER">Transferencia</SelectItem>
                                <SelectItem value="OTHER">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium">
                            Estado
                        </Label>
                        <Select
                            value={filters.selectedStatus || '__all__'}
                            onValueChange={(value) => onFilterChange('selectedStatus', value)}
                        >
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todos</SelectItem>
                                <SelectItem value="COMPLETED">Completada</SelectItem>
                                <SelectItem value="PENDING">Pendiente</SelectItem>
                                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sale Type */}
                    <div className="space-y-2">
                        <Label htmlFor="sale-type" className="text-sm font-medium">
                            Tipo de Venta
                        </Label>
                        <Select
                            value={filters.selectedSaleType || '__all__'}
                            onValueChange={(value) => onFilterChange('selectedSaleType', value)}
                        >
                            <SelectTrigger id="sale-type">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todos</SelectItem>
                                <SelectItem value="RETAIL">Minorista</SelectItem>
                                <SelectItem value="WHOLESALE">Mayorista</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Advanced Filters */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="text-sm font-medium">Filtros Avanzados</span>
                            {showAdvanced ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date-from" className="text-sm font-medium">
                                    Desde
                                </Label>
                                <Input
                                    id="date-from"
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date-to" className="text-sm font-medium">
                                    Hasta
                                </Label>
                                <Input
                                    id="date-to"
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => onFilterChange('dateTo', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Amount Range */}
                        <div className="space-y-2">
                            <Label htmlFor="amount-range" className="text-sm font-medium">
                                Rango de Monto
                            </Label>
                            <Input
                                id="amount-range"
                                placeholder="Ej: 1000-5000 o 1000+"
                                value={filters.amountRange}
                                onChange={(e) => onFilterChange('amountRange', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Formato: min-max o min+
                            </p>
                        </div>

                        {/* Discount Range */}
                        <div className="space-y-2">
                            <Label htmlFor="discount-range" className="text-sm font-medium">
                                Rango de Descuento
                            </Label>
                            <Input
                                id="discount-range"
                                placeholder="Ej: 100-500 o 100+"
                                value={filters.discountRange}
                                onChange={(e) => onFilterChange('discountRange', e.target.value)}
                            />
                        </div>

                        {/* Item Count Range */}
                        <div className="space-y-2">
                            <Label htmlFor="item-count-range" className="text-sm font-medium">
                                Cantidad de Items
                            </Label>
                            <Input
                                id="item-count-range"
                                placeholder="Ej: 1-5 o 5+"
                                value={filters.itemCountRange}
                                onChange={(e) => onFilterChange('itemCountRange', e.target.value)}
                            />
                        </div>

                        {/* Coupon Filters */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="has-coupon" className="text-sm font-medium flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    Con Cupón
                                </Label>
                                <Select
                                    value={filters.hasCoupon}
                                    onValueChange={(value: 'all' | 'yes' | 'no') => onFilterChange('hasCoupon', value)}
                                >
                                    <SelectTrigger id="has-coupon">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="yes">Sí</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="coupon-code" className="text-sm font-medium">
                                    Código de Cupón
                                </Label>
                                <Input
                                    id="coupon-code"
                                    placeholder="Buscar cupón..."
                                    value={filters.couponCode}
                                    onChange={(e) => onFilterChange('couponCode', e.target.value)}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
});

// Need to import React for useState
import * as React from 'react';

export const SalesFilters = SalesFiltersComponent;
