'use client';

import React, { useState, useEffect } from 'react';
import { PermissionProvider, PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import {
  User,
  Settings,
  Bell,
  Shield,
  Save,
  Download,
  RefreshCw,
  AlertCircle,
  Palette,
  Monitor,
  Store,
  CreditCard,
  Database,
  Zap,
  Globe,
  Mail,
  Smartphone,
  Info,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

// Types
interface ThemeOptions {
  intensity?: 'dim' | 'normal' | 'black';
  tone?: 'blue' | 'gray' | 'pure';
  smoothTransitions?: boolean;
}

interface SystemSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  store_website: string;
  store_logo_url: string;
  tax_rate: number;
  currency: string;
  receipt_footer: string;
  low_stock_threshold: number;
  auto_backup: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  decimal_places: number;
  enable_barcode_scanner: boolean;
  enable_receipt_printer: boolean;
  enable_cash_drawer: boolean;
  max_discount_percentage: number;
  require_customer_info: boolean;
  enable_loyalty_program: boolean;
}

interface UserSettings {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
  theme: 'light' | 'dark' | 'system';
  theme_dark_intensity?: 'dim' | 'normal' | 'black';
  theme_dark_tone?: 'blue' | 'gray' | 'pure';
  theme_schedule_enabled?: boolean;
  theme_schedule_start?: string;
  theme_schedule_end?: string;
  theme_smooth_transitions?: boolean;
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  dashboard_layout: 'compact' | 'comfortable' | 'spacious';
  sidebar_collapsed: boolean;
  show_tooltips: boolean;
  enable_animations: boolean;
  auto_save: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  password_expiry_days: number;
  max_login_attempts: number;
  require_password_change: boolean;
  enable_login_notifications: boolean;
  allowed_ip_addresses: string[];
}

interface SettingsPageState {
  activeTab: string;
  userSettings: UserSettings;
  systemSettings: SystemSettings;
  securitySettings: SecuritySettings;
  loading: boolean;
  saving: boolean;
  passwordData: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  };
  showPassword: {
    current: boolean;
    new: boolean;
    confirm: boolean;
  };
  unsavedChanges: boolean;
  themeValidationErrors: string[];
  originalThemeSettings: ThemeOptions | null;
}

export default function SettingsPage() {
  return (
    <PermissionProvider>
      <SettingsPageContent />
    </PermissionProvider>
  );
}

function SettingsPageContent() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [state, setState] = useState<SettingsPageState>({
    activeTab: 'profile',
    userSettings: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      avatar: '',
      theme: 'system',
      theme_dark_intensity: 'normal',
      theme_dark_tone: 'blue',
      theme_schedule_enabled: false,
      theme_schedule_start: '19:00',
      theme_schedule_end: '07:00',
      theme_smooth_transitions: true,
      language: 'es',
      notifications_enabled: true,
      email_notifications: true,
      push_notifications: true,
      dashboard_layout: 'comfortable',
      sidebar_collapsed: false,
      show_tooltips: true,
      enable_animations: true,
      auto_save: true
    },
    systemSettings: {
      store_name: '',
      store_address: '',
      store_phone: '',
      store_email: '',
      store_website: '',
      store_logo_url: '',
      tax_rate: 0,
      currency: 'COP',
      receipt_footer: '',
      low_stock_threshold: 10,
      auto_backup: true,
      backup_frequency: 'daily',
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      timezone: 'America/Bogota',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      decimal_places: 2,
      enable_barcode_scanner: true,
      enable_receipt_printer: true,
      enable_cash_drawer: true,
      max_discount_percentage: 50,
      require_customer_info: false,
      enable_loyalty_program: false
    },
    securitySettings: {
      two_factor_enabled: false,
      session_timeout: 30,
      password_expiry_days: 90,
      max_login_attempts: 5,
      require_password_change: false,
      enable_login_notifications: true,
      allowed_ip_addresses: []
    },
    loading: true,
    saving: false,
    passwordData: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    },
    showPassword: {
      current: false,
      new: false,
      confirm: false
    },
    unsavedChanges: false,
    themeValidationErrors: [],
    originalThemeSettings: null
  });

  const [newIp, setNewIp] = useState('');

  const isValidIp = (ip: string) => {
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return ipv4Regex.test(ip);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.unsavedChanges]);

  // Auto-save user settings when enabled, with debounce
  useEffect(() => {
    if (!state.loading && state.userSettings.auto_save && state.unsavedChanges) {
      const timeout = setTimeout(() => {
        handleSaveUserSettings();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [state.userSettings, state.unsavedChanges, state.loading]);

  // Sincronizar opciones avanzadas de tema con localStorage para aplicación inmediata
  useEffect(() => {
    try {
      const opts = {
        intensity: state.userSettings.theme_dark_intensity,
        tone: state.userSettings.theme_dark_tone,
        smoothTransitions: state.userSettings.theme_smooth_transitions,
      };
      localStorage.setItem('pos-ui-theme-options', JSON.stringify(opts));
      const sched = {
        enabled: state.userSettings.theme_schedule_enabled,
        start: state.userSettings.theme_schedule_start,
        end: state.userSettings.theme_schedule_end,
      };
      localStorage.setItem('pos-theme-schedule', JSON.stringify(sched));
    } catch { }
  }, [
    state.userSettings.theme_dark_intensity,
    state.userSettings.theme_dark_tone,
    state.userSettings.theme_smooth_transitions,
    state.userSettings.theme_schedule_enabled,
    state.userSettings.theme_schedule_start,
    state.userSettings.theme_schedule_end,
  ]);

  const loadSettings = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const [userRes, systemRes, securityRes] = await Promise.all([
        api.get('/user/settings').catch(() => ({ data: { data: {} } })),
        api.get('/system/settings').catch(() => ({ data: { data: {} } })),
        api.get('/security/settings').catch(() => ({ data: { data: {} } }))
      ]);

      setState(prev => ({
        ...prev,
        userSettings: {
          ...prev.userSettings,
          ...userRes.data.data
        },
        systemSettings: {
          ...prev.systemSettings,
          ...systemRes.data.data
        },
        securitySettings: {
          ...prev.securitySettings,
          ...securityRes.data.data
        },
        loading: false
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las configuraciones',
        variant: 'destructive'
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveUserSettings = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      await api.put('/user/settings', state.userSettings);

      setState(prev => ({ ...prev, unsavedChanges: false }));

      toast({
        title: 'Éxito',
        description: 'Configuración de perfil actualizada correctamente',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error saving user settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración del perfil',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      await api.put('/system/settings', state.systemSettings);

      setState(prev => ({ ...prev, unsavedChanges: false }));

      toast({
        title: 'Éxito',
        description: 'Configuración del sistema actualizada correctamente',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración del sistema',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleSaveSecuritySettings = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      await api.put('/security/settings', state.securitySettings);

      setState(prev => ({ ...prev, unsavedChanges: false }));

      toast({
        title: 'Éxito',
        description: 'Configuración de seguridad actualizada correctamente',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración de seguridad',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (state.passwordData.new_password !== state.passwordData.confirm_password) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive'
      });
      return;
    }

    if (state.passwordData.new_password.length < 8) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 8 caracteres',
        variant: 'destructive'
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));

      await api.put('/user/password', {
        current_password: state.passwordData.current_password,
        new_password: state.passwordData.new_password
      });

      setState(prev => ({
        ...prev,
        passwordData: {
          current_password: '',
          new_password: '',
          confirm_password: ''
        }
      }));

      toast({
        title: 'Éxito',
        description: 'Contraseña actualizada correctamente',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la contraseña. Verifica tu contraseña actual.',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const updateUserSetting = (key: keyof UserSettings, value: any) => {
    setState(prev => ({
      ...prev,
      userSettings: {
        ...prev.userSettings,
        [key]: value
      },
      unsavedChanges: true
    }));
  };

  const updateSystemSetting = (key: keyof SystemSettings, value: any) => {
    setState(prev => ({
      ...prev,
      systemSettings: {
        ...prev.systemSettings,
        [key]: value
      },
      unsavedChanges: true
    }));
  };

  const handleUploadLogo = async () => {
    try {
      if (!logoFile) {
        toast({
          title: 'Selecciona una imagen',
          description: 'Elige un archivo de imagen para subir.',
          variant: 'destructive'
        });
        return;
      }
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('bucket', 'branding');
      formData.append('prefix', 'logo');
      formData.append('public', 'true');

      const res = await api.post('/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploaded = Array.isArray(res.data?.files) ? res.data.files[0] : undefined;
      const publicUrl = uploaded?.url;
      if (publicUrl) {
        updateSystemSetting('store_logo_url', publicUrl);
        toast({
          title: 'Logo subido',
          description: 'Se actualizó el logo de la tienda.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error al subir',
          description: 'No se recibió URL pública del archivo subido.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error al subir logo',
        description: 'Verifica tus permisos y el tamaño del archivo (máx. 5MB).',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateSecuritySetting = (key: keyof SecuritySettings, value: any) => {
    setState(prev => ({
      ...prev,
      securitySettings: {
        ...prev.securitySettings,
        [key]: value
      },
      unsavedChanges: true
    }));
  };

  const addAllowedIp = () => {
    const ip = newIp.trim();
    if (!isValidIp(ip)) {
      toast({
        title: 'IP inválida',
        description: 'Ingresa una dirección IPv4 válida (e.g., 192.168.1.1)',
        variant: 'destructive'
      });
      return;
    }
    if (state.securitySettings.allowed_ip_addresses.includes(ip)) {
      toast({
        title: 'Duplicado',
        description: 'Esta IP ya está en la lista de permitidas',
        variant: 'destructive'
      });
      return;
    }
    setState(prev => ({
      ...prev,
      securitySettings: {
        ...prev.securitySettings,
        allowed_ip_addresses: [...prev.securitySettings.allowed_ip_addresses, ip]
      },
      unsavedChanges: true
    }));
    setNewIp('');
  };

  const removeAllowedIp = (ip: string) => {
    setState(prev => ({
      ...prev,
      securitySettings: {
        ...prev.securitySettings,
        allowed_ip_addresses: prev.securitySettings.allowed_ip_addresses.filter(i => i !== ip)
      },
      unsavedChanges: true
    }));
  };

  const updatePasswordData = (key: keyof typeof state.passwordData, value: string) => {
    setState(prev => ({
      ...prev,
      passwordData: {
        ...prev.passwordData,
        [key]: value
      }
    }));
  };

  const togglePasswordVisibility = (field: keyof typeof state.showPassword) => {
    setState(prev => ({
      ...prev,
      showPassword: {
        ...prev.showPassword,
        [field]: !prev.showPassword[field]
      }
    }));
  };

  const exportSettings = async () => {
    try {
      const settings = {
        userSettings: state.userSettings,
        systemSettings: state.systemSettings,
        securitySettings: state.securitySettings,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configuracion-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Éxito',
        description: 'Configuración exportada correctamente',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar la configuración',
        variant: 'destructive'
      });
    }
  };

  const resetToDefaults = () => {
    if (confirm('¿Estás seguro de que quieres restaurar la configuración por defecto? Esta acción no se puede deshacer.')) {
      setState(prev => ({
        ...prev,
        userSettings: {
          ...prev.userSettings,
          theme: 'system',
          language: 'es',
          dashboard_layout: 'comfortable',
          sidebar_collapsed: false,
          show_tooltips: true,
          enable_animations: true,
          auto_save: true
        },
        unsavedChanges: true
      }));

      toast({
        title: 'Configuración restaurada',
        description: 'Se han restaurado los valores por defecto',
        variant: 'default'
      });
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Configuración</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las configuraciones del sistema, tu perfil y preferencias de seguridad
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {state.unsavedChanges && (
            <Badge variant="secondary" className="animate-pulse">
              <AlertCircle className="h-3 w-3 mr-1" />
              Cambios sin guardar
            </Badge>
          )}

          <PermissionGuard permission="settings.edit">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </PermissionGuard>

          <PermissionGuard permission="settings.edit">
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={state.activeTab} onValueChange={(value) => setState(prev => ({ ...prev, activeTab: value }))}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Information */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
                <CardDescription>
                  Actualiza tu información de perfil y datos de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      id="first_name"
                      value={state.userSettings.first_name}
                      onChange={(e) => updateUserSetting('first_name', e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      value={state.userSettings.last_name}
                      onChange={(e) => updateUserSetting('last_name', e.target.value)}
                      placeholder="Tu apellido"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={state.userSettings.email}
                    onChange={(e) => updateUserSetting('email', e.target.value)}
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={state.userSettings.phone}
                    onChange={(e) => updateUserSetting('phone', e.target.value)}
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <PermissionGuard permission="settings.edit">
                  <Button onClick={handleSaveUserSettings} disabled={state.saving} className="w-full">
                    {state.saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Información
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Preferencias de Interfaz
                </CardTitle>
                <CardDescription>
                  Personaliza tu experiencia de usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={state.userSettings.theme} onValueChange={(value) => updateUserSetting('theme', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Claro
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Oscuro
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Sistema
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Opciones avanzadas del modo oscuro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Intensidad del modo oscuro</Label>
                    <Select value={state.userSettings.theme_dark_intensity!} onValueChange={(value) => updateUserSetting('theme_dark_intensity', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dim">Suave</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="black">Negro puro (OLED)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tono</Label>
                    <Select value={state.userSettings.theme_dark_tone!} onValueChange={(value) => updateUserSetting('theme_dark_tone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">Azulado</SelectItem>
                        <SelectItem value="gray">Grises</SelectItem>
                        <SelectItem value="pure">Monocromo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Transiciones suaves</Label>
                      <p className="text-sm text-muted-foreground">Animación al cambiar entre claro/oscuro</p>
                    </div>
                    <Switch
                      checked={!!state.userSettings.theme_smooth_transitions}
                      onCheckedChange={(checked) => updateUserSetting('theme_smooth_transitions', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Programar modo oscuro automático</Label>
                        <p className="text-sm text-muted-foreground">Activa oscuro entre horarios configurados</p>
                      </div>
                      <Switch
                        checked={!!state.userSettings.theme_schedule_enabled}
                        onCheckedChange={(checked) => updateUserSetting('theme_schedule_enabled', checked)}
                      />
                    </div>
                    {state.userSettings.theme_schedule_enabled ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Inicio</Label>
                          <Input
                            type="time"
                            value={state.userSettings.theme_schedule_start!}
                            onChange={(e) => updateUserSetting('theme_schedule_start', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fin</Label>
                          <Input
                            type="time"
                            value={state.userSettings.theme_schedule_end!}
                            onChange={(e) => updateUserSetting('theme_schedule_end', e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={state.userSettings.language} onValueChange={(value) => updateUserSetting('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">🇪🇸 Español</SelectItem>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Diseño del Dashboard</Label>
                  <Select value={state.userSettings.dashboard_layout} onValueChange={(value) => updateUserSetting('dashboard_layout', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compacto</SelectItem>
                      <SelectItem value="comfortable">Cómodo</SelectItem>
                      <SelectItem value="spacious">Espacioso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mostrar tooltips</Label>
                      <p className="text-sm text-muted-foreground">
                        Ayuda contextual en elementos de la interfaz
                      </p>
                    </div>
                    <Switch
                      checked={state.userSettings.show_tooltips}
                      onCheckedChange={(checked) => updateUserSetting('show_tooltips', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Animaciones</Label>
                      <p className="text-sm text-muted-foreground">
                        Efectos visuales y transiciones
                      </p>
                    </div>
                    <Switch
                      checked={state.userSettings.enable_animations}
                      onCheckedChange={(checked) => updateUserSetting('enable_animations', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Guardado automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Guardar cambios automáticamente
                      </p>
                    </div>
                    <Switch
                      checked={state.userSettings.auto_save}
                      onCheckedChange={(checked) => updateUserSetting('auto_save', checked)}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveUserSettings} disabled={state.saving} className="w-full">
                  {state.saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Preferencias
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6">
            {/* Store Information */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Información de la Tienda
                </CardTitle>
                <CardDescription>
                  Configura los datos básicos de tu negocio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store_name">Nombre de la Tienda</Label>
                    <Input
                      id="store_name"
                      value={state.systemSettings.store_name}
                      onChange={(e) => updateSystemSetting('store_name', e.target.value)}
                      placeholder="Mi Tienda POS"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_email">Email de la Tienda</Label>
                    <Input
                      id="store_email"
                      type="email"
                      value={state.systemSettings.store_email}
                      onChange={(e) => updateSystemSetting('store_email', e.target.value)}
                      placeholder="contacto@mitienda.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_phone">Teléfono</Label>
                    <Input
                      id="store_phone"
                      value={state.systemSettings.store_phone}
                      onChange={(e) => updateSystemSetting('store_phone', e.target.value)}
                      placeholder="+57 1 234 5678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_website">Sitio Web</Label>
                    <Input
                      id="store_website"
                      value={state.systemSettings.store_website}
                      onChange={(e) => updateSystemSetting('store_website', e.target.value)}
                      placeholder="https://mitienda.com"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="store_logo_url">Logo (URL) para Login</Label>
                    <Input
                      id="store_logo_url"
                      value={state.systemSettings.store_logo_url}
                      onChange={(e) => updateSystemSetting('store_logo_url', e.target.value)}
                      placeholder="https://ruta-a-tu-logo.png"
                    />
                    <p className="text-xs text-muted-foreground">Usa una URL pública de imagen (PNG/JPG/SVG). Se mostrará en la pantalla de inicio de sesión.</p>
                  </div>
                </div>

                {state.systemSettings.store_logo_url ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden border bg-white dark:bg-slate-900">
                      {/* La imagen puede fallar: ocultar si hay error */}
                      <img
                        src={state.systemSettings.store_logo_url}
                        alt="Logo de la tienda"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">Vista previa del logo para Login</div>
                  </div>
                ) : null}

                <div className="space-y-2 md:col-span-2">
                  <Label>Subir Logo (imagen)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                    <Button onClick={handleUploadLogo} disabled={uploadingLogo || !logoFile}>
                      {uploadingLogo ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : null}
                      Subir Logo
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Se guarda en almacenamiento (carpeta "branding").</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_address">Dirección</Label>
                  <Textarea
                    id="store_address"
                    value={state.systemSettings.store_address}
                    onChange={(e) => updateSystemSetting('store_address', e.target.value)}
                    placeholder="Calle Principal 123, Ciudad, País"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_footer">Pie de Recibo</Label>
                  <Textarea
                    id="receipt_footer"
                    value={state.systemSettings.receipt_footer}
                    onChange={(e) => updateSystemSetting('receipt_footer', e.target.value)}
                    placeholder="¡Gracias por su compra! Vuelva pronto."
                    rows={3}
                  />
                </div>

                <PermissionGuard permission="settings.edit">
                  <Button onClick={handleSaveSystemSettings} disabled={state.saving} className="w-full">
                    {state.saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Información de Tienda
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Financial Settings */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Configuración Financiera
                  </CardTitle>
                  <CardDescription>
                    Ajustes de moneda, impuestos y precios
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={state.systemSettings.currency} onValueChange={(value) => updateSystemSetting('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PYG">🇵🇾 Guaraní Paraguayo (PYG)</SelectItem>
                        <SelectItem value="COP">🇨🇴 Peso Colombiano (COP)</SelectItem>
                        <SelectItem value="USD">🇺🇸 Dólar Americano (USD)</SelectItem>
                        <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
                        <SelectItem value="MXN">🇲🇽 Peso Mexicano (MXN)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tasa de Impuesto (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={state.systemSettings.tax_rate}
                      onChange={(e) => updateSystemSetting('tax_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="decimal_places">Decimales</Label>
                    <Select
                      value={state.systemSettings.decimal_places.toString()}
                      onValueChange={(value) => updateSystemSetting('decimal_places', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin decimales</SelectItem>
                        <SelectItem value="2">2 decimales</SelectItem>
                        <SelectItem value="3">3 decimales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_discount">Descuento Máximo (%)</Label>
                    <Input
                      id="max_discount"
                      type="number"
                      min="0"
                      max="100"
                      value={state.systemSettings.max_discount_percentage}
                      onChange={(e) => updateSystemSetting('max_discount_percentage', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Settings */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Configuración de Inventario
                  </CardTitle>
                  <CardDescription>
                    Parámetros del sistema de inventario
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold">Umbral de Stock Bajo</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      min="0"
                      value={state.systemSettings.low_stock_threshold}
                      onChange={(e) => updateSystemSetting('low_stock_threshold', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Cantidad mínima para alertas de stock bajo
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Escáner de Códigos</Label>
                        <p className="text-sm text-muted-foreground">
                          Habilitar lectura de códigos de barras
                        </p>
                      </div>
                      <Switch
                        checked={state.systemSettings.enable_barcode_scanner}
                        onCheckedChange={(checked) => updateSystemSetting('enable_barcode_scanner', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Información de Cliente</Label>
                        <p className="text-sm text-muted-foreground">
                          Requerir datos del cliente en ventas
                        </p>
                      </div>
                      <Switch
                        checked={state.systemSettings.require_customer_info}
                        onCheckedChange={(checked) => updateSystemSetting('require_customer_info', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Programa de Lealtad</Label>
                        <p className="text-sm text-muted-foreground">
                          Sistema de puntos y recompensas
                        </p>
                      </div>
                      <Switch
                        checked={state.systemSettings.enable_loyalty_program}
                        onCheckedChange={(checked) => updateSystemSetting('enable_loyalty_program', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hardware Settings */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Configuración de Hardware
                </CardTitle>
                <CardDescription>
                  Configuración de dispositivos conectados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Impresora de Recibos</Label>
                      <p className="text-sm text-muted-foreground">
                        Imprimir recibos automáticamente
                      </p>
                    </div>
                    <Switch
                      checked={state.systemSettings.enable_receipt_printer}
                      onCheckedChange={(checked) => updateSystemSetting('enable_receipt_printer', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cajón de Dinero</Label>
                      <p className="text-sm text-muted-foreground">
                        Abrir cajón automáticamente
                      </p>
                    </div>
                    <Switch
                      checked={state.systemSettings.enable_cash_drawer}
                      onCheckedChange={(checked) => updateSystemSetting('enable_cash_drawer', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Respaldo Automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Crear respaldos periódicos
                      </p>
                    </div>
                    <Switch
                      checked={state.systemSettings.auto_backup}
                      onCheckedChange={(checked) => updateSystemSetting('auto_backup', checked)}
                    />
                  </div>
                </div>

                {state.systemSettings.auto_backup && (
                  <div className="mt-4 space-y-2">
                    <Label>Frecuencia de Respaldo</Label>
                    <Select
                      value={state.systemSettings.backup_frequency}
                      onValueChange={(value) => updateSystemSetting('backup_frequency', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <PermissionGuard permission="settings.edit">
                  <Button onClick={handleSaveSystemSettings} disabled={state.saving} className="w-full mt-4">
                    {state.saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Configuración del Sistema
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>

            {/* Format and Timezone Settings */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Formato y Zona Horaria
                </CardTitle>
                <CardDescription>
                  Ajusta la visualización de fechas y la zona horaria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Zona Horaria</Label>
                  <Select value={state.systemSettings.timezone} onValueChange={(value) => updateSystemSetting('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Bogota">America/Bogota</SelectItem>
                      <SelectItem value="America/Mexico_City">America/Mexico_City</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato de Fecha</Label>
                  <Select value={state.systemSettings.date_format} onValueChange={(value) => updateSystemSetting('date_format', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato de Hora</Label>
                  <Select value={state.systemSettings.time_format} onValueChange={(value) => updateSystemSetting('time_format', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12h</SelectItem>
                      <SelectItem value="24h">24h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <PermissionGuard permission="settings.edit">
                  <Button onClick={handleSaveSystemSettings} disabled={state.saving} className="w-full">
                    {state.saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Formato y Zona Horaria
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Notifications */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificaciones Personales
                </CardTitle>
                <CardDescription>
                  Controla las notificaciones que recibes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones Generales</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir todas las notificaciones del sistema
                    </p>
                  </div>
                  <Switch
                    checked={state.userSettings.notifications_enabled}
                    onCheckedChange={(checked) => updateUserSetting('notifications_enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones por correo electrónico
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={state.userSettings.email_notifications}
                    onCheckedChange={(checked) => updateUserSetting('email_notifications', checked)}
                    disabled={!state.userSettings.notifications_enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <div>
                      <Label>Push</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones push en el navegador
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={state.userSettings.push_notifications}
                    onCheckedChange={(checked) => updateUserSetting('push_notifications', checked)}
                    disabled={!state.userSettings.notifications_enabled}
                  />
                </div>

                <Button onClick={handleSaveUserSettings} disabled={state.saving} className="w-full">
                  {state.saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Preferencias
                </Button>
              </CardContent>
            </Card>

            {/* System Notifications */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notificaciones del Sistema
                </CardTitle>
                <CardDescription>
                  Configuración de alertas automáticas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <div>
                      <Label>Email del Sistema</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas importantes por email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={state.systemSettings.email_notifications}
                    onCheckedChange={(checked) => updateSystemSetting('email_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <div>
                      <Label>SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas críticas por mensaje de texto
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={state.systemSettings.sms_notifications}
                    onCheckedChange={(checked) => updateSystemSetting('sms_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <div>
                      <Label>Push del Sistema</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones push automáticas
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={state.systemSettings.push_notifications}
                    onCheckedChange={(checked) => updateSystemSetting('push_notifications', checked)}
                  />
                </div>

                <Separator />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Las notificaciones del sistema incluyen alertas de stock bajo,
                    errores críticos y actualizaciones importantes.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleSaveSystemSettings} disabled={state.saving} className="w-full">
                  {state.saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6">
            {/* Password Change */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
                <CardDescription>
                  Actualiza tu contraseña para mantener tu cuenta segura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Contraseña Actual</Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        type={state.showPassword.current ? "text" : "password"}
                        value={state.passwordData.current_password}
                        onChange={(e) => updatePasswordData('current_password', e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {state.showPassword.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={state.showPassword.new ? "text" : "password"}
                        value={state.passwordData.new_password}
                        onChange={(e) => updatePasswordData('new_password', e.target.value)}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {state.showPassword.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={state.showPassword.confirm ? "text" : "password"}
                        value={state.passwordData.confirm_password}
                        onChange={(e) => updatePasswordData('confirm_password', e.target.value)}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {state.showPassword.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={state.saving} className="w-full">
                    {state.saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Cambiar Contraseña
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Security Settings */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Configuración de Seguridad
                  </CardTitle>
                  <CardDescription>
                    Ajustes avanzados de seguridad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticación de Dos Factores</Label>
                      <p className="text-sm text-muted-foreground">
                        Seguridad adicional para tu cuenta
                      </p>
                    </div>
                    <Switch
                      checked={state.securitySettings.two_factor_enabled}
                      onCheckedChange={(checked) => updateSecuritySetting('two_factor_enabled', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Tiempo de Sesión (minutos)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      min="5"
                      max="480"
                      value={state.securitySettings.session_timeout}
                      onChange={(e) => updateSecuritySetting('session_timeout', parseInt(e.target.value) || 30)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_login_attempts">Intentos de Login Máximos</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      min="3"
                      max="10"
                      value={state.securitySettings.max_login_attempts}
                      onChange={(e) => updateSecuritySetting('max_login_attempts', parseInt(e.target.value) || 5)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones de Login</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertar sobre nuevos inicios de sesión
                      </p>
                    </div>
                    <Switch
                      checked={state.securitySettings.enable_login_notifications}
                      onCheckedChange={(checked) => updateSecuritySetting('enable_login_notifications', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Password Policy */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Política de Contraseñas
                  </CardTitle>
                  <CardDescription>
                    Requisitos de seguridad para contraseñas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password_expiry">Expiración de Contraseña (días)</Label>
                    <Input
                      id="password_expiry"
                      type="number"
                      min="30"
                      max="365"
                      value={state.securitySettings.password_expiry_days}
                      onChange={(e) => updateSecuritySetting('password_expiry_days', parseInt(e.target.value) || 90)}
                    />
                    <p className="text-sm text-muted-foreground">
                      0 = Sin expiración
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Forzar Cambio de Contraseña</Label>
                      <p className="text-sm text-muted-foreground">
                        Requerir cambio en el próximo login
                      </p>
                    </div>
                    <Switch
                      checked={state.securitySettings.require_password_change}
                      onCheckedChange={(checked) => updateSecuritySetting('require_password_change', checked)}
                    />
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Las contraseñas deben tener mínimo 8 caracteres, incluir
                      mayúsculas, minúsculas, números y símbolos especiales.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Allowed IP Addresses */}
            <Card className="card-hover md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  IPs Permitidas
                </CardTitle>
                <CardDescription>
                  Limita accesos a direcciones IP específicas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_ip">Agregar IP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new_ip"
                      placeholder="e.g., 192.168.1.10"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                    />
                    <Button variant="outline" onClick={addAllowedIp}>Agregar</Button>
                  </div>
                </div>

                {state.securitySettings.allowed_ip_addresses.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Lista de IPs</Label>
                    <div className="flex flex-wrap gap-2">
                      {state.securitySettings.allowed_ip_addresses.map((ip) => (
                        <div key={ip} className="flex items-center gap-2 border rounded-md px-2 py-1">
                          <span className="text-sm">{ip}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeAllowedIp(ip)}>Eliminar</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay IPs registradas.</p>
                )}

                <PermissionGuard permission="settings.edit">
                  <Button onClick={handleSaveSecuritySettings} disabled={state.saving} className="w-full">
                    {state.saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar IPs Permitidas
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <PermissionGuard permission="settings.edit">
                <Button onClick={handleSaveSecuritySettings} disabled={state.saving}>
                  {state.saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Configuración de Seguridad
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">¿Necesitas ayuda?</h3>
              <p className="text-sm text-muted-foreground">
                Consulta nuestra documentación o contacta soporte técnico
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Documentación
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Soporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}