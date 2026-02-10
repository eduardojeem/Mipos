'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Download } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';

// Custom Hooks and Types
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliersData';
import { useSupplierFilters } from './hooks/useSupplierFilters';
import type { SupplierWithStats } from '@/types/suppliers';

// Modular Components
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';
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
  const { user } = useAuth();
  const { toast } = useToast();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithStats | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Data Fetching
  const { data: suppliersResponse, isLoading } = useSuppliers({
    page: 1,
    limit: 100,
  });

  const suppliers = suppliersResponse?.suppliers || [];

  // Mutations
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Filters and sorting
  const {
    searchQuery,
    filterStatus,
    filterCategory,
    setSearchQuery,
    setFilterStatus,
    setFilterCategory,
    filteredSuppliers,
    stats,
    handleSort,
  } = useSupplierFilters(suppliers);

  // Handlers
  const handleCreate = useCallback(
    async (data: any) => {
      try {
        await createSupplierMutation.mutateAsync(data);
        setIsCreateDialogOpen(false);
        toast({
          title: 'Éxito',
          description: 'Proveedor creado correctamente',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo crear el proveedor',
          variant: 'destructive',
        });
      }
    },
    [createSupplierMutation, toast]
  );

  const handleEdit = useCallback(
    async (data: any) => {
      if (!selectedSupplier) return;
      try {
        await updateSupplierMutation.mutateAsync({
          id: selectedSupplier.id,
          data,
        });
        setIsEditDialogOpen(false);
        setSelectedSupplier(null);
        toast({
          title: 'Éxito',
          description: 'Proveedor actualizado correctamente',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el proveedor',
          variant: 'destructive',
        });
      }
    },
    [selectedSupplier, updateSupplierMutation, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedSupplier) return;
    try {
      await deleteSupplierMutation.mutateAsync(selectedSupplier.id);
      setIsDeleteDialogOpen(false);
      setSelectedSupplier(null);
      toast({
        title: 'Éxito',
        description: 'Proveedor eliminado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el proveedor',
        variant: 'destructive',
      });
    }
  }, [selectedSupplier, deleteSupplierMutation, toast]);

  const handleExport = useCallback(() => {
    exportSuppliersToCSV(filteredSuppliers);
    toast({
      title: 'Éxito',
      description: `Se exportaron ${filteredSuppliers.length} proveedores`,
    });
  }, [filteredSuppliers, toast]);

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
    <div className="space-y-6">
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
      <div className="flex items-center justify-between">
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
              disabled={filteredSuppliers.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
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

      {/* Search and Filters */}
      <SuppliersFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
        filterCategory={filterCategory}
        onFilterCategoryChange={setFilterCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Suppliers Table/Grid */}
      <SuppliersTable
        suppliers={filteredSuppliers}
        loading={isLoading}
        onSort={handleSort}
        onView={handleView}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

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
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              proveedor
              <strong> {selectedSupplier?.name}</strong> de la base de datos.
            </AlertDialogDescription>
            {selectedSupplier?._count?.purchases && selectedSupplier._count.purchases > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                <strong>Advertencia:</strong> Este proveedor tiene{' '}
                {selectedSupplier._count.purchases} órdenes de compra asociadas.
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={(selectedSupplier?._count?.purchases || 0) > 0}
            >
              Eliminar
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
