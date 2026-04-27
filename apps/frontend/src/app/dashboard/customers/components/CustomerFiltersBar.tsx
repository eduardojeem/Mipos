import { useCallback } from 'react';
import { Filter as FilterIcon, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UseCustomerFiltersReturn } from '../hooks';

interface CustomerFiltersBarProps {
    filters: UseCustomerFiltersReturn;
    showFilters?: boolean;
    onToggleFilters?: () => void;
}

export function CustomerFiltersBar({
    filters,
    showFilters = true,
    onToggleFilters
}: CustomerFiltersBarProps) {
    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        filters.updateFilter('search', event.target.value);
    }, [filters]);

    const handleSearchClear = useCallback(() => {
        filters.updateFilter('search', '');
    }, [filters]);

    const handleStatusChange = useCallback((value: string) => {
        filters.updateFilter('status', value);
    }, [filters]);

    const handleTypeChange = useCallback((value: string) => {
        filters.updateFilter('type', value);
    }, [filters]);

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, email o codigo..."
                                value={filters.searchTerm}
                                onChange={handleSearchChange}
                                className="pl-10 pr-10"
                            />
                            {filters.searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                                    onClick={handleSearchClear}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {onToggleFilters && (
                            <Button
                                variant="outline"
                                onClick={onToggleFilters}
                                className="shrink-0"
                            >
                                <FilterIcon className="mr-2 h-4 w-4" />
                                Filtros
                                {filters.activeFiltersCount > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
                                    >
                                        {filters.activeFiltersCount}
                                    </Badge>
                                )}
                            </Button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="status-filter">Estado</Label>
                                <Select value={filters.filters.status} onValueChange={handleStatusChange}>
                                    <SelectTrigger id="status-filter">
                                        <SelectValue placeholder="Todos los estados" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="active">Activos</SelectItem>
                                        <SelectItem value="inactive">Inactivos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type-filter">Tipo de cliente</Label>
                                <Select value={filters.filters.type} onValueChange={handleTypeChange}>
                                    <SelectTrigger id="type-filter">
                                        <SelectValue placeholder="Todos los tipos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="regular">Regular</SelectItem>
                                        <SelectItem value="vip">VIP</SelectItem>
                                        <SelectItem value="wholesale">Mayorista</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ruc-filter">RUC</Label>
                                <Select value={filters.filters.hasRUC || 'all'} onValueChange={(value) => filters.updateFilter('hasRUC', value)}>
                                    <SelectTrigger id="ruc-filter">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="yes">Con RUC</SelectItem>
                                        <SelectItem value="no">Sin RUC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button
                                    variant="outline"
                                    onClick={filters.clearAll}
                                    disabled={filters.activeFiltersCount === 0}
                                    className="w-full"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Limpiar filtros
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
