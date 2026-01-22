'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { validateSupplierFormData } from '@/lib/validation-schemas';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Icons
import { 
  Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, 
  Phone, Mail, MapPin, User, Calendar, Package, Building2, 
  Users, ShoppingCart, DollarSign, TrendingUp, Download,
  ArrowUpDown, List, Grid3X3, BarChart3, MessageSquare, 
  FileText, AlertTriangle, History, GitCompare, Target,
  Upload, Tags, Settings
} from 'lucide-react';
import { PermissionGuard, PermissionProvider, usePermissions } from '@/components/ui/permission-guard';

// Custom Hooks and Types
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliersData';
import { SupplierWithStats } from '@/types/suppliers';

// Modular Components
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';
import { SuppliersStats } from '@/components/suppliers/SuppliersStats';
import { SuppliersFilters } from '@/components/suppliers/SuppliersFilters';
import { SupplierViewDialog } from '@/components/suppliers/SupplierViewDialog';

export default function SuppliersPage() {
  return (
    <PermissionProvider>
      <SuppliersPageContent />
    </PermissionProvider>
  );
}

function SuppliersPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = usePermissions();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'totalPurchases' | 'totalOrders' | 'lastPurchase' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithStats | null>(null);

  // Data Fetching
  const { data: suppliersResponse, isLoading } = useSuppliers({ 
    search: searchQuery, 
    page: 1, 
    limit: 100 // Fetching more for client-side filtering/sorting for now
  });

  const suppliers = suppliersResponse?.suppliers || [];
  
  // Mutations
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Filter and Sort Logic
  const filteredSuppliers = useMemo(() => {
    let filtered = [...suppliers];

    // Apply filters
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(supplier => supplier._count?.purchases > 0);
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(supplier => !supplier._count?.purchases || supplier._count.purchases === 0);
      }
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(supplier => supplier.category === filterCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'totalPurchases':
          aValue = a.totalPurchases || 0;
          bValue = b.totalPurchases || 0;
          break;
        case 'totalOrders':
          aValue = a._count?.purchases || 0;
          bValue = b._count?.purchases || 0;
          break;
        case 'lastPurchase':
          aValue = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
          bValue = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [suppliers, filterStatus, filterCategory, sortBy, sortOrder]);

  // Handlers
  const handleSort = (field: string) => {
    setSortBy(field as any);
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleCreate = async (data: any) => {
    await createSupplierMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleEdit = async (data: any) => {
    if (!selectedSupplier) return;
    await updateSupplierMutation.mutateAsync({ id: selectedSupplier.id, data });
    setIsEditDialogOpen(false);
    setSelectedSupplier(null);
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    await deleteSupplierMutation.mutateAsync(selectedSupplier.id);
    setIsDeleteDialogOpen(false);
    setSelectedSupplier(null);
  };

  // Stats Calculation
  const stats = useMemo(() => ({
    totalSuppliers: suppliers.length,
    newThisMonth: suppliers.filter((s: SupplierWithStats) => {
      const createdThisMonth = new Date(s.createdAt).getMonth() === new Date().getMonth();
      return createdThisMonth;
    }).length,
    activeSuppliers: suppliers.filter((s: SupplierWithStats) => s._count?.purchases && s._count.purchases > 0).length,
    totalPurchases: suppliers.reduce((sum: number, s: SupplierWithStats) => sum + (s.totalPurchases || 0), 0),
    totalOrders: suppliers.reduce((sum: number, s: SupplierWithStats) => sum + (s._count?.purchases || 0), 0)
  }), [suppliers]);

  const exportToCSV = () => {
    const csvContent = [
      ['Nombre', 'Email', 'Teléfono', 'Dirección', 'Total Compras', 'Órdenes'],
      ...filteredSuppliers.map((supplier: SupplierWithStats) => [
        supplier.name,
        supplier.contactInfo.email || '',
        supplier.contactInfo.phone || '',
        supplier.contactInfo.address || '',
        supplier.totalPurchases?.toString() || '0',
        supplier._count?.purchases?.toString() || '0'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proveedores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
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
              onClick={exportToCSV}
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

      {/* Quick Access Navigation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Link href="/dashboard/suppliers/analytics">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold text-sm">Analíticas</h3>
              <p className="text-xs text-muted-foreground">Reportes y métricas</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/suppliers/communication">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold text-sm">Comunicación</h3>
              <p className="text-xs text-muted-foreground">Centro de mensajes</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/suppliers/contracts">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold text-sm">Contratos</h3>
              <p className="text-xs text-muted-foreground">Gestión de contratos</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/suppliers/alerts">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <h3 className="font-semibold text-sm">Alertas</h3>
              <p className="text-xs text-muted-foreground">Notificaciones</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/suppliers/price-history">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <History className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <h3 className="font-semibold text-sm">Historial Precios</h3>
              <p className="text-xs text-muted-foreground">Seguimiento precios</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/suppliers/comparison">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <GitCompare className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
              <h3 className="font-semibold text-sm">Comparación</h3>
              <p className="text-xs text-muted-foreground">Análisis comparativo</p>
            </CardContent>
          </Card>
        </Link>
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
        onFilterStatusChange={setFilterStatus}
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
        onView={(supplier) => {
          setSelectedSupplier(supplier);
          setIsViewDialogOpen(true);
        }}
        onEdit={(supplier) => {
          setSelectedSupplier(supplier);
          setIsEditDialogOpen(true);
        }}
        onDelete={(supplier) => {
          setSelectedSupplier(supplier);
          setIsDeleteDialogOpen(true);
        }}
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteDialogOpen(false);
          setSelectedSupplier(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor
              <strong> {selectedSupplier?.name}</strong> de la base de datos.
            </AlertDialogDescription>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <strong>Advertencia:</strong> Este proveedor tiene {selectedSupplier?._count?.purchases || 0} órdenes de compra asociadas.
            </div>
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
}
