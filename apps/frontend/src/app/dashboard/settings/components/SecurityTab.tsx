import { useState } from 'react';
import { Save, Lock, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import {
  useSecuritySettings,
  useUpdateSecuritySettings,
  useChangePassword,
  type SecuritySettings
} from '../hooks/useOptimizedSettings';

export function SecurityTab() {
  const { data: securitySettings, isLoading } = useSecuritySettings();
  const updateSecuritySettings = useUpdateSecuritySettings();
  const changePassword = useChangePassword();
  const { toast } = useToast();

  const [localSettings, setLocalSettings] = useState<Partial<SecuritySettings>>({});
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Merge server data with local changes
  const currentSettings = { ...securitySettings, ...localSettings };

  const updateSetting = (key: keyof SecuritySettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(localSettings).length > 0) {
      updateSecuritySettings.mutate(localSettings);
      setLocalSettings({});
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 8 caracteres',
        variant: 'destructive'
      });
      return;
    }

    changePassword.mutate({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password
    }, {
      onSuccess: () => {
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      }
    });
  };

  const updatePasswordData = (key: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Password Change with premium card style */}
      <Card className="border-none shadow-xl shadow-red-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-red-600 text-white shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform duration-300">
              <Lock className="h-5 w-5" />
            </div>
            Gestión de Acceso
          </CardTitle>
          <CardDescription className="text-base">
            Protege tu cuenta con una contraseña robusta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2.5">
                <Label htmlFor="current_password" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Actual</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showPassword.current ? "text" : "password"}
                    value={passwordData.current_password}
                    onChange={(e) => updatePasswordData('current_password', e.target.value)}
                    required
                    className="bg-muted/30 border-none h-11 pr-10 focus-visible:ring-red-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="new_password" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Nueva</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPassword.new ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => updatePasswordData('new_password', e.target.value)}
                    required
                    minLength={8}
                    className="bg-muted/30 border-none h-11 pr-10 focus-visible:ring-red-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="confirm_password" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Confirmar</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showPassword.confirm ? "text" : "password"}
                    value={passwordData.confirm_password}
                    onChange={(e) => updatePasswordData('confirm_password', e.target.value)}
                    required
                    minLength={8}
                    className="bg-muted/30 border-none h-11 pr-10 focus-visible:ring-red-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground italic max-w-sm">
                * Mínimo 8 caracteres, incluye mayúsculas, minúsculas, números y símbolos especiales para mayor seguridad.
              </p>
              <Button type="submit" disabled={changePassword.isPending} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 rounded-xl px-8 h-12 font-bold transition-all">
                {changePassword.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Actualizar Contraseña
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Security Settings with premium card style */}
        <Card className="border-none shadow-xl shadow-emerald-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-5 w-5" />
              </div>
              Protección de Sesión
            </CardTitle>
            <CardDescription className="text-base">
              Configuración de tiempo de espera y 2FA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="session_timeout" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tiempo de Expiración (Minutos)</Label>
              <Input
                id="session_timeout"
                type="number"
                className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600"
                value={currentSettings.session_timeout || 30}
                onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value) || 30)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Doble Factor (2FA)</p>
                <p className="text-xs text-muted-foreground">Requiere código extra al iniciar</p>
              </div>
              <Switch
                checked={currentSettings.two_factor_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Avisos de Login</p>
                <p className="text-xs text-muted-foreground">Alertar sobre nuevos inicios</p>
              </div>
              <Switch
                checked={currentSettings.enable_login_notifications ?? true}
                onCheckedChange={(checked) => updateSetting('enable_login_notifications', checked)}
              />
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
              disabled={updateSecuritySettings.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {updateSecuritySettings.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Blindar Mi Cuenta
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}