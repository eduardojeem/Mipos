'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Settings, 
  Activity, 
  Clock, 
  MapPin,
  Phone,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useAdminProfile } from '@/hooks/use-admin-profile';

interface AdminProfileData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  location?: string;
  timezone: string;
  language: string;
  lastLogin?: string;
  createdAt: string;
  permissions: string[];
  twoFactorEnabled: boolean;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    profile: adminProfile, 
    updateProfile, 
    changePassword,
    isLoading,
    isUpdatingProfile,
    isChangingPassword 
  } = useAdminProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState<Partial<AdminProfileData>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Usar datos del perfil de administrador o valores por defecto
  const profileData = adminProfile || {
    id: user?.id || '',
    email: user?.email || '',
    fullName: 'Administrador',
    role: 'ADMIN',
    avatar: '',
    phone: '',
    bio: '',
    location: 'Asunción, Paraguay',
    timezone: 'America/Asuncion',
    language: 'es',
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    permissions: [
      'users.manage',
      'roles.manage',
      'system.configure',
      'reports.view',
      'audit.view',
      'security.manage'
    ],
    recentActivity: [],
    twoFactorEnabled: false
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setFormData({});
    } else {
      setFormData({
        fullName: profileData.fullName,
        phone: profileData.phone,
        bio: profileData.bio,
        location: profileData.location,
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 8 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-500';
      case 'ADMIN': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Perfil de Administrador
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestiona tu información personal y configuraciones de seguridad
          </p>
        </div>
        <Button
          onClick={handleEditToggle}
          variant={isEditing ? "outline" : "default"}
          className="flex items-center gap-2"
        >
          {isEditing ? (
            <>
              <X className="h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4" />
              Editar Perfil
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Información básica */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="relative mx-auto">
                <Avatar className="h-24 w-24 mx-auto">
                  <AvatarImage src={profileData.avatar} alt={profileData.fullName} />
                  <AvatarFallback className="text-2xl">
                    {profileData.fullName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-semibold">{profileData.fullName}</h3>
                <p className="text-gray-600 dark:text-gray-400">{profileData.email}</p>
                <Badge className={`mt-2 ${getRoleBadgeColor(profileData.role)} text-white`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {profileData.role.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Último acceso</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDate(profileData.lastLogin || '')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Miembro desde</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDate(profileData.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Ubicación</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {profileData.location}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permisos
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Actividad
              </TabsTrigger>
            </TabsList>

            {/* Tab: Perfil */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>
                    Actualiza tu información personal y preferencias
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Nombre Completo</Label>
                      {isEditing ? (
                        <Input
                          id="fullName"
                          value={formData.fullName || ''}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {profileData.fullName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {profileData.email}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {profileData.phone || 'No especificado'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="location">Ubicación</Label>
                      {isEditing ? (
                        <Input
                          id="location"
                          value={formData.location || ''}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {profileData.location}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bio">Biografía</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        rows={3}
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Cuéntanos sobre ti..."
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {profileData.bio || 'No hay biografía disponible'}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-3">
                      <Button onClick={handleSaveProfile} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                      </Button>
                      <Button variant="outline" onClick={handleEditToggle}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Seguridad */}
            <TabsContent value="security">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                    <CardDescription>
                      Actualiza tu contraseña para mantener tu cuenta segura
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!showPasswordChange ? (
                      <Button onClick={() => setShowPasswordChange(true)}>
                        <Key className="h-4 w-4 mr-2" />
                        Cambiar Contraseña
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">Contraseña Actual</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPasswords.current ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                            >
                              {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="newPassword">Nueva Contraseña</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showPasswords.new ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                            >
                              {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showPasswords.confirm ? "text" : "password"}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                            >
                              {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={handlePasswordChange}>
                            Actualizar Contraseña
                          </Button>
                          <Button variant="outline" onClick={() => setShowPasswordChange(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Autenticación de Dos Factores</CardTitle>
                    <CardDescription>
                      Agrega una capa extra de seguridad a tu cuenta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Estado: {profileData.twoFactorEnabled ? 'Activado' : 'Desactivado'}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {profileData.twoFactorEnabled 
                            ? 'Tu cuenta está protegida con 2FA'
                            : 'Activa 2FA para mayor seguridad'
                          }
                        </p>
                      </div>
                      <Button variant={profileData.twoFactorEnabled ? "destructive" : "default"}>
                        {profileData.twoFactorEnabled ? 'Desactivar 2FA' : 'Activar 2FA'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Permisos */}
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Permisos de Administrador</CardTitle>
                  <CardDescription>
                    Permisos asignados a tu cuenta de administrador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.permissions.map((permission) => (
                      <div key={permission} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Shield className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">{permission}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Permiso activo
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Actividad */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Actividad Reciente</CardTitle>
                  <CardDescription>
                    Historial de acciones realizadas en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mock activity data */}
                    {[
                      { action: 'Inicio de sesión', time: '2 minutos', icon: User },
                      { action: 'Configuración actualizada', time: '1 hora', icon: Settings },
                      { action: 'Usuario creado', time: '3 horas', icon: User },
                      { action: 'Reporte generado', time: '1 día', icon: Activity },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <activity.icon className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Hace {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}