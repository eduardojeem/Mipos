'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Search,
  RefreshCw,
  Crown,
  Mail,
  Calendar,
  Clock,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  UserCheck,
  UserX,
  Circle,
  MoreHorizontal
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { exportCSV, exportExcel } from '@/lib/export-utils';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { useUsers, AdminUser } from '../hooks/useUsers';
import { useUserStats } from '../hooks/useUserStats';
import { toast } from '@/lib/toast';
import { useDebounce } from 'use-debounce';
import { ROLE_LABELS, ROLE_BADGE_CLASSES, normalizeRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [singleDeleteUser, setSingleDeleteUser] = useState<AdminUser | null>(null);
  const pageSize = 20; // Paginación real

  // Use the custom hook for data fetching with pagination
  const {
    users,
    loading,
    refresh,
    totalCount,
    bulkUpdateUsers,
    bulkDeleteUsers,
    deleteUser,
    activateUser,
    deactivateUser,
    updating
  } = useUsers({
    filters: { search: debouncedSearch },
    sortBy: 'created_at',
    sortOrder: 'desc',
    pageSize,
    page: currentPage,
  });

  // Hook para estadísticas REALES
  const { stats, refresh: refreshStats } = useUserStats();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), refreshStats()]);
      toast.success('Usuarios actualizados');
    } catch (error) {
      toast.error('Error al actualizar usuarios');
    } finally {
      setRefreshing(false);
    }
  };

  // Paginación
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Reset a página 1 cuando cambia la búsqueda
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;
    const normalized = normalizeRole(role);
    const label = ROLE_LABELS[normalized] ?? role;
    const colorClass = ROLE_BADGE_CLASSES[normalized] ?? 'bg-slate-100 text-slate-700 border-slate-300';
    return (
      <Badge variant="outline" className={`text-xs ${colorClass}`}>
        {label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u: AdminUser) => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await bulkDeleteUsers(selectedUsers);
      setSelectedUsers([]);
    } catch {
      // Error handled in hook
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteUser) return;
    try {
      await deleteUser(singleDeleteUser.id);
      setSelectedUsers((prev) => prev.filter((id) => id !== singleDeleteUser.id));
    } catch {
      // Error handled in hook
    } finally {
      setSingleDeleteUser(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }
    } catch {
      // Error handled in hook
    }
  };

  const handleBulkStatusChange = async (active: boolean) => {
    if (!selectedUsers.length) return;
    try {
      await bulkUpdateUsers(selectedUsers, { is_active: active });
      setSelectedUsers([]);
    } catch (error) {
      // Error handled in hook
    }
  };


  const handleExportCSV = async () => {
    try {
      if (!users || users.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const dataToExport = users.map((user: AdminUser) => ({
        ID: user.id,
        Nombre: user.full_name || 'Sin nombre',
        Email: user.email,
        Rol: user.role,
        Organización: user.organization?.name || 'N/A',
        'Fecha de registro': formatDate(user.created_at),
        'Último acceso': formatDate(user.last_sign_in_at),
        Estado: user.is_active ? 'Activo' : 'Inactivo'
      }));
      await exportCSV(dataToExport as Record<string, unknown>[], 'usuarios_pos');
      toast.success(`CSV exportado (${users.length} de ${totalCount} usuarios — solo página actual)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!users || users.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const dataToExport = users.map((user: AdminUser) => ({
        ID: user.id,
        Nombre: user.full_name || 'Sin nombre',
        Email: user.email,
        Rol: user.role,
        Organización: user.organization?.name || 'N/A',
        'Fecha de registro': formatDate(user.created_at),
        'Último acceso': formatDate(user.last_sign_in_at),
        Estado: user.is_active ? 'Activo' : 'Inactivo'
      }));
      await exportExcel(dataToExport as Record<string, unknown>[], 'usuarios_pos', 'Usuarios');
      toast.success(`Excel exportado (${users.length} de ${totalCount} usuarios — solo página actual)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar Excel');
    }
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Users className="h-3.5 w-3.5" />
              <span className="tracking-wide">Gestión de Cuentas</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Gestión de Usuarios</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Todos los usuarios registrados en el sistema SaaS de MITIENDA.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-4 py-2 text-sm bg-background/50 border-border/50 text-foreground shadow-sm">
              <Users className="h-4 w-4 mr-2" />
              {stats.total} usuarios
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl glass-card hover-lift hover-glow border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-300">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Total de Usuarios</div>
              <div className="rounded-xl bg-background/40 p-2.5 border border-border/40 shadow-sm backdrop-blur-sm text-slate-500">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl glass-card hover-lift hover-glow border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-300">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Con Organizaciones</div>
              <div className="rounded-xl bg-background/40 p-2.5 border border-border/40 shadow-sm backdrop-blur-sm text-emerald-500">
                <CheckCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">{stats.withOrgs}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl glass-card hover-lift hover-glow border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-300">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Sin Organizaciones</div>
              <div className="rounded-xl bg-background/40 p-2.5 border border-border/40 shadow-sm backdrop-blur-sm text-amber-500">
                <XCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">{stats.withoutOrgs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table Card */}
        {/* Main Table Card */}
        <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card">
          <CardHeader className="flex flex-col gap-4 border-b border-border/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Lista de Usuarios</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-muted-foreground">
                Gestiona y visualiza todos los usuarios del sistema
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-64 border-border/50 bg-background/40 backdrop-blur-sm"
                />
              </div>
              <Button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                variant="outline"
                className="bg-background/50 border-border/50 hover:bg-muted/50 transition-colors h-10 gap-2"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Actualizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Actualizar</span>
                  </>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-background/50 border-border/50 hover:bg-muted/50 transition-colors h-10 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-border/50 glass-card">
                  <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer focus:bg-muted/60">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    Exportar a CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer focus:bg-muted/60">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />
                    Exportar a Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Cargando usuarios...
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Por favor espera un momento
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="w-[50px] pl-6">
                        <Checkbox
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Rol
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Organizaciones
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Creado
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Último acceso
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Circle className="h-4 w-4" />
                          Estado
                        </div>
                      </TableHead>
                      <TableHead className="w-[60px] text-right font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        className={cn(
                          'border-b border-border/50 transition-colors hover:bg-muted/40',
                          selectedUsers.includes(user.id) ? 'bg-primary/5 hover:bg-primary/10' : ''
                        )}
                      >
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleSelectUser(user.id)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-sm">{user.email}</TableCell>
                        <TableCell className="text-sm text-foreground">{user.full_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'SUPER_ADMIN' && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            {getRoleBadge(user.role)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.organization?.name ? (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 font-semibold text-xs">
                              {user.organization.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 text-xs italic">Individual / Sin Org</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground/85">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground/85">
                          {formatDate(user.last_sign_in_at)}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 gap-1.5 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-slate-500/20 gap-1.5 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={updating} className="hover:bg-muted/60">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 border-border/50 glass-card">
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.is_active ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2 text-amber-500" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2 text-emerald-500" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-700"
                                onClick={() => setSingleDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                            <div>
                              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                {search ? 'No se encontraron usuarios' : 'No hay usuarios'}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {search ? 'Intenta con otros términos de búsqueda' : 'Los usuarios aparecerán aquí cuando se registren'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && !loading && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages} · Mostrando {users.length} de {totalCount} usuarios
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={!hasPrevPage || loading}
                    className="gap-2 h-8 bg-background/50 border-border/50 hover:bg-muted/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!hasNextPage || loading}
                    className="gap-2 h-8 bg-background/50 border-border/50 hover:bg-muted/50"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Bulk Actions Floating Bar */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-slate-950/90 dark:bg-slate-900/90 backdrop-blur-md text-white shadow-2xl border-border/40 h-16 flex items-center px-6 gap-6 rounded-2xl min-w-[500px]">
              <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-sm">
                  {selectedUsers.length}
                </div>
                <span className="font-medium text-slate-300 text-sm">seleccionados</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 gap-2 h-10 px-4"
                  onClick={() => handleBulkStatusChange(true)}
                  disabled={updating}
                >
                  <UserCheck className="h-4 w-4" />
                  Activar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 gap-2 h-10 px-4"
                  onClick={() => handleBulkStatusChange(false)}
                  disabled={updating}
                >
                  <UserX className="h-4 w-4" />
                  Desactivar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 gap-2 h-10 px-4"
                  onClick={handleBulkDelete}
                  disabled={updating}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-slate-400 hover:text-white"
                onClick={() => setSelectedUsers([])}
              >
                Cancelar
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-border/50 glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente y no se puede deshacer. Los usuarios seleccionados serán eliminados del sistema junto con todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating} className="border-border/50 bg-background/50 hover:bg-muted/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={updating}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(singleDeleteUser)} onOpenChange={(open) => { if (!open) setSingleDeleteUser(null); }}>
        <AlertDialogContent className="border-border/50 glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la cuenta de{' '}
              <strong>{singleDeleteUser?.full_name || singleDeleteUser?.email}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating} className="border-border/50 bg-background/50 hover:bg-muted/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSingleDelete}
              disabled={updating}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminGuard>
  );
}
