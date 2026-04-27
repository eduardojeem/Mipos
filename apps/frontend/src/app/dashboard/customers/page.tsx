'use client';

import { memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, DollarSign, Download, Plus, Sparkles, Trash2, TrendingUp, Users, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import {
    type CustomerSummary,
    useBulkCustomerOperation,
    useCustomerList,
    useCustomerSummary,
    useDeleteCustomer
} from '@/hooks/useOptimizedCustomers';
import type { UICustomer } from '@/types/customer-page';
import {
    CustomerDetailsModal,
    CustomerFiltersBar,
    CustomerFormModal,
    CustomersTable
} from './components';
import { useCustomerFilters } from './hooks';

const EMPTY_SUMMARY: CustomerSummary = {
    total: 0,
    active: 0,
    inactive: 0,
    vip: 0,
    wholesale: 0,
    regular: 0,
    newThisMonth: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    highValue: 0,
    frequent: 0,
    growthRate: 0,
    activeRate: 0,
    generatedAt: ''
};

function CustomersLoadingSkeleton() {
    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-2">
                    <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-96 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-32 animate-pulse rounded-lg bg-muted" />
                ))}
            </div>
            <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </div>
    );
}

export default function CustomersPage() {
    return (
        <PermissionProvider>
            <PermissionGuard permission="customers.view">
                <Suspense fallback={<CustomersLoadingSkeleton />}>
                    <CustomersPageContent />
                </Suspense>
            </PermissionGuard>
        </PermissionProvider>
    );
}

const CustomersPageContent = memo(function CustomersPageContent() {
    const { toast } = useToast();
    const organizationId = useCurrentOrganizationId();
    const formatCurrency = useCurrencyFormatter();

    const filters = useCustomerFilters();
    const debouncedSearch = useDebounce(filters.searchTerm, 300);

    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [formModal, setFormModal] = useState<{ open: boolean; customer?: UICustomer }>({ open: false });
    const [detailsModal, setDetailsModal] = useState<{ open: boolean; customer: UICustomer | null }>({
        open: false,
        customer: null
    });

    const customerFilters = useMemo(
        () => ({
            status: filters.filters.status,
            type: filters.filters.type,
            hasRUC: filters.filters.hasRUC,
            search: debouncedSearch,
            page,
            limit: 30,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
        }),
        [
            debouncedSearch,
            filters.filters.status,
            filters.filters.type,
            filters.filters.hasRUC,
            filters.sortBy,
            filters.sortOrder,
            page
        ]
    );

    const {
        data: summary,
        isLoading: summaryLoading,
        error: summaryError,
        refetch: refetchSummary
    } = useCustomerSummary();
    const {
        data: customerList,
        isLoading: listLoading,
        error: listError,
        refetch: refetchList
    } = useCustomerList(customerFilters);

    const deleteCustomer = useDeleteCustomer();
    const bulkOperation = useBulkCustomerOperation();

    const customers = useMemo(() => customerList?.customers ?? [], [customerList]);
    const pagination = customerList?.pagination;
    const stats = summary ?? EMPTY_SUMMARY;
    const loading = Boolean(organizationId) && (summaryLoading || listLoading);
    const error = summaryError || listError;

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters.filters.status, filters.filters.type, filters.filters.hasRUC]);

    useEffect(() => {
        setSelectedIds((previous) => previous.filter((id) => customers.some((customer) => customer.id === id)));
    }, [customers]);

    const handleOpenForm = useCallback((customer?: UICustomer) => {
        setFormModal({ open: true, customer });
    }, []);

    const handleCloseForm = useCallback(() => {
        setFormModal({ open: false });
    }, []);

    const handleFormSuccess = useCallback(() => {
        setSelectedIds([]);
        setFormModal({ open: false });
    }, []);

    const handleDelete = useCallback((id: string) => {
        const customer = customers.find((entry) => entry.id === id);
        if (!customer) {
            toast({
                title: 'Error',
                description: 'No se pudo encontrar el cliente.',
                variant: 'destructive'
            });
            return;
        }

        if (!confirm(`Eliminar a "${customer.name}"?`)) {
            return;
        }

        deleteCustomer.mutate(id);
    }, [customers, deleteCustomer, toast]);

    const handleViewDetails = useCallback((customer: UICustomer) => {
        setDetailsModal({ open: true, customer });
    }, []);

    const handleCloseDetails = useCallback(() => {
        setDetailsModal({ open: false, customer: null });
    }, []);

    const handleBulkActivate = useCallback(() => {
        if (selectedIds.length === 0) {
            return;
        }

        bulkOperation.mutate({
            action: 'activate',
            customerIds: selectedIds
        });
        setSelectedIds([]);
    }, [bulkOperation, selectedIds]);

    const handleBulkDeactivate = useCallback(() => {
        if (selectedIds.length === 0) {
            return;
        }

        bulkOperation.mutate({
            action: 'deactivate',
            customerIds: selectedIds
        });
        setSelectedIds([]);
    }, [bulkOperation, selectedIds]);

    const handleBulkDelete = useCallback(() => {
        if (selectedIds.length === 0) {
            return;
        }

        if (!confirm(`Eliminar ${selectedIds.length} clientes?`)) {
            return;
        }

        bulkOperation.mutate({
            action: 'delete',
            customerIds: selectedIds
        });
        setSelectedIds([]);
    }, [bulkOperation, selectedIds]);

    const handleExportSelected = useCallback(async () => {
        if (selectedIds.length === 0) {
            toast({
                title: 'Sin seleccion',
                description: 'Selecciona al menos un cliente para exportar.',
                variant: 'destructive'
            });
            return;
        }

        try {
            const result = await bulkOperation.mutateAsync({
                action: 'export',
                customerIds: selectedIds
            });

            if (result.success && result.data.csvContent) {
                const blob = new Blob([result.data.csvContent], {
                    type: result.data.contentType || 'text/csv;charset=utf-8;'
                });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);

                link.setAttribute('href', url);
                link.setAttribute('download', result.data.filename || 'customers_export.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            setSelectedIds([]);
        } catch {
            // The mutation already shows a toast.
        }
    }, [bulkOperation, selectedIds, toast]);

    const handleSelectAll = useCallback((visibleCustomers: UICustomer[]) => {
        const visibleIds = visibleCustomers.map((customer) => customer.id);

        setSelectedIds((previousIds) => {
            const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => previousIds.includes(id));
            return allVisibleSelected ? previousIds.filter((id) => !visibleIds.includes(id)) : visibleIds;
        });
    }, []);

    const handleSelectCustomer = useCallback((customerId: string) => {
        setSelectedIds((previousIds) =>
            previousIds.includes(customerId)
                ? previousIds.filter((id) => id !== customerId)
                : [...previousIds, customerId]
        );
    }, []);

    const handleRetry = useCallback(async () => {
        await Promise.all([refetchSummary(), refetchList()]);
    }, [refetchList, refetchSummary]);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">
                        Gestiona tu base de clientes con datos reales y operaciones seguras por organizacion.
                    </p>
                </div>

                <PermissionGuard permission="customers.create">
                    <Button onClick={() => handleOpenForm()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo cliente
                    </Button>
                </PermissionGuard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total clientes</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.activeRate.toFixed(1)}% activos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nuevos 30 dias</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.newThisMonth.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}% vs mes anterior
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos atribuidos</CardTitle>
                        <DollarSign className="h-4 w-4 text-violet-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(stats.avgOrderValue)} promedio por orden
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
                        <Sparkles className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.vip.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.highValue.toLocaleString()} de alto valor
                        </p>
                    </CardContent>
                </Card>
            </div>

            <CustomerFiltersBar
                filters={filters}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((value) => !value)}
            />

            {selectedIds.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {selectedIds.length} cliente{selectedIds.length !== 1 ? 's' : ''} seleccionado
                                {selectedIds.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-2">
                                <PermissionGuard permission="customers.export">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportSelected}
                                        disabled={bulkOperation.isPending}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar
                                    </Button>
                                </PermissionGuard>
                                <PermissionGuard permission="customers.edit">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkActivate}
                                        disabled={bulkOperation.isPending}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                        Activar
                                    </Button>
                                </PermissionGuard>
                                <PermissionGuard permission="customers.edit">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkDeactivate}
                                        disabled={bulkOperation.isPending}
                                    >
                                        <XCircle className="mr-2 h-4 w-4 text-orange-600" />
                                        Desactivar
                                    </Button>
                                </PermissionGuard>
                                <PermissionGuard permission="customers.delete">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        disabled={bulkOperation.isPending}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                </PermissionGuard>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    {!organizationId ? (
                        <div className="py-12 text-center">
                            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-semibold">Sin organizacion seleccionada</h3>
                            <p className="text-muted-foreground">
                                Selecciona una organizacion para ver y gestionar clientes.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <Users className="mx-auto mb-4 h-12 w-12 text-destructive/70" />
                            <h3 className="mb-2 text-lg font-semibold">No se pudo cargar la seccion</h3>
                            <p className="mx-auto mb-4 max-w-xl text-sm text-muted-foreground">
                                {error instanceof Error ? error.message : 'Ocurrio un error inesperado al cargar clientes.'}
                            </p>
                            <Button variant="outline" onClick={handleRetry}>
                                Reintentar
                            </Button>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                            <span className="ml-3 text-muted-foreground">Cargando clientes...</span>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-semibold">No se encontraron clientes</h3>
                            <p className="mb-4 text-muted-foreground">
                                {filters.activeFiltersCount > 0
                                    ? 'Intenta ajustar los filtros de busqueda.'
                                    : 'Comienza agregando tu primer cliente.'}
                            </p>
                            {filters.activeFiltersCount === 0 && (
                                <PermissionGuard permission="customers.create">
                                    <Button onClick={() => handleOpenForm()}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Agregar cliente
                                    </Button>
                                </PermissionGuard>
                            )}
                        </div>
                    ) : (
                        <CustomersTable
                            customers={customers}
                            selectedIds={selectedIds}
                            sortBy={filters.sortBy}
                            sortOrder={filters.sortOrder}
                            onSort={filters.toggleSort}
                            onSelectCustomer={handleSelectCustomer}
                            onSelectAll={handleSelectAll}
                            onEdit={handleOpenForm}
                            onDelete={handleDelete}
                            onViewDetails={handleViewDetails}
                        />
                    )}
                </CardContent>
            </Card>

            {customers.length > 0 && pagination && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Mostrando {customers.length} de {pagination.total} clientes
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((current) => current - 1)}
                            disabled={!pagination.hasPrev || loading}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Pagina {pagination.page} de {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={!pagination.hasNext || loading}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}

            <CustomerFormModal
                open={formModal.open}
                customer={formModal.customer}
                onClose={handleCloseForm}
                onSuccess={handleFormSuccess}
            />

            <CustomerDetailsModal
                open={detailsModal.open}
                customer={detailsModal.customer}
                onOpenChange={handleCloseDetails}
            />
        </div>
    );
});
