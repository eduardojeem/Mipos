import { useState } from 'react';
import { Save, CreditCard, Database, Zap, Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import { useSystemSettings, useUpdateSystemSettings, type SystemSettings } from '../hooks/useOptimizedSettings';

export function SystemTab() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});

  // Merge server data with local changes
  const currentSettings = { ...systemSettings, ...localSettings };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(localSettings).length > 0) {
      updateSystemSettings.mutate(localSettings);
      setLocalSettings({});
    }
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="grid gap-8 md:grid-cols-2">
        {/* Format and Timezone Settings with premium card style */}
        <Card className="border-none shadow-xl shadow-indigo-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-5 w-5" />
              </div>
              Región y Formatos
            </CardTitle>
            <CardDescription className="text-base">
              Ajustes de localización y visualización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="timezone" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Zona Horaria</Label>
              <Select
                value={currentSettings.timezone || 'America/Asuncion'}
                onValueChange={(value) => updateSetting('timezone', value)}
              >
                <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
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

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="date_format" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Formato de Fecha</Label>
                <Select
                  // Usar dateFormat del API si existe, sino date_format
                  value={currentSettings.dateFormat || currentSettings.date_format || 'DD/MM/YYYY'}
                  onValueChange={(value) => {
                     updateSetting('date_format', value);
                     updateSetting('dateFormat', value);
                  }}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
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
                <Label htmlFor="time_format" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Formato de Hora</Label>
                <Select
                  // Usar timeFormat del API si existe, sino time_format
                  value={currentSettings.timeFormat || currentSettings.time_format || '24h'}
                  onValueChange={(value) => {
                    updateSetting('time_format', value as '12h' | '24h');
                    updateSetting('timeFormat', value as '12h' | '24h');
                  }}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 Horas</SelectItem>
                    <SelectItem value="12h">12 Horas (AM/PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button with modern style */}
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
              Guardar Configuración Global
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}