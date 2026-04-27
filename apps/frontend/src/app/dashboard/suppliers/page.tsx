'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';

// Custom Hooks and Types
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, SuppliersQueryParams } from '@/hooks/useSuppliersData';
import type { SupplierWithStats, Supplier } from '@/types/suppliers';

// Modular Components
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';
import { SuppliersGrid } from '@/components/suppliers/SuppliersGrid'; // We will create this!
import { SuppliersStats } from '@/components/suppliers/SuppliersStats';
import { SuppliersFilters } from '@/components/suppliers/SuppliersFilters';
import { SupplierViewDialog } from '@/components/suppliers/SupplierViewDialog';

// Utils
import { exportSuppliersToCSV } from './utils/export';

export default function SuppliersPage() {
  return (
    <PermissionProvider>
      <SuppliersPageContent />
    </PermissionProvider>
  );
}

const SuppliersPageContent = memo(function SuppliersPageContent() {
  const router = useRouter();
  const { toast } = useToast();

  // URL / Query Params State
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SuppliersQueryParams['sortBy']>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithStats | null>(null);
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Server-Side Data Fetching
  const { data, isLoading } = useSuppliers({
    page,
    limit: 25,
    search: searchQuery,
    status: filterStatus,
    category: filterCategory,
    sortBy,
    sortOrder,
  });

  const suppliers = useMemo(() => data?.suppliers || [], [data?.suppliers]);
  const availableCategories = useMemo(() => {
    const uniq = new Set<string>();
    for (const s of suppliers) {
      const v = (s as any)?.category;
      if (typeof v === 'string' && v.trim()) uniq.add(v.trim());
    }
    if (filterCategory !== 'all' && typeof filterCategory === 'string' && filterCategory.trim()) {
      uniq.add(filterCategory.trim());
    }
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [suppliers, filterCategory]);
  const stats = data?.stats || {
    totalSuppliers: 0,
    newThisMonth: 0,
    activeSuppliers: 0,
    totalPurchases: 0,
    totalOrders: 0
  };
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  // Mutations
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Handlers
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field as SuppliersQueryParams['sortBy']);
      setSortOrder('asc');
    }
  }, [sortBy]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreate = useCallback(async (formData: any) => {
    try {
      await createSupplierMutation.mutateAsync(formData);
      setIsCreateDialogOpen(false);
    } catch {
      // Error is handled by hook's native toast
    }
  }, [createSupplierMutation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = useCallback(async (formData: any) => {
    if (!selectedSupplier) return;
    try {
      await updateSupplierMutation.mutateAsync({
        id: selectedSupplier.id,
        data: formData,
      });
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
    } catch {
      // Error is handled by hook
    }
  }, [selectedSupplier, updateSupplierMutation]);

  const handleDelete = useCallback(async () => {
    if (!selectedSupplier) return;
    try {
      await deleteSupplierMutation.mutateAsync(selectedSupplier.id);
      setIsDeleteDialogOpen(false);
      setSelectedSupplier(null);
    } catch {
      // Error is handled by hook
    }
  }, [selectedSupplier, deleteSupplierMutation]);

  const handleExport = useCallback(() => {
    if (suppliers.length === 0) return;
    
    exportSuppliersToCSV(suppliers as Supplier[]);
    toast({
      title: 'Éxito',
      description: `Se exportaron ${suppliers.length} proveedores. (Nota: Esto expota la página actual)`,
    });
  }, [suppliers, toast]);

  const handleView = useCallback((supplier: SupplierWithStats) => {
    setSelectedSupplier(supplier);
    setIsViewDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((supplier: SupplierWithStats) => {
    setSelectedSupplier(supplier);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((supplier: SupplierWithStats) => {
    setSelectedSupplier(supplier);
    setIsDeleteDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestiona la información de tus proveedores y sus condiciones comerciales
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <PermissionGuard permission="reports.export">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={suppliers.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Actuales
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="suppliers.create">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Statistics Cards */}
      <SuppliersStats
        totalSuppliers={stats.totalSuppliers}
        newThisMonth={stats.newThisMonth}
        activeSuppliers={stats.activeSuppliers}
        totalPurchases={stats.totalPurchases}
        totalOrders={stats.totalOrders}
      />

      {/* Modern Filter Bar */}
      <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-2 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full flex-1">
          <SuppliersFilters
            searchQuery={searchQuery}
            onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
            filterStatus={filterStatus}
            onFilterStatusChange={(v) => { setFilterStatus(v as 'all' | 'active' | 'inactive'); setPage(1); }}
            filterCategory={filterCategory}
            onFilterCategoryChange={(c) => { setFilterCategory(c); setPage(1); }}
            categories={availableCategories}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* View Toggle / Output */}
      <div className="animate-in fade-in-50 duration-500">
        {viewMode === 'list' ? (
          <SuppliersTable
            suppliers={suppliers}
            loading={isLoading}
            onSort={handleSort}
            onView={handleView}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ) : (
          <SuppliersGrid 
            suppliers={suppliers}
            loading={isLoading}
            onView={handleView}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {suppliers.length} de {pagination.total} resultados
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1 || isLoading}
            >
              Anterior
            </Button>
            <div className="flex items-center px-4 text-sm font-medium">
              Página {page} de {pagination.pages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
              disabled={page === pagination.pages || isLoading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <SupplierFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        initialData={null}
        isSubmitting={createSupplierMutation.isPending}
      />

      {/* Edit Dialog */}
      <SupplierFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedSupplier(null);
        }}
        onSubmit={handleEdit}
        initialData={selectedSupplier}
        isSubmitting={updateSupplierMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setSelectedSupplier(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar este proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              proveedor
              <strong> {selectedSupplier?.name}</strong> de la base de datos.
            </AlertDialogDescription>
            {selectedSupplier?._count?.purchases && selectedSupplier._count.purchases > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                <strong>Advertencia:</strong> Este proveedor tiene{' '}
                {selectedSupplier._count.purchases} órdenes de compra asociadas. No es seguro eliminarlo.
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={(selectedSupplier?._count?.purchases || 0) > 0 || deleteSupplierMutation.isPending}
            >
              {deleteSupplierMutation.isPending ? 'Eliminando...' : 'Eliminar Proveedor'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <SupplierViewDialog
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
      />
    </div>
  );
});
