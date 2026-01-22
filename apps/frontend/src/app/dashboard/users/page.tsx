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
  UserCheck,
  UserX,
  MoreVertical,
  User as UserIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AdminApiService } from '@/lib/services/admin-api';
import { userService } from '@/lib/services/user-service';
import type { User as ServiceUser } from '@/lib/services/user-service';
import { PermissionGuard, PermissionProvider, usePermissions } from '@/components/ui/permission-guard';

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ServiceUser | null>(null);
  const [userToToggle, setUserToToggle] = useState<ServiceUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    phone: '',
    role: 'CASHIER',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  // Password validation helper
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Debe contener al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Debe contener al menos una minúscula');
    if (!/[0-9]/.test(password)) errors.push('Debe contener al menos un número');
    return errors;
  };

  // Form validation
  const validateForm = (data: UserFormData, isEdit: boolean = false): Partial<UserFormData> => {
    const errors: Partial<UserFormData> = {};

    // Name validation
    if (!data.full_name.trim()) {
      errors.full_name = 'El nombre es requerido';
    } else if (data.full_name.trim().length < 2) {
      errors.full_name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!emailRegex.test(data.email)) {
      errors.email = 'Ingrese un email válido';
    }

    // Password validation (only for create or when password is provided in edit)
    if (!isEdit || data.password) {
      if (!data.password) {
        errors.password = 'La contraseña es requerida';
      } else {
        const passwordErrors = validatePassword(data.password);
        if (passwordErrors.length > 0) {
          errors.password = passwordErrors[0];
        }
      }

      // Confirm password validation
      if (data.password !== data.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    return errors;
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { users: fetchedUsers } = await userService.getUsers(1, 50);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMessage = 'No se pudieron cargar los usuarios desde la API';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create user
  const handleCreateUser = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormErrors({});
      const userData = {
        email: formData.email,
        password: formData.password,
        name: formData.full_name,
        role: formData.role,
      };

      await AdminApiService.createUser(userData);

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear usuario",
        variant: "destructive",
      });
    }
  };

  // Handle update user
  const handleUpdateUser = async () => {
    const errors = validateForm(formData, true);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!selectedUser) return;
      const updateData: any = {
        name: formData.full_name,
        email: formData.email,
        role: formData.role,
        // password opcional si se modifica
      };

      await AdminApiService.updateUser(selectedUser.id, updateData);

      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar usuario",
        variant: "destructive",
      });
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      if (!userToDelete) return;
      await AdminApiService.deleteUser(userToDelete.id);
      toast({ title: 'Usuario eliminado', description: 'El usuario ha sido eliminado' });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al eliminar usuario',
        variant: 'destructive',
      });
    }
  };



  // Open delete dialog
  const openDeleteDialog = (user: ServiceUser) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle toggle user status
  const handleToggleUserStatus = async () => {
    if (!userToToggle) return;

    try {
      const desiredActive = !userToToggle.isActive;
      await userService.toggleUserStatus(userToToggle.id, desiredActive);

      const action = desiredActive ? 'activado' : 'desactivado';
      toast({
        title: `Usuario ${action}`,
        description: `El usuario ha sido ${action} exitosamente`,
      });

      setIsToggleStatusDialogOpen(false);
      setUserToToggle(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cambiar estado del usuario",
        variant: "destructive",
      });
    }
  };

  // Open toggle status dialog
  const openToggleStatusDialog = (user: ServiceUser) => {
    setUserToToggle(user);
    setIsToggleStatusDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      role: 'CASHIER',
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    setSelectedUser(null);
  };

  // Open edit dialog
  const openEditDialog = (user: ServiceUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'CASHIER',
      password: '',
      confirmPassword: ''
    });
    setIsEditDialogOpen(true);
  };

  // Update form data when selecting a user
  const onSelectUserForEdit = (user: ServiceUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      phone: '',
      role: user.role || 'CASHIER',
      password: '',
      confirmPassword: ''
    });
    setIsEditDialogOpen(true);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    return role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getRoleIcon = (role: string) => {
    return role === 'ADMIN' ? Shield : UserIcon;
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Usuarios</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Usuarios</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-red-500">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Error al cargar usuarios</h3>
                <p className="text-gray-600 mt-1">{error}</p>
              </div>
              <Button onClick={fetchUsers} variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra los usuarios del sistema
          </p>
        </div>
        
        <PermissionGuard permission="users.create">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" aria-labelledby="user-create-title">
              <DialogHeader>
                <DialogTitle id="user-create-title">Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Completa la información para crear un nuevo usuario en el sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ingresa el nombre completo"
                  />
                  {formErrors.full_name && (
                    <p className="text-sm text-red-600">{formErrors.full_name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Número de teléfono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: string) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">Cajero</SelectItem>
                      <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="VIEWER">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contraseña segura"
                  />
                  {formErrors.password && (
                    <p className="text-sm text-red-600">{formErrors.password}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirma la contraseña"
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser}>
                  Crear Usuario
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const RoleIcon = getRoleIcon(user.role);
          
          return (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <RoleIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">{user.full_name || user.email}</h3>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role === 'ADMIN' ? 'Administrador' :
                           user.role === 'MANAGER' ? 'Manager' :
                           user.role === 'EMPLOYEE' ? 'Empleado' :
                           user.role === 'VIEWER' ? 'Visualizador' : 'Cajero'}
                        </Badge>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        
                        {user.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-4 w-4" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <PermissionGuard permission="users.edit">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      </PermissionGuard>
                      <PermissionGuard permission="users.edit">
                        <DropdownMenuItem onClick={() => openToggleStatusDialog(user)}>
                          <UserIcon className="h-4 w-4 mr-2" />
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </PermissionGuard>
                      <PermissionGuard permission="users.delete">
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(user)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit User Dialog */}
      <PermissionGuard permission="users.edit">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]" aria-labelledby="user-edit-title">
            <DialogHeader>
              <DialogTitle id="user-edit-title">Editar Usuario</DialogTitle>
              <DialogDescription>
                Modifica la información del usuario seleccionado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-full_name">Nombre Completo</Label>
                <Input
                  id="edit-full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
                {formErrors.full_name && (
                  <p className="text-sm text-red-600">{formErrors.full_name}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50"
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Rol</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: string) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASHIER">Cajero</SelectItem>
                    <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="VIEWER">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Dejar vacío para mantener la actual"
                />
                {formErrors.password && (
                  <p className="text-sm text-red-600">{formErrors.password}</p>
                )}
              </div>
              
              {formData.password && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="edit-confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirma la nueva contraseña"
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{formErrors.confirmPassword}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser}>
                Actualizar Usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario
              {userToDelete && ` "${userToDelete.full_name || userToDelete.email}"`} del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setUserToDelete(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.isActive ? '¿Desactivar usuario?' : '¿Activar usuario?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.isActive
                ? `El usuario "${userToToggle?.full_name || userToToggle?.email}" será desactivado y no podrá acceder al sistema.`
                : `El usuario "${userToToggle?.full_name || userToToggle?.email}" será activado y podrá acceder al sistema.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsToggleStatusDialogOpen(false);
              setUserToToggle(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleUserStatus}
              className={userToToggle?.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {userToToggle?.isActive ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {filteredUsers.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No se encontraron usuarios
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Intenta con otros terminos de busqueda' : 'Comienza creando tu primer usuario'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}