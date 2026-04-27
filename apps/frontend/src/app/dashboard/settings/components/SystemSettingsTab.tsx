import { useState } from 'react';
import { Clock3, Database, Globe2, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useSystemSettings, useUpdateSystemSettings, type SystemSettings } from '../hooks/useOptimizedSettings';

export function SystemSettingsTab() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});

  const currentSettings = { ...systemSettings, ...localSettings };
  const hasChanges = Object.keys(localSettings).length > 0;

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!hasChanges) return;
    const changes = { ...localSettings };
    updateSystemSettings.mutate(changes, {
      onSuccess: () => setLocalSettings({}),
    });
  };

  const applyParaguayDefaults = () => {
    setLocalSettings((prev) => ({
      ...prev,
      timezone: 'America/Asuncion',
      currency: 'PYG',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      backup_frequency: 'daily',
    }));
  };

  if (isLoading) {
    return <div className="h-72 rounded-3xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-3xl border-border/50 bg-white/90 dark:bg-zinc-900/80 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Globe2 className="h-5 w-5" />
              </span>
              Sistema
            </CardTitle>
            <CardDescription>
              Dejamos solo lo operativo: region, formato y respaldo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/20 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Configuracion recomendada</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Aplica moneda, horario y formatos usuales para Paraguay.</p>
              </div>
              <Button variant="outline" className="rounded-2xl" onClick={applyParaguayDefaults}>
                Aplicar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Zona horaria</Label>
                <Select value={currentSettings.timezone || 'America/Asuncion'} onValueChange={(value) => updateSetting('timezone', value)}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Asuncion">Asuncion</SelectItem>
                    <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires</SelectItem>
                    <SelectItem value="America/Sao_Paulo">Sao Paulo</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={currentSettings.currency || 'PYG'} onValueChange={(value) => updateSetting('currency', value)}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PYG">PYG</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato de fecha</Label>
                <Select value={currentSettings.date_format || 'DD/MM/YYYY'} onValueChange={(value) => updateSetting('date_format', value)}>
                  <SelectTrigger className="h-12 rounded-2xl">
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
                <Label>Formato de hora</Label>
                <Select value={currentSettings.time_format || '24h'} onValueChange={(value) => updateSetting('time_format', value as '12h' | '24h')}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 horas</SelectItem>
                    <SelectItem value="12h">12 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-slate-950 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Database className="h-5 w-5" />
              Respaldo
            </CardTitle>
            <CardDescription className="text-slate-300">
              Mantenlo simple y automatico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Backup automatico</p>
                <p className="text-xs text-slate-300">Protege tus datos sin intervenir.</p>
              </div>
              <Switch
                checked={currentSettings.auto_backup ?? true}
                onCheckedChange={(checked) => updateSetting('auto_backup', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Frecuencia</Label>
              <Select value={currentSettings.backup_frequency || 'daily'} onValueChange={(value) => updateSetting('backup_frequency', value)}>
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 font-medium text-white">
                <Clock3 className="h-4 w-4" />
                Recomendacion
              </div>
              <p className="mt-2">Usa respaldo diario salvo que tu operacion sea muy liviana.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <PermissionGuard permission="settings.edit">
            <Button onClick={handleSave} disabled={updateSystemSettings.isPending} className="h-12 rounded-2xl px-6">
              {updateSystemSettings.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar sistema
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}
