'use client';

import { useState, useCallback, useMemo, Suspense, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, CheckCircle, XCircle, Users, TrendingUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';
import { useDebounce } from '@/hooks/useDebounce';

// Import optimized hooks - Phase 5
import {
    useCustomerSummary,
    useCustomerList,
    useCustomerAnalytics,
    useCustomerSearch,
    useCreateCustomer,
    useUpdateCustomer,
    useDeleteCustomer,
    useBulkCustomerOperation,
    customerKeys
} from '@/hooks/useOptimizedCustomers';

// Import our new modular hooks (legacy)
import {
    useCustomerFilters,
    useCustomerBulkActions
} from './hooks';

// Import our new modular components
import {
    CustomersTable,
    CustomerFormModal,
    CustomerFiltersBar,
    CustomerDetailsModal
} from './components';

import type { Customer } from '@/types';
import type { UICustomer } from '@/types/customer-page';

// Loading skeleton para Suspense
function CustomersLoadingSkeleton() {
    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-96 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
    );
}

/**
 * Customers Page - Refactored Modular Architecture
 * 
 * This page has been refactored from a 2,415-line monolith into a clean,
 * maintainable architecture using custom hooks and components.
 * 
 * OPTIMIZED: Wrapped with Suspense for better loading performance
 */
export default function CustomersPage() {
    return (
        <PermissionProvider>
            <Suspense fallback={<CustomersLoadingSkeleton />}>
                <CustomersPageContent />
            </Suspense>
        </PermissionProvider>
    );
}

// Memoize content to prevent unnecessary re-renders when parent re-renders
const CustomersPageContent = memo(function CustomersPageContent() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State management using our custom hooks
    const filters = useCustomerFilters();
    const debouncedSearch = useDebounce(filters.searchTerm, 300);

    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal state
    const [formModal, setFormModal] = useState<{
        open: boolean;
        customer?: UICustomer;
    }>({ open: false });

    const [detailsModal, setDetailsModal] = useState<{
        open: boolean;
        customer: UICustomer | null;
    }>({ open: false, customer: null });

    // Memoize filters object to prevent recreating on every render
    const customerFilters = useMemo(() => ({
        status: filters.filters.status,
        type: filters.filters.type,
        search: debouncedSearch,
        page,
        limit: 30,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
    }), [filters.filters.status, filters.filters.type, debouncedSearch, page, filters.sortBy, filters.sortOrder]);

    // Optimized data fetching - Phase 5
    const { data: summary, isLoading: summaryLoading } = useCustomerSummary();
    const { data: customerList, isLoading: listLoading, error: listError } = useCustomerList(customerFilters);
    const { data: analytics } = useCustomerAnalytics('30', { segmentation: true });

    // Mutations - Phase 5
    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer();
    const deleteCustomer = useDeleteCustomer();
    const bulkOperation = useBulkCustomerOperation();

    // Extract data from optimized responses
    const customers: UICustomer[] = customerList?.customers || [];
    const stats = summary || {
        total: 0, active: 0, inactive: 0, vip: 0, wholesale: 0, regular: 0,
        newThisMonth: 0, totalRevenue: 0, totalOrders: 0, avgOrderValue: 0,
        highValue: 0, frequent: 0, growthRate: 0, activeRate: 0
    };
    const loading = summaryLoading || listLoading;
    const pagination = customerList?.pagination;

    // Handlers - wrapped in useCallback for stable references
    const handleOpenForm = useCallback((customer?: UICustomer) => {
        setFormModal({ open: true, customer });
    }, []);

    const handleCloseForm = useCallback(() => {
        setFormModal({ open: false });
    }, []);

    const handleFormSuccess = useCallback(async () => {
        // Invalidate queries to refresh list
        await queryClient.invalidateQueries({ queryKey: customerKeys.all });
        setFormModal({ open: false });
    }, [queryClient]);

    const handleDelete = useCallback(async (id: string) => {
        const customer = customers.find(c => c.id === id);
        if (!customer) {
            toast({
                title: 'Error',
                description: 'No se pudo encontrar el cliente.',
                variant: 'destructive'
            });
            return;
        }

        if (!confirm(`¿Eliminar a "${customer.name}"?`)) return;

        deleteCustomer.mutate(id);
    }, [customers, deleteCustomer, toast]);

    const handleViewDetails = useCallback((customer: UICustomer) => {
        setDetailsModal({ open: true, customer });
    }, []);

    const handleCloseDetails = useCallback(() => {
        setDetailsModal({ open: false, customer: null });
    }, []);

    const handleBulkActivate = useCallback(async () => {
        if (selectedIds.length === 0) return;

        bulkOperation.mutate({
            action: 'activate',
            customerIds: selectedIds
        });
        setSelectedIds([]);
    }, [selectedIds, bulkOperation]);

    const handleBulkDeactivate = useCallback(async () => {
        if (selectedIds.length === 0) return;

        bulkOperation.mutate({
            action: 'deactivate',
            customerIds: selectedIds
        });
        setSelectedIds([]);
    }, [selectedIds, bulkOperation]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.length === 0) return;

        if (!confirm(`¿Eliminar ${selectedIds.length} clientes?`)) return;

        bulkOperation.mutate({
            action: 'delete',
            customerIds: selectedIds
        });
        setSelectedIds([]);
    }, [selectedIds, bulkOperation]);

    const handleExportSelected = useCallback(async () => {
        if (selectedIds.length === 0) {
            toast({
                title: 'Sin selección',
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
                // Download CSV
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
        } catch (error) {
            // Error handled by mutation
        }
    }, [selectedIds, bulkOperation, toast]);

    const handleSelectAll = useCallback((customers: UICustomer[]) => {
        const allIds = customers.map(c => c.id);
        setSelectedIds(prevIds =>
            prevIds.length === allIds.length ? [] : allIds
        );
    }, []);

    const handleSelectCustomer = useCallback((customerId: string) => {
        setSelectedIds(prevIds =>
            prevIds.includes(customerId)
                ? prevIds.filter(id => id !== customerId)
                : [...prevIds, customerId]
        );
    }, []);



    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">
                        Gestiona tu lista de clientes y sus datos
                    </p>
                </div>

                <PermissionGuard permission="customers.create">
                    <Button onClick={() => handleOpenForm()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Cliente
                    </Button>
                </PermissionGuard>
            </div>

            {/* Enhanced Stats Cards - Phase 5 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.activeRate}% activos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nuevos Este Mes</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.newThisMonth}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.growthRate}% crecimiento
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            ${stats.avgOrderValue} promedio por orden
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.vip}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.highValue} alto valor
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <CustomerFiltersBar
                filters={filters}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
            />

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {selectedIds.length} cliente{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-2">
                                <PermissionGuard permission="customers.export">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportSelected}
                                        disabled={bulkOperation.isPending}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Exportar
                                    </Button>
                                </PermissionGuard>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkActivate}
                                    disabled={bulkOperation.isPending}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Activar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkDeactivate}
                                    disabled={bulkOperation.isPending}
                                >
                                    <XCircle className="h-4 w-4 mr-2 text-orange-600" />
                                    Desactivar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    disabled={bulkOperation.isPending}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3 text-muted-foreground">Cargando clientes...</span>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
                            <p className="text-muted-foreground mb-4">
                                {filters.activeFiltersCount > 0
                                    ? 'Intenta ajustar los filtros de búsqueda'
                                    : 'Comienza agregando tu primer cliente'}
                            </p>
                            {filters.activeFiltersCount === 0 && (
                                <PermissionGuard permission="customers.create">
                                    <Button onClick={() => handleOpenForm()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar Cliente
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

            {/* Pagination */}
            {customers.length > 0 && pagination && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Mostrando {customers.length} de {pagination.total} clientes
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={!pagination.hasPrev || loading}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Página {pagination.page} de {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={!pagination.hasNext || loading}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <CustomerFormModal
                open={formModal.open}
                customer={formModal.customer}
                onClose={handleCloseForm}
                onSuccess={handleFormSuccess}
            />

            {/* Details Modal */}
            <CustomerDetailsModal
                open={detailsModal.open}
                customer={detailsModal.customer}
                onOpenChange={handleCloseDetails}
            />
        </div>
    );
});
