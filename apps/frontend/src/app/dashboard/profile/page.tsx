'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/use-profile';
import { ProfilePicture } from '@/components/profile/profile-picture';
import { BasicInfoForm } from '@/components/profile/basic-info-form';
import { RecentActivity } from '@/components/profile/recent-activity';
import { PreferencesSettings } from '@/components/profile/preferences-settings';
import { ActionButtons } from '@/components/profile/action-buttons';
import { ProfessionalInfo } from '@/components/profile/professional-info';
import { PerformanceMetrics } from '@/components/profile/performance-metrics';
import { AdvancedNotifications } from '@/components/profile/advanced-notifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Phone, MapPin, Calendar, User, RefreshCw, Camera, Mail, Edit, TrendingUp, Shield, Activity, Lock, Save, X, Clock, Palette, Globe, Eye, Briefcase, BarChart3, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { ProfileSkeleton } from '@/components/profile/profile-skeleton';
import { ProfilePreview } from '@/components/profile/profile-preview';
import { ProfileHeader } from '@/components/profile/profile-header';
import '../../../styles/animations.css';
import { createClient } from '@/lib/supabase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface ActivityItem {
  id: string;
  type: 'sale' | 'product' | 'login' | 'update';
  description: string;
  timestamp: string;
  metadata?: any;
}

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, updateProfile, updateAvatar } = useProfile();
  const [localProfile, setProfile] = useState<UserProfile | null>(null);
  const [localIsLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    theme: 'system',
    language: 'es',
    timezone: 'America/Mexico_City',
    currency: 'MXN'
  });
  
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

      // Detectar modo mock para evitar llamadas a la API cuando Supabase no está configurado
      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabaseRef.current.auth.getSession();
        isMockAuth = !session || !!sessionError || typeof (supabaseRef.current as any).from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        // Usar el estado del hook como fuente y evitar la llamada a la API
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
      setProfile(profileData);
      setEditForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        location: profileData.location || ''
      });
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "No se pudo cargar el perfil del usuario";
      setError(errorMessage);
      
      // Auto-retry logic for network errors
      if (retryCount < 3 && (error?.code === 'NETWORK_ERROR' || error?.response?.status >= 500)) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadUserProfile();
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  const loadUserActivities = useCallback(async () => {
    try {
      // Simulando datos de actividad - en producción esto vendría de la API
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'sale',
          description: 'Procesó una venta por $1,250.00',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'product',
          description: 'Agregó nuevo producto: "Laptop Dell Inspiron"',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'login',
          description: 'Inició sesión en el sistema',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          type: 'update',
          description: 'Actualizó información del perfil',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setActivities(mockActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      // Don't show error toast for activities as it's not critical
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        loadUserProfile(),
        loadUserActivities()
      ]);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUserProfile, loadUserActivities]);

  useEffect(() => {
    loadUserProfile();
    loadUserActivities();
    // Este efecto solo debe correr al montar la página
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!isFormValid) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }
    // Mostrar vista previa antes de guardar
    setShowPreview(true);
  }, [isFormValid]);

  const handleConfirmSave = useCallback(async () => {
    setIsSaving(true);
    setShowPreview(false);
    try {
      // Validate form data before sending
      if (!editForm.name?.trim()) {
        throw new Error('El nombre es requerido');
      }

      // Use the useProfile hook's updateProfile method instead of API call
      const success = await updateProfile(editForm);
      if (success) {
        setIsEditing(false);
        toast.success("Perfil actualizado correctamente");
        // Refresh the local profile data
        await loadUserProfile();
        // Clear any previous errors
        setError(null);
        setRetryCount(0);
      } else {
        throw new Error('No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      // More detailed error handling
      let errorMessage = "No se pudo actualizar el perfil";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.code === 'NETWORK_ERROR') {
        errorMessage = "Error de conexión. Verifica tu conexión a internet.";
      } else if (error?.code === 'UNAUTHORIZED') {
        errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
        router.push('/auth/login');
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

    // Clear previous errors
    setError(null);

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = 'El archivo es demasiado grande. Máximo 5MB permitido.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP).';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Additional file type validation
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
      
      // Use the updateAvatar function from the hook
      const success = await updateAvatar(file);
      
      if (success) {
        toast.success("Foto de perfil actualizada correctamente");
        // Reload the profile to get the updated avatar
        await loadUserProfile();
      } else {
        throw new Error('La actualización del avatar falló');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      
      let errorMessage = "No se pudo actualizar la foto de perfil";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.code === 'NETWORK_ERROR') {
        errorMessage = "Error de conexión. Verifica tu conexión a internet.";
      } else if (error?.code === 'UNAUTHORIZED') {
        errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
        router.push('/auth/login');
        return;
      } else if (error?.code === 'PAYLOAD_TOO_LARGE') {
        errorMessage = "El archivo es demasiado grande para el servidor.";
      } else if (error?.code === 'UNSUPPORTED_MEDIA_TYPE') {
        errorMessage = "Formato de archivo no soportado.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [updateAvatar, loadUserProfile, router]);

  const handlePreferenceChange = useCallback((key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'product': return <User className="h-4 w-4 text-blue-500" />;
      case 'login': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'update': return <Edit className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  }, []);

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

      {/* Contenido principal con tabs mejoradas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList 
            className="grid w-full sm:w-auto grid-cols-3 sm:grid-cols-7 h-auto p-1 bg-muted/50 rounded-lg animate-slide-in-left"
            role="tablist"
            aria-label="Secciones del perfil"
          >
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="overview-panel"
              aria-selected="true"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger 
              value="professional" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="professional-panel"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Profesional</span>
            </TabsTrigger>
            <TabsTrigger 
              value="metrics" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="metrics-panel"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="activity-panel"
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Actividad</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="notifications-panel"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="preferences-panel"
            >
              <Palette className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Preferencias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all smooth-transition"
              role="tab"
              aria-controls="security-panel"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Indicador de estado de edición */}
          {isEditing && (
            <div 
              className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              role="status"
              aria-live="polite"
            >
              <Edit className="h-3 w-3" aria-hidden="true" />
              Modo edición activo
            </div>
          )}
        </div>

        {/* Tab: Resumen */}
        <TabsContent 
          value="overview" 
          className="space-y-6 tab-content-enter"
          role="tabpanel"
          id="overview-panel"
          aria-labelledby="overview-tab"
        >
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
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} aria-label="Formulario de edición de perfil">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('name', e.target.value)}
                        className={`form-field-focus ${formErrors.name ? 'border-red-500 form-field-error' : ''}`}
                        aria-required="true"
                        aria-invalid={!!formErrors.name}
                        aria-describedby={formErrors.name ? 'name-error' : undefined}
                      />
                      {formErrors.name && (
                        <p id="name-error" className="text-sm text-red-500 animate-slide-in-left" role="alert">{formErrors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={editForm.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('phone', e.target.value)}
                        className={`form-field-focus ${formErrors.phone ? 'border-red-500 form-field-error' : ''}`}
                        placeholder="+595 21 1234567"
                        aria-invalid={!!formErrors.phone}
                        aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                      />
                      {formErrors.phone && (
                        <p id="phone-error" className="text-sm text-red-500 animate-slide-in-left" role="alert">{formErrors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('location', e.target.value)}
                        className={`form-field-focus ${formErrors.location ? 'border-red-500 form-field-error' : ''}`}
                        placeholder="Ciudad, País"
                        aria-invalid={!!formErrors.location}
                        aria-describedby={formErrors.location ? 'location-error' : undefined}
                      />
                      {formErrors.location && (
                        <p id="location-error" className="text-sm text-red-500 animate-slide-in-left" role="alert">{formErrors.location}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografía</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange('bio', e.target.value)}
                        placeholder="Cuéntanos sobre ti..."
                        rows={3}
                        className={`form-field-focus ${formErrors.bio ? 'border-red-500 form-field-error' : ''}`}
                        aria-invalid={!!formErrors.bio}
                        aria-describedby={formErrors.bio ? 'bio-error bio-count' : 'bio-count'}
                      />
                      <div className="flex justify-between items-center">
                        {formErrors.bio && (
                          <p id="bio-error" className="text-sm text-red-500 animate-slide-in-left" role="alert">{formErrors.bio}</p>
                        )}
                        <p id="bio-count" className="text-xs text-muted-foreground ml-auto" aria-live="polite">
                          {editForm.bio.length}/500 caracteres
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isSaving || !isFormValid}
                        aria-describedby={!isFormValid ? 'form-validation-message' : undefined}
                        className="button-press"
                      >
                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        className="button-press"
                      >
                        <X className="h-4 w-4 mr-2" aria-hidden="true" />
                        Cancelar
                      </Button>
                    </div>
                    {!isFormValid && (
                      <p id="form-validation-message" className="text-sm text-muted-foreground mt-2 animate-fade-in">
                        Por favor, completa todos los campos requeridos correctamente.
                      </p>
                    )}
                  </form>
                ) : (
                  <>
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

            {/* Estadísticas rápidas */}
            <Card className="hover-lift smooth-transition">
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
                <CardDescription>
                  Tu actividad en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg hover-lift smooth-transition stats-counter">
                    <div className="text-2xl font-bold text-primary">127</div>
                    <div className="text-sm text-muted-foreground">Ventas procesadas</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg hover-lift smooth-transition stats-counter">
                    <div className="text-2xl font-bold text-green-600">45</div>
                    <div className="text-sm text-muted-foreground">Productos agregados</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg hover-lift smooth-transition stats-counter">
                    <div className="text-2xl font-bold text-blue-600">89%</div>
                    <div className="text-sm text-muted-foreground">Eficiencia</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg hover-lift smooth-transition stats-counter">
                    <div className="text-2xl font-bold text-purple-600">23</div>
                    <div className="text-sm text-muted-foreground">Días activo</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Actividad */}
        <TabsContent 
          value="activity" 
          className="space-y-6 tab-content-enter"
          role="tabpanel"
          id="activity-panel"
          aria-labelledby="activity-tab"
        >
          <Card className="hover-lift smooth-transition">
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Historial de tus acciones en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" role="list" aria-label="Lista de actividades recientes">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border hover-lift smooth-transition animate-slide-in-left"
                    role="listitem"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="mt-1 p-2 rounded-full bg-muted" aria-hidden="true">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <time dateTime={activity.timestamp}>
                          {formatDate(activity.timestamp)}
                        </time>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preferencias */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>
                  Configura cómo quieres recibir notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Notificaciones por email</Label>
                    <p className="text-sm text-muted-foreground" id="email-notifications-desc">
                      Recibe actualizaciones por correo electrónico
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.notifications.email}
                    onCheckedChange={(checked: boolean) => 
                      handlePreferenceChange('notifications', {
                        ...preferences.notifications,
                        email: checked
                      })
                    }
                    aria-describedby="email-notifications-desc"
                    className="switch-transition"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Notificaciones push</Label>
                    <p className="text-sm text-muted-foreground" id="push-notifications-desc">
                      Recibe notificaciones en el navegador
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={preferences.notifications.push}
                    onCheckedChange={(checked: boolean) => 
                      handlePreferenceChange('notifications', {
                        ...preferences.notifications,
                        push: checked
                      })
                    }
                    aria-describedby="push-notifications-desc"
                    className="switch-transition"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">Notificaciones SMS</Label>
                    <p className="text-sm text-muted-foreground" id="sms-notifications-desc">
                      Recibe alertas importantes por SMS
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={preferences.notifications.sms}
                    onCheckedChange={(checked: boolean) => 
                      handlePreferenceChange('notifications', {
                        ...preferences.notifications,
                        sms: checked
                      })
                    }
                    aria-describedby="sms-notifications-desc"
                    className="switch-transition"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift smooth-transition">
              <CardHeader>
                <CardTitle>Apariencia y Región</CardTitle>
                <CardDescription>
                  Personaliza la apariencia y configuración regional
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['light', 'dark', 'system'].map((theme) => (
                      <Button
                        key={theme}
                        variant={preferences.theme === theme ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePreferenceChange('theme', theme)}
                        className="button-press smooth-transition"
                      >
                        <Palette className="h-4 w-4" />
                        {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Sistema'}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 animate-slide-in-left">
                  <Label>Idioma</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Español (México)</span>
                  </div>
                </div>
                <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
                  <Label>Zona horaria</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">América/Ciudad_de_México (GMT-6)</span>
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
              <div className="flex items-center justify-between p-4 border rounded-lg hover-lift smooth-transition animate-slide-in-left">
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
              
              <div className="flex items-center justify-between p-4 border rounded-lg hover-lift smooth-transition animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
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

              <div className="flex items-center justify-between p-4 border rounded-lg hover-lift smooth-transition animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
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

        {/* Tab: Información Profesional */}
        <TabsContent 
          value="professional" 
          className="space-y-6 tab-content-enter"
          role="tabpanel"
          id="professional-panel"
          aria-labelledby="professional-tab"
        >
          <ProfessionalInfo 
            onUpdate={async (data) => {
              try {
                // Mock implementation - replace with actual API call
                console.log('Updating professional info:', data);
                toast.success('Información profesional actualizada');
                return true;
              } catch (error) {
                toast.error('Error al actualizar información profesional');
                return false;
              }
            }}
          />
        </TabsContent>

        {/* Tab: Métricas de Rendimiento */}
        <TabsContent 
          value="metrics" 
          className="space-y-6 tab-content-enter"
          role="tabpanel"
          id="metrics-panel"
          aria-labelledby="metrics-tab"
        >
          <PerformanceMetrics 
            onUpdate={async (data) => {
              try {
                // Mock implementation - replace with actual API call
                console.log('Updating performance metrics:', data);
                toast.success('Métricas de rendimiento actualizadas');
                return true;
              } catch (error) {
                toast.error('Error al actualizar métricas de rendimiento');
                return false;
              }
            }}
          />
        </TabsContent>

        {/* Tab: Notificaciones Avanzadas */}
        <TabsContent 
          value="notifications" 
          className="space-y-6 tab-content-enter"
          role="tabpanel"
          id="notifications-panel"
          aria-labelledby="notifications-tab"
        >
          <AdvancedNotifications 
            onUpdate={async (data) => {
              try {
                // Mock implementation - replace with actual API call
                console.log('Updating notification settings:', data);
                toast.success('Configuración de notificaciones actualizada');
                return true;
              } catch (error) {
                toast.error('Error al actualizar configuración de notificaciones');
                return false;
              }
            }}
          />
        </TabsContent>
      </Tabs>

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