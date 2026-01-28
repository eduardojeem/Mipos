'use client';

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
    Filter,
    X,
    Calendar,
    DollarSign,
    Users as UsersIcon,
    Sparkles,
} from 'lucide-react';
import { OrganizationFilters } from '../hooks/useAdminFilters';

interface OrganizationsFiltersProps {
    filters: OrganizationFilters;
    onFiltersChange: (filters: Partial<OrganizationFilters>) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
    onApplyPreset?: (preset: string) => void;
}

export function OrganizationsFilters({
    filters,
    onFiltersChange,
    onClearFilters,
    hasActiveFilters,
    onApplyPreset,
}: OrganizationsFiltersProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const planOptions = [
        { value: 'FREE', label: 'Free' },
        { value: 'PRO', label: 'Pro' },
        { value: 'ENTERPRISE', label: 'Enterprise' },
    ];

    const statusOptions = [
        { value: 'ACTIVE', label: 'Activo' },
        { value: 'TRIAL', label: 'Prueba' },
        { value: 'SUSPENDED', label: 'Suspendido' },
        { value: 'CANCELLED', label: 'Cancelado' },
    ];

    const presets = [
        { id: 'high_value', label: 'Alto Valor', icon: DollarSign },
        { id: 'at_risk', label: 'En Riesgo', icon: Sparkles },
        { id: 'trial_ending', label: 'Prueba Terminando', icon: Calendar },
        { id: 'recent', label: 'Recientes (30d)', icon: Calendar },
    ];

    const togglePlan = (plan: string) => {
        const newPlans = filters.plan.includes(plan)
            ? filters.plan.filter(p => p !== plan)
            : [...filters.plan, plan];
        onFiltersChange({ plan: newPlans });
    };

    const toggleStatus = (status: string) => {
        const newStatuses = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        onFiltersChange({ status: newStatuses });
    };

    const activeFilterCount = [
        filters.plan.length > 0,
        filters.status.length > 0,
        filters.dateFrom,
        filters.dateTo,
        filters.revenueMin !== null,
        filters.revenueMax !== null,
        filters.memberCountMin !== null,
        filters.memberCountMax !== null,
    ].filter(Boolean).length;

    return (
        <div className="space-y-3">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
                {presets.map((preset) => {
                    const Icon = preset.icon;
                    return (
                        <Button
                            key={preset.id}
                            variant="outline"
                            size="sm"
                            onClick={() => onApplyPreset?.(preset.id)}
                            className="gap-2"
                        >
                            <Icon className="h-3 w-3" />
                            {preset.label}
                        </Button>
                    );
                })}
            </div>

            {/* Main Filter Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Filtros Avanzados
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-4" align="start">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">Filtros Avanzados</h4>
                                    {hasActiveFilters && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onClearFilters}
                                            className="h-auto p-1 text-xs"
                                        >
                                            Limpiar todo
                                        </Button>
                                    )}
                                </div>

                                {/* Plan Filter */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Plan de Suscripción</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {planOptions.map((plan) => (
                                            <Button
                                                key={plan.value}
                                                variant={filters.plan.includes(plan.value) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => togglePlan(plan.value)}
                                                className="h-8 text-xs"
                                            >
                                                {plan.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Estado</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {statusOptions.map((status) => (
                                            <Button
                                                key={status.value}
                                                variant={filters.status.includes(status.value) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => toggleStatus(status.value)}
                                                className="h-8 text-xs"
                                            >
                                                {status.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Rango de Fechas</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Desde</Label>
                                            <Input
                                                type="date"
                                                value={filters.dateFrom}
                                                onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Hasta</Label>
                                            <Input
                                                type="date"
                                                value={filters.dateTo}
                                                onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue Range */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Rango de Ingresos (MRR)</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Mínimo</Label>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={filters.revenueMin ?? ''}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        revenueMin: e.target.value ? parseFloat(e.target.value) : null,
                                                    })
                                                }
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Máximo</Label>
                                            <Input
                                                type="number"
                                                placeholder="999+"
                                                value={filters.revenueMax ?? ''}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        revenueMax: e.target.value ? parseFloat(e.target.value) : null,
                                                    })
                                                }
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Member Count Range */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Cantidad de Miembros</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Mínimo</Label>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={filters.memberCountMin ?? ''}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        memberCountMin: e.target.value ? parseInt(e.target.value) : null,
                                                    })
                                                }
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Máximo</Label>
                                            <Input
                                                type="number"
                                                placeholder="999+"
                                                value={filters.memberCountMax ?? ''}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        memberCountMax: e.target.value ? parseInt(e.target.value) : null,
                                                    })
                                                }
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="gap-2"
                        >
                            <X className="h-4 w-4" />
                            Limpiar Filtros
                        </Button>
                    )}
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2">
                        {filters.plan.map((plan) => (
                            <Badge key={plan} variant="secondary" className="gap-1">
                                Plan: {plan}
                                <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={() => togglePlan(plan)}
                                />
                            </Badge>
                        ))}
                        {filters.status.map((status) => (
                            <Badge key={status} variant="secondary" className="gap-1">
                                Estado: {status}
                                <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={() => toggleStatus(status)}
                                />
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
