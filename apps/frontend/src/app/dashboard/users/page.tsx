'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  User as UserIcon,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import { AdminApiService } from '@/lib/services/admin-api';
import { userService } from '@/lib/services/user-service';
import type { User as ServiceUser } from '@/lib/services/user-service';
import { PermissionGuard, PermissionProvider, usePermissions } from '@/components/ui/permission-guard';
import { cn } from '@/lib/utils';

const logger = createLogger('UsersPage');

const ROLES: { value: string; label: string; color: string }[] = [
  { value: 'ADMIN',    label: 'Administrador', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  { value: 'MANAGER',  label: 'Manager',        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { value: 'CASHIER',  label: 'Cajero',         color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'EMPLOYEE', label: 'Empleado',       color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'VIEWER',   label: 'Visualizador',   color: 'bg-muted text-muted-foreground border-border' },
];

function getRoleMeta(role: string) {
  return ROLES.find((r) => r.value === role) ?? ROLES[ROLES.length - 1];
}

function userInitials(user: ServiceUser) {
  const name = user.full_name || user.email || '';
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || '?';
}

interface UserFormData {
  email: string;
  full_name: string;
  phone: string;
  role: string;
  password: string;
  confirmPassword: string;
}

export default function UsersPage() {
  return (
    <PermissionProvider>
      <UsersPageContent />
    </PermissionProvider>
  );
}

function UsersPageContent() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ServiceUser | null>(null);
  const [userToToggle, setUserToToggle] = useState<ServiceUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '', full_name: '', phone: '', role: 'CASHIER', password: '', confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 6) errors.push('Al menos 6 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
    if (!/[0-9]/.test(password)) errors.push('Al menos un número');
    return errors;
  };

  const validateForm = (data: UserFormData, isEdit = false): Partial<UserFormData> => {
    const errors: Partial<UserFormData> = {};
    if (!data.full_name.trim() || data.full_name.trim().length < 2)
      errors.full_name = 'El nombre debe tener al menos 2 caracteres';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.email = 'Ingresa un email válido';
    if (!isEdit || data.password) {
      if (!data.password) errors.password = 'La contraseña es requerida';
      else {
        const pe = validatePassword(data.password);
        if (pe.length > 0) errors.password = pe[0];
      }
      if (data.password !== data.confirmPassword)
        errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    return errors;
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { users: fetched } = await userService.getUsers(1, 100);
      setUsers(fetched);
    } catch (err) {
      logger.error('Error fetching users:', err);
      setError('No se pudieron cargar los usuarios');
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: '', full_name: '', phone: '', role: 'CASHIER', password: '', confirmPassword: '' });
    setFormErrors({});
    setSelectedUser(null);
  };

  const handleCreate = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    try {
      setFormErrors({});
      await AdminApiService.createUser({ email: formData.email, password: formData.password, name: formData.full_name, role: formData.role });
      toast({ title: 'Usuario creado', description: 'El usuario fue agregado exitosamente.' });
      setIsCreateDialogOpen(false);
      resetForm();
      void fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al crear usuario', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    const errors = validateForm(formData, true);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    try {
      if (!selectedUser) return;
      await AdminApiService.updateUser(selectedUser.id, { name: formData.full_name, email: formData.email, role: formData.role });
      toast({ title: 'Usuario actualizado' });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      void fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al actualizar', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await AdminApiService.deleteUser(userToDelete.id);
      toast({ title: 'Usuario eliminado' });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      void fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleToggle = async () => {
    if (!userToToggle) return;
    try {
      const next = !userToToggle.isActive;
      await userService.toggleUserStatus(userToToggle.id, next);
      toast({ title: next ? 'Usuario activado' : 'Usuario desactivado' });
      setIsToggleStatusDialogOpen(false);
      setUserToToggle(null);
      void fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al cambiar estado', variant: 'destructive' });
    }
  };

  const openEdit = (user: ServiceUser) => {
    setSelectedUser(user);
    setFormData({ email: user.email, full_name: user.full_name || '', phone: user.phone || '', role: user.role || 'CASHIER', password: '', confirmPassword: '' });
    setIsEditDialogOpen(true);
  };

  useEffect(() => { void fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalActive = users.filter((u) => u.isActive).length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;

  // --- LOADING ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted/50" />
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive/60" />
        <div>
          <p className="font-semibold">Error al cargar usuarios</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={() => void fetchUsers()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
        </Button>
      </div>
    );
  }

  const UserFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-2">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-name' : 'create-name'}>Nombre completo</Label>
        <Input id={isEdit ? 'edit-name' : 'create-name'} value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Juan Pérez" className="focus-visible:ring-primary/50" />
        {formErrors.full_name && <p className="text-xs text-destructive">{formErrors.full_name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-email' : 'create-email'}>Email</Label>
        <Input id={isEdit ? 'edit-email' : 'create-email'} type="email" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={isEdit} placeholder="usuario@empresa.com" className="focus-visible:ring-primary/50" />
        {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+595 9XX XXX XXX" className="focus-visible:ring-primary/50" />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
            <SelectTrigger className="focus-visible:ring-primary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
        <Input type="password" value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder={isEdit ? 'Dejar vacío para mantener la actual' : 'Contraseña segura'}
          className="focus-visible:ring-primary/50" />
        {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
      </div>
      {(!isEdit || formData.password) && (
        <div className="space-y-2">
          <Label>Confirmar contraseña</Label>
          <Input type="password" value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Repite la contraseña" className="focus-visible:ring-primary/50" />
          {formErrors.confirmPassword && <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios del sistema</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {users.length} usuarios · {totalActive} activos · {totalAdmins} admins
          </p>
        </div>
        <PermissionGuard permission="users.create">
          <Dialog open={isCreateDialogOpen} onOpenChange={(o) => { setIsCreateDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="shrink-0 shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]" aria-labelledby="user-create-title">
              <DialogHeader>
                <DialogTitle id="user-create-title">Crear usuario</DialogTitle>
                <DialogDescription>Completa los datos para agregar un nuevo miembro al equipo.</DialogDescription>
              </DialogHeader>
              <UserFormFields />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={() => void handleCreate()}>Crear usuario</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 focus-visible:ring-primary/50"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44 focus-visible:ring-primary/50">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => void fetchUsers()} title="Actualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Users list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Sin usuarios</p>
          <p className="text-xs text-muted-foreground">
            {searchTerm || roleFilter !== 'all' ? 'Ajusta los filtros de búsqueda.' : 'Crea el primer usuario del sistema.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const role = getRoleMeta(user.role);
            return (
              <Card key={user.id} className="rounded-xl border-border/50 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                    {userInitials(user)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{user.full_name || user.email}</p>
                      <Badge className={cn('border text-xs', role.color)}>{role.label}</Badge>
                      <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                      {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(user.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <PermissionGuard permission="users.edit">
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setUserToToggle(user); setIsToggleStatusDialogOpen(true); }}>
                          <UserIcon className="mr-2 h-4 w-4" />
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </PermissionGuard>
                      <PermissionGuard permission="users.delete">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <PermissionGuard permission="users.edit">
        <Dialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="sm:max-w-[480px]" aria-labelledby="user-edit-title">
            <DialogHeader>
              <DialogTitle id="user-edit-title">Editar usuario</DialogTitle>
              <DialogDescription>Modifica los datos de {selectedUser?.full_name || selectedUser?.email}.</DialogDescription>
            </DialogHeader>
            <UserFormFields isEdit />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={() => void handleUpdate()}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
              <strong>{userToDelete?.full_name || userToDelete?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setUserToDelete(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.isActive ? '¿Desactivar usuario?' : '¿Activar usuario?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.isActive
                ? `"${userToToggle?.full_name || userToToggle?.email}" no podrá acceder al sistema.`
                : `"${userToToggle?.full_name || userToToggle?.email}" recuperará el acceso al sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsToggleStatusDialogOpen(false); setUserToToggle(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleToggle()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}