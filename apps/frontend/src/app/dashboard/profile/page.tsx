'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, RefreshCw, Shield, Lock, Save, X, Eye, Sparkles, Check, ArrowRight, Activity, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { ProfileSkeleton } from '@/components/profile/profile-skeleton';
import { ProfilePreview } from '@/components/profile/profile-preview';
import { ProfileHeader } from '@/components/profile/profile-header';
import '../../../styles/animations.css';
import { createClient } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, updateProfile, updateAvatar } = useProfile();
  const [localIsLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    bio: '',
    location: ''
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    bio: '',
    location: ''
  });

  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabaseRef = useRef(createClient());

  // Organization info state
  const [organizationInfo, setOrganizationInfo] = useState<{
    name: string;
    role: string;
    roleDescription: string;
    permissions: string[];
  } | null>(null);

  // Check if user is admin or owner of the organization
  const isAdmin = useMemo(() => {
    if (!organizationInfo?.role) return false;
    const role = organizationInfo.role.toLowerCase();
    return role === 'admin' || role === 'owner' || role === 'superadmin';
  }, [organizationInfo]);

  // Validación en tiempo real
  const validateField = useCallback((field: string, value: string) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'El nombre es requerido';
        } else if (value.trim().length < 2) {
          error = 'El nombre debe tener al menos 2 caracteres';
        } else if (value.trim().length > 50) {
          error = 'El nombre no puede exceder 50 caracteres';
        }
        break;
      case 'phone':
        if (value && !/^(\+595\s?[0-9]{2}\s?[0-9]{7}|0[0-9]{2}\s?[0-9]{7}|[0-9]{9})$/.test(value.replace(/\s/g, ''))) {
          error = 'Formato de teléfono inválido (formato: +595 XX XXXXXXX)';
        }
        break;
      case 'bio':
        if (value.length > 500) {
          error = 'La biografía no puede exceder 500 caracteres';
        }
        break;
      case 'location':
        if (value.length > 100) {
          error = 'La ubicación no puede exceder 100 caracteres';
        }
        break;
    }

    setFormErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  }, []);

  const handleFormChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);

  const isFormValid = useMemo(() => {
    return Object.values(formErrors).every(error => error === '') &&
      editForm.name.trim() !== '';
  }, [formErrors, editForm.name]);

  const loadUserProfile = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Detectar modo mock
      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabaseRef.current.auth.getSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isMockAuth = !session || !!sessionError || typeof (supabaseRef.current as any).from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        if (profile) {
          setEditForm({
            name: profile.name || '',
            phone: profile.phone || '',
            bio: profile.bio || '',
            location: profile.location || ''
          });
          setRetryCount(0);
        }
        return;
      }

      const response = await api.get('/auth/profile');
      const profileData = response.data.data;
      setEditForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        location: profileData.location || ''
      });
      setRetryCount(0);
    } catch (error: unknown) {
      console.error('Error loading profile:', error);
      const err = error as { response?: { data?: { message?: string }; status?: number }; message?: string; code?: string };
      const errorMessage = err?.response?.data?.message ||
        err?.message ||
        "No se pudo cargar el perfil del usuario";
      setError(errorMessage);

      if (retryCount < 3 && (err?.code === 'NETWORK_ERROR' || (err?.response?.status && err.response.status >= 500))) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, profile]);

  useEffect(() => {
    if (retryCount > 0) {
      loadUserProfile();
    }
  }, [retryCount, loadUserProfile]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await loadUserProfile();
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Load organization info
  useEffect(() => {
    loadOrganizationInfo();
  }, [profile?.id]);

  const loadOrganizationInfo = async () => {
    if (!profile?.id) return;

    try {
      const response = await api.get('/auth/organization/info');
      if (response.data.success && response.data.data) {
        setOrganizationInfo(response.data.data);
      }
    } catch (error) {
      console.log('No organization info available:', error);
      setOrganizationInfo(null);
    }
  };

  const handleSaveProfile = useCallback(async () => {
    if (!isFormValid) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }
    setShowPreview(true);
  }, [isFormValid]);

  const handleConfirmSave = useCallback(async () => {
    setIsSaving(true);
    setShowPreview(false);
    try {
      if (!editForm.name?.trim()) {
        throw new Error('El nombre es requerido');
      }

      const success = await updateProfile(editForm);
      if (success) {
        setIsEditing(false);
        toast.success("Perfil actualizado correctamente");
        await loadUserProfile();
        setError(null);
        setRetryCount(0);
      } else {
        throw new Error('No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.');
      }
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string; code?: string };

      let errorMessage = "No se pudo actualizar el perfil";

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.code === 'NETWORK_ERROR') {
        errorMessage = "Error de conexión. Verifica tu conexión a internet.";
      } else if (err?.code === 'UNAUTHORIZED') {
        errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
        router.push('/auth/signin');
        return;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [editForm, updateProfile, loadUserProfile, router]);

  const handleCancelPreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = 'El archivo es demasiado grande. Máximo 5MB permitido.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP).';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      const errorMsg = 'Formato de imagen no soportado. Use JPG, PNG, GIF o WebP.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const success = await updateAvatar(file);

      if (success) {
        toast.success("Foto de perfil actualizada correctamente");
        await loadUserProfile();
      } else {
        throw new Error('La actualización del avatar falló');
      }
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string; code?: string };

      let errorMessage = "No se pudo actualizar la foto de perfil";

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.code === 'NETWORK_ERROR') {
        errorMessage = "Error de conexión. Verifica tu conexión a internet.";
      } else if (err?.code === 'UNAUTHORIZED') {
        errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
        router.push('/auth/signin');
        return;
      } else if (err?.code === 'PAYLOAD_TOO_LARGE') {
        errorMessage = "El archivo es demasiado grande para el servidor.";
      } else if (err?.code === 'UNSUPPORTED_MEDIA_TYPE') {
        errorMessage = "Formato de archivo no soportado.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [updateAvatar, loadUserProfile, router]);

  if (isLoading || localIsLoading) {
    return <ProfileSkeleton />;
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error al cargar el perfil</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="button-press"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Reintentando...' : 'Reintentar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="button-press"
                >
                  Volver al Dashboard
                </Button>
              </div>
              {retryCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Intento {retryCount} de 3
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <User className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No se pudo cargar el perfil</h3>
                <p className="text-muted-foreground">Intenta recargar la página</p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="button-press"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Cargando...' : 'Recargar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 animate-fade-in">
      {/* Error banner */}
      {error && (
        <Card className="border-red-200 bg-red-50 animate-slide-in-top">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="button-press"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Reintentar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setError(null)}
                  className="button-press"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header del perfil */}
      <ProfileHeader
        profile={profile}
        isRefreshing={isRefreshing}
        isUploading={isUploading || localIsLoading}
        isEditing={isEditing}
        onRefresh={handleRefresh}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onChangePassword={() => router.push('/dashboard/profile/change-password')}
        onAvatarUpload={handleAvatarUpload}
      />

      {/* Contenido principal con tabs simplificadas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList
            className="grid w-full sm:w-auto grid-cols-3 h-auto p-1 bg-muted/50 rounded-lg animate-slide-in-left"
            role="tablist"
            aria-label="Secciones del perfil"
          >
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
            >
              <User className="h-4 w-4" />
              <span>Información Personal</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
            >
              <Shield className="h-4 w-4" />
              <span>Seguridad</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="plan"
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
                role="tab"
              >
                <Sparkles className="h-4 w-4" />
                <span>Plan</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Indicador de estado de edición */}
          {isEditing && (
            <div
              className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              role="status"
              aria-live="polite"
            >
              <User className="h-3 w-3" />
              Modo edición activo
            </div>
          )}
        </div>

        {/* Tab: Información Personal */}
        <TabsContent value="overview" className="space-y-6 tab-content-enter">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Información personal */}
            <Card className="hover-lift smooth-transition">
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Gestiona tu información personal y biografía
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className={formErrors.name ? 'border-red-500' : ''}
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-500">{formErrors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={editForm.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        className={formErrors.phone ? 'border-red-500' : ''}
                        placeholder="+595 21 1234567"
                      />
                      {formErrors.phone && (
                        <p className="text-sm text-red-500">{formErrors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => handleFormChange('location', e.target.value)}
                        className={formErrors.location ? 'border-red-500' : ''}
                        placeholder="Ciudad, País"
                      />
                      {formErrors.location && (
                        <p className="text-sm text-red-500">{formErrors.location}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografía</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => handleFormChange('bio', e.target.value)}
                        placeholder="Cuéntanos sobre ti..."
                        rows={3}
                        className={formErrors.bio ? 'border-red-500' : ''}
                      />
                      <div className="flex justify-between items-center">
                        {formErrors.bio && (
                          <p className="text-sm text-red-500">{formErrors.bio}</p>
                        )}
                        <p className="text-xs text-muted-foreground ml-auto">
                          {editForm.bio.length}/500 caracteres
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isSaving || !isFormValid}
                        className="button-press"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="button-press"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                    {!isFormValid && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Por favor, completa todos los campos requeridos correctamente.
                      </p>
                    )}
                  </form>
                ) : (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Nombre</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile.name || 'No especificado'}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile.email || 'No especificado'}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Teléfono</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile.phone || 'No especificado'}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Ubicación</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile.location || 'No especificado'}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Biografía</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile.bio || 'No has agregado una biografía aún.'}
                      </p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="font-medium">Último acceso</Label>
                        <p className="text-muted-foreground">
                          {profile.lastLogin ? formatDate(profile.lastLogin) : 'Nunca'}
                        </p>
                      </div>
                      <div>
                        <Label className="font-medium">Estado</Label>
                        <Badge variant="outline" className="ml-2">Activo</Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Información de cuenta */}
            <Card className="hover-lift smooth-transition">
              <CardHeader>
                <CardTitle>Información de Cuenta</CardTitle>
                <CardDescription>
                  Detalles de tu cuenta en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Rol del Sistema</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.role || 'Usuario'}
                    </p>
                  </div>
                  <Separator />

                  {/* Organization Info */}
                  {organizationInfo ? (
                    <>
                      <div>
                        <Label className="text-sm font-medium">Organización</Label>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {organizationInfo.name}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">Rol en la Organización</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default" className="bg-blue-600">
                            {organizationInfo.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {organizationInfo.roleDescription}
                          </span>
                        </div>
                      </div>
                      {organizationInfo.permissions && organizationInfo.permissions.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Permisos Principales</Label>
                            <div className="flex flex-wrap gap-2">
                              {organizationInfo.permissions.slice(0, 6).map((permission, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {permission}
                                </Badge>
                              ))}
                              {organizationInfo.permissions.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{organizationInfo.permissions.length - 6} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      <Separator />
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          No perteneces a ninguna organización actualmente
                        </p>
                      </div>
                      <Separator />
                    </>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Fecha de registro</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.createdAt ? formatDate(profile.createdAt) : 'No disponible'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium">ID de usuario</Label>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {profile.id || 'No disponible'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Seguridad */}
        <TabsContent value="security" className="space-y-6 tab-content-enter">
          <Card className="hover-lift smooth-transition">
            <CardHeader>
              <CardTitle>Configuración de Seguridad</CardTitle>
              <CardDescription>
                Gestiona la seguridad de tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover-lift smooth-transition">
                <div className="space-y-1">
                  <Label className="font-medium">Cambiar contraseña</Label>
                  <p className="text-sm text-muted-foreground">
                    Actualiza tu contraseña regularmente para mantener tu cuenta segura
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/profile/change-password')}
                  className="button-press"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Cambiar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover-lift smooth-transition">
                <div className="space-y-1">
                  <Label className="font-medium">Autenticación de dos factores</Label>
                  <p className="text-sm text-muted-foreground">
                    Agrega una capa extra de seguridad a tu cuenta
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/profile/two-factor')}
                  className="button-press"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover-lift smooth-transition">
                <div className="space-y-1">
                  <Label className="font-medium">Sesiones activas</Label>
                  <p className="text-sm text-muted-foreground">
                    Revisa y gestiona tus sesiones activas
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/profile/sessions')}
                  className="button-press"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver sesiones
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Plan */}
        {isAdmin && (
          <TabsContent value="plan" className="space-y-6 tab-content-enter">
            <PlanSection profile={profile} />
          </TabsContent>
        )}
      </Tabs>

      {/* Recent Activity Section (Visible for all roles) */}
      <RecentActivitySection userId={profile.id} />

      {/* Profile Preview Modal */}
      <ProfilePreview
        formData={editForm}
        currentData={{
          name: profile?.name || '',
          phone: profile?.phone || '',
          location: profile?.location || '',
          bio: profile?.bio || '',
          avatar: profile?.avatar || '',
          email: profile?.email || '',
          role: profile?.role || '',
          joinDate: profile?.createdAt ? formatDate(profile.createdAt) : ''
        }}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelPreview}
        isVisible={showPreview}
      />
    </div>
  );
}

// Recent Activity Section Component
function RecentActivitySection({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/sales/recent?limit=5&user_id=${userId}`);
        if (response.data?.sales) {
          setActivities(response.data.sales);
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchActivities();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 hover-lift smooth-transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Actividad Reciente
        </CardTitle>
        <CardDescription>
          Tus últimas ventas y movimientos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Venta #{activity.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(activity.created_at)}</span>
                    <span>•</span>
                    <span>{activity.customer_name || 'Cliente Casual'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(activity.total_amount)}</p>
                <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                  {activity.status === 'completed' ? 'Completada' : activity.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Plan Section Component
interface PlanSectionProps {
  profile: {
    id: string;
    organizationId?: string;
  };
}

function PlanSection({ profile }: PlanSectionProps) {
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadPlanData();
  }, []);

  const loadPlanData = async () => {
    try {
      setLoading(true);

      // Fetch current plan
      try {
        const currentResponse = await api.get('/api/auth/organization/plan');
        setCurrentPlan(currentResponse.data.data);
      } catch (planError: any) {
        console.log('No plan found for user:', planError?.response?.status);
        // User might not have an organization or plan assigned
        setCurrentPlan(null);
      }

      // Fetch available plans
      const plansResponse = await api.get('/plans');
      setAvailablePlans(plansResponse.data.plans || []);
    } catch (error) {
      console.error('Error loading plan data:', error);
      // Don't show error toast, just log it
      setAvailablePlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPlanChange = async (planSlug: string) => {
    try {
      setRequesting(true);
      await api.post('/api/auth/organization/request-plan-change', { planSlug });
      toast.success('Solicitud de cambio de plan enviada correctamente');
    } catch (error) {
      console.error('Error requesting plan change:', error);
      toast.error('Error al solicitar cambio de plan');
    } finally {
      setRequesting(false);
    }
  };

  const getPlanColor = (slug: string) => {
    const s = String(slug || '').toLowerCase();
    if (s === 'free') return 'from-slate-500 to-slate-700';
    if (s === 'starter') return 'from-blue-500 to-cyan-600';
    if (s === 'pro' || s === 'professional') return 'from-purple-600 to-indigo-600';
    if (s === 'premium') return 'from-fuchsia-600 to-pink-700';
    if (s === 'enterprise') return 'from-amber-600 to-orange-700';
    return 'from-slate-500 to-slate-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="hover-lift smooth-transition border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Plan Actual
              </CardTitle>
              <CardDescription>
                Tu plan de suscripción activo
              </CardDescription>
            </div>
            {currentPlan && (
              <Badge className={`bg-gradient-to-r ${getPlanColor(currentPlan.slug)} text-white border-0 py-1 px-3 text-xs font-bold tracking-widest uppercase`}>
                {currentPlan.slug}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border">
                <h3 className="text-2xl font-bold mb-2">{currentPlan.name}</h3>
                <p className="text-muted-foreground mb-4">{currentPlan.description}</p>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-black">${currentPlan.price_monthly}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-background/50">
                    <div className="text-xs text-muted-foreground mb-1">Usuarios</div>
                    <div className="font-bold">
                      {currentPlan.limits?.maxUsers === -1 ? 'Ilimitados' : currentPlan.limits?.maxUsers}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <div className="text-xs text-muted-foreground mb-1">Productos</div>
                    <div className="font-bold">
                      {currentPlan.limits?.maxProducts === -1 ? 'Ilimitados' : currentPlan.limits?.maxProducts}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold mb-2">Características incluidas:</div>
                  {Array.isArray(currentPlan.features) && currentPlan.features.map((feature: any, idx: number) => {
                    const name = typeof feature === 'string' ? feature : feature.name;
                    const included = typeof feature === 'string' ? true : feature.included;
                    return included ? (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes un plan asignado actualmente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card className="hover-lift smooth-transition">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Planes Disponibles
          </CardTitle>
          <CardDescription>
            Mejora tu plan para acceder a más funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => {
              const isCurrentPlan = currentPlan?.slug === plan.slug;

              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-xl border-2 transition-all ${isCurrentPlan
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                >
                  <div className={`h-1 w-12 rounded-full mb-4 bg-gradient-to-r ${getPlanColor(plan.slug)}`} />

                  <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-black">${plan.price_monthly}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{plan.limits?.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.limits?.maxUsers} usuarios`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{plan.limits?.maxProducts === -1 ? 'Productos ilimitados' : `${plan.limits?.maxProducts} productos`}</span>
                    </div>
                  </div>

                  {isCurrentPlan ? (
                    <Button disabled className="w-full" variant="outline">
                      <Check className="h-4 w-4 mr-2" />
                      Plan Actual
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleRequestPlanChange(plan.slug)}
                      disabled={requesting}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {requesting ? 'Solicitando...' : 'Solicitar Cambio'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {availablePlans.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay planes disponibles en este momento</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
