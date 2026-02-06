'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SuperAdminGuard } from '../../components/SuperAdminGuard';
import { useOrganization } from '../../hooks/useOrganization';
import { useUsers } from '../../hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  ArrowLeft, 
  Building2, 
  Save, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  Activity,
  Globe,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  Zap,
  XCircle,
  Clock,
  MoreVertical,
  RefreshCcw
} from 'lucide-react';
import { AdminUser } from '../../hooks/useUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Memoized user row component to prevent unnecessary re-renders
const UserRow = memo(function UserRow({ user }: { user: AdminUser }) {
  return (
    <TableRow className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-50 dark:border-slate-800/50">
      <TableCell className="px-12 py-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-black text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-all">
            {(user.full_name || user.email)[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{user.full_name || 'Sin Nombre'}</span>
            <span className="text-xs text-slate-400 font-mono italic">{user.email}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="rounded-lg px-3 py-1 font-bold uppercase text-[9px] tracking-widest border-none bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        {user.is_active ? (
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            ONLINE
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs italic">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            OFFLINE
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs font-bold text-slate-400 font-mono tracking-tighter">
        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'NUNCA'}
      </TableCell>
      <TableCell className="px-12 text-right">
        <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
          <MoreVertical className="h-4 w-4 text-slate-400" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

// Settings Tab Component with Editable Interface
const SettingsTab = memo(function SettingsTab({ 
  organization, 
  onSave 
}: { 
  organization: { id: string; settings: Record<string, unknown> }; 
  onSave: () => void;
}) {
  const [settings, setSettings] = useState(organization.settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/superadmin/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) throw new Error('Error al guardar configuración');

      alert('✅ Configuración actualizada correctamente');
      onSave();
    } catch (error) {
      alert('❌ Error al guardar: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (parent: string, key: string, value: string | number | boolean) => {
    setSettings((prev: Record<string, unknown>) => ({
      ...prev,
      [parent]: {
        ...((prev[parent] as Record<string, unknown>) || {}),
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header con botón de guardado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración Avanzada</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestiona features, límites y configuraciones técnicas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRaw(!showRaw)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {showRaw ? 'Vista Visual' : 'Vista JSON'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {showRaw ? (
        // Vista JSON raw (como antes)
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Configuración JSON
            </CardTitle>
            <CardDescription>Vista técnica del objeto de configuración</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">
                  Configuration Object
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
                    alert('✅ JSON copiado al portapapeles');
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Copiar JSON
                </Button>
              </div>
              <pre className="text-slate-300 font-mono text-xs leading-relaxed max-h-[500px] overflow-auto">
                {JSON.stringify(settings, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Vista Visual Editable
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Features Habilitadas */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-blue-600" />
                Features Habilitadas
              </CardTitle>
              <CardDescription>Activa o desactiva funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Multi-sucursal</p>
                  <p className="text-xs text-slate-500">Permite múltiples ubicaciones</p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.features?.multi_branch || false}
                    onChange={(e) => updateNestedSetting('features', 'multi_branch', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </Label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Inventario Avanzado</p>
                  <p className="text-xs text-slate-500">Control de stock y alertas</p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.features?.advanced_inventory || false}
                    onChange={(e) => updateNestedSetting('features', 'advanced_inventory', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </Label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Reportes Personalizados</p>
                  <p className="text-xs text-slate-500">Exportar y personalizar reportes</p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.features?.custom_reports || false}
                    onChange={(e) => updateNestedSetting('features', 'custom_reports', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </Label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">API Access</p>
                  <p className="text-xs text-slate-500">Integración con APIs externas</p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.features?.api_access || false}
                    onChange={(e) => updateNestedSetting('features', 'api_access', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Límites y Cuotas */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-emerald-600" />
                Límites y Cuotas
              </CardTitle>
              <CardDescription>Configura los límites del plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Usuarios Máximos
                </Label>
                <Input
                  type="number"
                  value={settings.limits?.max_users || 0}
                  onChange={(e) => updateNestedSetting('limits', 'max_users', parseInt(e.target.value))}
                  className="font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Sucursales Máximas
                </Label>
                <Input
                  type="number"
                  value={settings.limits?.max_branches || 0}
                  onChange={(e) => updateNestedSetting('limits', 'max_branches', parseInt(e.target.value))}
                  className="font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Productos Máximos
                </Label>
                <Input
                  type="number"
                  value={settings.limits?.max_products || 0}
                  onChange={(e) => updateNestedSetting('limits', 'max_products', parseInt(e.target.value))}
                  className="font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Almacenamiento (GB)
                </Label>
                <Input
                  type="number"
                  value={settings.limits?.storage_gb || 0}
                  onChange={(e) => updateNestedSetting('limits', 'storage_gb', parseInt(e.target.value))}
                  className="font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuración Regional */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-purple-600" />
                Configuración Regional
              </CardTitle>
              <CardDescription>Idioma, moneda y zona horaria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={settings.regional?.language || 'es'}
                  onValueChange={(value) => updateNestedSetting('regional', 'language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={settings.regional?.currency || 'CLP'}
                  onValueChange={(value) => updateNestedSetting('regional', 'currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zona Horaria</Label>
                <Select
                  value={settings.regional?.timezone || 'America/Santiago'}
                  onValueChange={(value) => updateNestedSetting('regional', 'timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Santiago">Santiago (GMT-3)</SelectItem>
                    <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Configuración Técnica */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
                Configuración Técnica
              </CardTitle>
              <CardDescription>Parámetros técnicos y notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Notificaciones Email</p>
                  <p className="text-xs text-slate-500">Enviar notificaciones por correo</p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.email || false}
                    onChange={(e) => updateNestedSetting('notifications', 'email', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                </Label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Notificaciones SMS</p>
                  <p className="text-xs text-slate-500">Alertas por mensaje de texto</p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.sms || false}
                    onChange={(e) => updateNestedSetting('notifications', 'sms', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Email de Soporte</Label>
                <Input
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => updateSetting('support_email', e.target.value)}
                  placeholder="soporte@organizacion.com"
                />
              </div>

              <div className="space-y-2">
                <Label>API Rate Limit (requests/min)</Label>
                <Input
                  type="number"
                  value={settings.api_rate_limit || 60}
                  onChange={(e) => updateSetting('api_rate_limit', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warning Footer */}
      <div className="flex items-start gap-4 p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-amber-900 dark:text-amber-100">
            ⚠️ Cambios Críticos
          </p>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            Los cambios en esta sección afectan directamente las capacidades de la organización.
            Asegúrate de que los límites sean coherentes con el plan contratado.
          </p>
        </div>
      </div>
    </div>
  );
});


export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { 
    organization, 
    loading: orgLoading, 
    updating: orgUpdating,
    updateOrganization,
    error: orgError,
    refresh: refreshOrg
  } = useOrganization(id);

  const {
    users,
    loading: usersLoading,
    totalCount: usersCount,
    error: usersError,
    refresh: refreshUsers
  } = useUsers({
    filters: { organization: [id] },
    pageSize: 100
  });

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subdomain: '',
    custom_domain: '',
  });

  // Update form data when organization loads
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        slug: organization.slug || '',
        subdomain: organization.subdomain || '',
        custom_domain: organization.custom_domain || '',
      });
    }
  }, [organization]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleUpdateGeneral = useCallback(async () => {
    await updateOrganization({
      name: formData.name,
      slug: formData.slug,
      subdomain: formData.subdomain,
      custom_domain: formData.custom_domain || null,
    });
  }, [formData.name, formData.slug, formData.subdomain, formData.custom_domain, updateOrganization]);

  const handleStatusChange = useCallback(async (value: string) => {
    await updateOrganization({ subscription_status: value });
  }, [updateOrganization]);

  const handlePlanChange = async (value: string) => {
    await updateOrganization({ subscription_plan: value });
  };

  const orgSettings = useMemo(() => organization?.settings as Record<string, unknown> || {}, [organization]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ACTIVE': 
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 flex gap-1.5 items-center px-4 py-1.5 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activa</Badge>;
      case 'TRIAL': 
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 flex gap-1.5 items-center px-4 py-1.5 rounded-full"><Clock className="w-3.5 h-3.5" /> En Prueba</Badge>;
      case 'SUSPENDED': 
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 flex gap-1.5 items-center px-4 py-1.5 rounded-full"><XCircle className="w-3.5 h-3.5" /> Suspendida</Badge>;
      default: 
        return <Badge variant="outline" className="px-4 py-1.5 rounded-full uppercase">{status}</Badge>;
    }
  };

  if (orgLoading && !organization) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[600px] flex-col gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
          <p className="text-slate-500 font-medium animate-pulse">Invocando el núcleo MiPOS...</p>
        </div>
      </SuperAdminGuard>
    );
  }

  if (orgError) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Error de Conexión</h2>
            <p className="text-slate-500 mt-2">{orgError}</p>
          </div>
          <Button 
            className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold gap-2"
            onClick={() => refreshOrg()}
          >
            <RefreshCcw className="h-4 w-4" /> Reintentar Sincronización
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  if (!organization) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Organización Perdida</h2>
            <p className="text-slate-500 mt-2">No pudimos encontrar el registro que buscas. Es posible que haya sido eliminada o que el ID sea incorrecto.</p>
          </div>
          <Button 
            className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold"
            onClick={() => router.push('/superadmin/organizations')}
          >
            Volver al Centro de Control
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/superadmin/organizations')}
            className="group gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Control de Organizaciones
          </Button>
          
          <div className="flex items-center gap-3">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <DropdownMenuLabel>Acciones Especiales</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600 font-bold">
                  <XCircle className="mr-2 h-4 w-4" /> Suspender Inmediato
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" /> Historial de Pagos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="bg-rose-50 dark:bg-rose-950/30 text-rose-700">
                  <Zap className="mr-2 h-4 w-4" /> Resetear Configuración
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              className="bg-slate-600 hover:bg-slate-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg"
              onClick={handleUpdateGeneral}
              disabled={orgUpdating}
            >
              {orgUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Aplicar Cambios
            </Button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                <Building2 className="h-12 w-12 md:h-16 md:w-16 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight">{organization.name}</h1>
                  {getStatusBadge(organization.subscription_status)}
                </div>
                <div className="flex items-center gap-4 text-white/60 font-medium">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full text-sm">
                    <Globe className="h-3.5 w-3.5" />
                    {organization.subdomain ? `${organization.subdomain}.tudominio.com` : `mipos.app/${organization.slug}`}
                  </div>
                  {organization.custom_domain && (
                    <div className="flex items-center gap-1.5 bg-purple-500/20 px-3 py-1 rounded-full text-sm text-purple-300 border border-purple-400/30">
                      <Globe className="h-3.5 w-3.5" />
                      {organization.custom_domain}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full text-sm">
                    <Activity className="h-3.5 w-3.5" />
                    ID: {organization.id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-center min-w-[140px]">
                <Users className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                <div className="text-2xl font-black">{usersCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Usuarios Unificados</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-center min-w-[140px]">
                <Zap className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-black">{organization.subscription_plan}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Nivel de Plan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="vista_general" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-900 border-none p-1.5 rounded-2xl h-14 mb-8">
            <TabsTrigger value="vista_general" className="rounded-xl px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md">Vista General</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-8 font-bold">Comunidad</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl px-8 font-bold">Suscripción</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl px-8 font-bold">Arquitectura</TabsTrigger>
          </TabsList>

          {/* Tab: Vista General */}
          <TabsContent value="vista_general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">
                    <Building2 className="h-4 w-4" /> Perfil Corporativo
                  </div>
                  <CardTitle className="text-2xl font-black">Información Esencial</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Nombre Legal / Comercial</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl h-12 font-medium"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Identificador único (Slug)</Label>
                        <div className="relative">
                          <Input 
                            value={formData.slug} 
                            onChange={(e) => setFormData({...formData, slug: e.target.value})}
                            className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl h-12 font-medium pl-10"
                          />
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                      
                      {/* NUEVO: Subdomain */}
                      <div className="grid gap-2">
                        <Label className="text-xs uppercase font-bold text-blue-600 tracking-wider flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          Subdominio (Tienda Pública)
                        </Label>
                        <div className="relative">
                          <Input 
                            value={formData.subdomain} 
                            onChange={(e) => setFormData({...formData, subdomain: e.target.value})}
                            className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 rounded-xl h-12 font-medium pl-10"
                            placeholder="mi-tienda"
                          />
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {formData.subdomain || 'mi-tienda'}.tudominio.com
                          </span>
                        </p>
                      </div>
                      
                      {/* NUEVO: Custom Domain */}
                      <div className="grid gap-2">
                        <Label className="text-xs uppercase font-bold text-purple-600 tracking-wider flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          Dominio Personalizado (Premium)
                        </Label>
                        <div className="relative">
                          <Input 
                            value={formData.custom_domain} 
                            onChange={(e) => setFormData({...formData, custom_domain: e.target.value})}
                            className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 rounded-xl h-12 font-medium pl-10"
                            placeholder="www.mi-tienda.com"
                          />
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                        </div>
                        <p className="text-xs text-slate-500">
                          Opcional. Requiere configuración DNS del cliente.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Registrada en MiPOS</div>
                          <div className="text-lg font-black text-slate-700 dark:text-slate-200">
                            {new Date(organization.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Estado del Ecosistema</div>
                          {getStatusBadge(organization.subscription_status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
                <CardHeader className="p-8">
                  <div className="flex items-center gap-3 text-blue-600 font-bold uppercase tracking-widest text-xs mb-2">
                    <ShieldCheck className="h-4 w-4" /> Seguridad y Contacto
                  </div>
                  <CardTitle className="text-2xl font-black">Admin Contact</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Corporativo</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{(orgSettings.contactInfo as Record<string, string>)?.email || 'sin_email@mipos.app'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Phone className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Línea de Servicio</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{(orgSettings.contactInfo as Record<string, string>)?.phone || 'No registrado'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="outline" className="w-full rounded-xl gap-2 font-bold h-12">
                      <Settings className="h-4 w-4" />
                      Ver bitácora de actividad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Comunidad (Users) */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="p-8 md:p-12 pb-6 border-b border-slate-50 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                      Comunidad Activa
                      <Badge className="bg-slate-600 text-white rounded-lg px-3 py-1">{usersCount}</Badge>
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Gestión de usuarios y talentos asociados a esta organización.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => refreshUsers()}
                      disabled={usersLoading}
                    >
                      <RefreshCcw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold h-11 px-8">
                      Vincular Usuario
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersError ? (
                  <div className="flex justify-center p-20 flex-col items-center gap-4 text-center">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                    <p className="text-slate-500 font-medium">{usersError}</p>
                    <Button onClick={() => refreshUsers()} variant="outline">Reintentar Carga</Button>
                  </div>
                ) : usersLoading ? (
                  <div className="flex justify-center p-20 flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                    <span className="font-bold text-slate-300 uppercase tracking-widest">Sincronizando Nómina...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow className="border-slate-100 dark:border-slate-800">
                          <TableHead className="px-12 py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Usuario</TableHead>
                          <TableHead className="py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Jerarquía</TableHead>
                          <TableHead className="py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estatus</TableHead>
                          <TableHead className="py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Última Pulsación</TableHead>
                          <TableHead className="px-12 py-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-24">
                              <div className="flex flex-col items-center opacity-40">
                                <Users className="h-16 w-16 mb-4" />
                                <p className="text-xl font-black tracking-tight uppercase">Vacío Cognitivo</p>
                                <p className="text-sm">No hay mentes conectadas a este nodo todavía.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (users as AdminUser[]).map((user) => (
                            <UserRow key={user.id} user={user} />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Subscription */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 md:p-12">
                <div className="flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-widest text-xs mb-2">
                  <Activity className="h-4 w-4" /> Flujo de Ingresos
                </div>
                <CardTitle className="text-3xl font-black">Plan y Salud Financiera</CardTitle>
              </CardHeader>
              <CardContent className="p-8 md:p-12 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <Label className="text-xs uppercase font-black text-slate-400 tracking-[0.2em]">Estado de Suscripción</Label>
                        <Select 
                          value={organization.subscription_status} 
                          onValueChange={handleStatusChange}
                          disabled={orgUpdating}
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none px-6 font-bold text-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                            <SelectItem value="ACTIVE" className="rounded-xl h-11">🟢 Suscripción Activa</SelectItem>
                            <SelectItem value="TRIAL" className="rounded-xl h-11">🔵 Período de Prueba</SelectItem>
                            <SelectItem value="PAST_DUE" className="rounded-xl h-11">🟠 Vencimiento Próximo</SelectItem>
                            <SelectItem value="CANCELED" className="rounded-xl h-11">🔴 Cancelada por Usuario</SelectItem>
                            <SelectItem value="SUSPENDED" className="rounded-xl h-11">⛔ Suspensión de SuperAdmin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs uppercase font-black text-slate-400 tracking-[0.2em]">Nivel Tecnológico (Plan)</Label>
                        <Select 
                          value={organization.subscription_plan} 
                          onValueChange={handlePlanChange}
                          disabled={orgUpdating}
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-none px-6 font-bold text-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                            <SelectItem value="FREE" className="rounded-xl h-11">SaaS MiPOS - Gratuito</SelectItem>
                            <SelectItem value="STARTER" className="rounded-xl h-11">SaaS MiPOS - Starter</SelectItem>
                            <SelectItem value="PRO" className="rounded-xl h-11">SaaS MiPOS - Professional</SelectItem>
                            <SelectItem value="PROFESSIONAL" className="rounded-xl h-11">SaaS MiPOS - Professional (Old)</SelectItem>
                            <SelectItem value="ENTERPRISE" className="rounded-xl h-11">SaaS MiPOS - Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/20 blur-[60px] rounded-full group-hover:bg-slate-500/40 transition-all duration-700" />
                      <div className="relative z-10 space-y-8">
                        <div>
                          <CreditCard className="h-10 w-10 text-slate-400 mb-4" />
                          <h4 className="text-xl font-black mb-1">Nexo Stripe</h4>
                          <p className="text-slate-400 text-sm font-medium">Sincronización directa con pasarela de pagos.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Customer ID Proyectado</div>
                          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs overflow-hidden text-ellipsis group-hover:bg-white/10 transition-colors">
                            {orgSettings.stripeCustomerId as string || 'PENDIENTE_DE_SYNC'}
                          </div>
                        </div>

                        <div className="pt-4">
                          <Button className="w-full h-12 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 shadow-xl shadow-white/5">
                            Sincronizar con Stripe
                          </Button>
                        </div>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Settings - Rediseñado */}
          <TabsContent value="settings" className="space-y-6">
            <SettingsTab organization={organization} onSave={() => {
              // Trigger refresh
              window.location.reload();
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminGuard>
  );
}
