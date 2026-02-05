import { useState } from 'react';
import { Save, Globe, Database, Clock, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useSystemSettings, useUpdateSystemSettings, type SystemSettings } from '../hooks/useOptimizedSettings';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

export function SystemSettingsTab() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});
  const { config: businessConfig } = useBusinessConfig();

  // Merge server data with local changes
  const currentSettings = { ...systemSettings, ...localSettings };
  const fallbackAddress = businessConfig?.address?.street || '';
  const fallbackPhone = businessConfig?.contact?.phone || '';
  const fallbackEmail = businessConfig?.contact?.email || '';

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(localSettings).length > 0) {
      updateSystemSettings.mutate(localSettings);
      setLocalSettings({});
    }
  };

  const applyParaguayDefaults = () => {
    setLocalSettings(prev => ({
      ...prev,
      timezone: 'America/Asuncion',
      language: 'es',
      currency: 'PYG',
      tax_rate: 10,
    }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Company Information */}
        <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-5 w-5" />
              </div>
              Información de la Empresa
            </CardTitle>
            <CardDescription className="text-base">
              Datos básicos que aparecerán en tickets y reportes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="business_name" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre Comercial
              </Label>
              <Input
                id="business_name"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.business_name || ''}
                onChange={(e) => updateSetting('business_name', e.target.value)}
                placeholder="Mi Empresa"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="address" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Dirección Física
              </Label>
              <Textarea
                id="address"
                className="bg-muted/30 border-none resize-none"
                value={currentSettings.address ?? fallbackAddress}
                onChange={(e) => updateSetting('address', e.target.value)}
                placeholder="Calle y número, Barrio, Ciudad"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label htmlFor="phone" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  className="bg-muted/30 border-none h-11"
                  value={currentSettings.phone ?? fallbackPhone}
                  onChange={(e) => updateSetting('phone', e.target.value)}
                  placeholder="+595 21 123 4567"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-muted/30 border-none h-11"
                  value={currentSettings.email ?? fallbackEmail}
                  onChange={(e) => updateSetting('email', e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Configuration */}
        <Card className="border-none shadow-xl shadow-amber-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-5 w-5" />
              </div>
              Configuración Regional
            </CardTitle>
            <CardDescription className="text-base">
              Localización, moneda y formatos del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  Ajuste Rápido Paraguay
                </h4>
                <p className="text-xs text-muted-foreground leading-tight">
                  Configura automáticamente moneda (PYG), IVA (10%) y horario local.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={applyParaguayDefaults}
                className="rounded-xl border-primary/20 hover:bg-primary/10 shrink-0"
              >
                Aplicar
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <Label htmlFor="timezone" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Zona Horaria
                </Label>
                <Select
                  value={currentSettings.timezone || 'America/Asuncion'}
                  onValueChange={(value) => updateSetting('timezone', value)}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Asuncion">🇵🇾 Asunción (GMT-4)</SelectItem>
                    <SelectItem value="America/Argentina/Buenos_Aires">🇦🇷 Buenos Aires (GMT-3)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">🇧🇷 São Paulo (GMT-3)</SelectItem>
                    <SelectItem value="UTC">🌐 UTC (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="currency" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Moneda Base
                </Label>
                <Select
                  value={currentSettings.currency || 'PYG'}
                  onValueChange={(value) => updateSetting('currency', value)}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PYG">Guaraní Paraguayo (₲)</SelectItem>
                    <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                    <SelectItem value="BRL">Real Brasileño (R$)</SelectItem>
                    <SelectItem value="ARS">Peso Argentino ($)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/20 border">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Cambiar la moneda base puede afectar el historial de reportes financieros anteriores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Formato de Fecha
                  </Label>
                  <Select
                    value={currentSettings.date_format || 'DD/MM/YYYY'}
                    onValueChange={(value) => updateSetting('date_format', value)}
                  >
                    <SelectTrigger className="bg-muted/30 border-none h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Formato de Hora
                  </Label>
                  <Select
                    value={currentSettings.time_format || '24h'}
                    onValueChange={(value) => updateSetting('time_format', value as '12h' | '24h')}
                  >
                    <SelectTrigger className="bg-muted/30 border-none h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 Horas</SelectItem>
                      <SelectItem value="12h">12 Horas (AM/PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backups and Maintenance */}
        <Card className="border-none shadow-xl shadow-indigo-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
                <Database className="h-5 w-5" />
              </div>
              Respaldos y Mantenimiento
            </CardTitle>
            <CardDescription className="text-base">
              Protección de datos y optimización del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-green-500" />
                  Respaldo Automático
                </Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Garantiza la integridad de tus datos diariamente.
                </p>
              </div>
              <Switch
                checked={currentSettings.auto_backup ?? false}
                onCheckedChange={(checked) => updateSetting('auto_backup', checked)}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Frecuencia de Respaldo
              </Label>
              <Select
                value={currentSettings.backup_frequency || 'daily'}
                onValueChange={(value) => updateSetting('backup_frequency', value)}
              >
                <SelectTrigger className="bg-muted/30 border-none h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Cada hora (Alta seguridad)</SelectItem>
                  <SelectItem value="daily">Diario (Recomendado)</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end animate-in slide-in-from-bottom-4 duration-500">
          <PermissionGuard permission="settings.edit">
            <Button
              onClick={handleSave}
              disabled={updateSystemSettings.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {updateSystemSettings.isPending ? (
                <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-3" />
              )}
              Guardar Configuración del Sistema
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}
