import { useState } from 'react';
import { Save, Lock, Shield, Globe, Eye, EyeOff, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [newIp, setNewIp] = useState('');

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

  const isValidIp = (ip: string) => {
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return ipv4Regex.test(ip);
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
    if (currentSettings.allowed_ip_addresses?.includes(ip)) {
      toast({
        title: 'Duplicado',
        description: 'Esta IP ya está en la lista de permitidas',
        variant: 'destructive'
      });
      return;
    }
    updateSetting('allowed_ip_addresses', [...(currentSettings.allowed_ip_addresses || []), ip]);
    setNewIp('');
  };

  const removeAllowedIp = (ip: string) => {
    updateSetting('allowed_ip_addresses',
      (currentSettings.allowed_ip_addresses || []).filter(i => i !== ip)
    );
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
              Blindaje de Cuenta
            </CardTitle>
            <CardDescription className="text-base">
              Configuraciones avanzadas de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-200">2FA (Doble Factor)</p>
                <p className="text-xs text-muted-foreground">Autenticación de paso extra</p>
              </div>
              <Switch
                checked={currentSettings.two_factor_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="session_timeout" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timeout Sesión</Label>
                <Input
                  id="session_timeout"
                  type="number"
                  className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600"
                  value={currentSettings.session_timeout || 30}
                  onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value) || 30)}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="max_login_attempts" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Intentos Max</Label>
                <Input
                  id="max_login_attempts"
                  type="number"
                  className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600"
                  value={currentSettings.max_login_attempts || 5}
                  onChange={(e) => updateSetting('max_login_attempts', parseInt(e.target.value) || 5)}
                />
              </div>
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

        {/* Password Policy with premium card style */}
        <Card className="border-none shadow-xl shadow-amber-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform duration-300">
                <Lock className="h-5 w-5" />
              </div>
              Directivas Robustas
            </CardTitle>
            <CardDescription className="text-base">
              Requisitos de cumplimiento para claves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="password_expiry" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Expiración (Días)</Label>
              <Input
                id="password_expiry"
                type="number"
                className="bg-muted/30 border-none h-11 focus-visible:ring-amber-600"
                value={currentSettings.password_expiry_days || 90}
                onChange={(e) => updateSetting('password_expiry_days', parseInt(e.target.value) || 90)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Rotación Forzada</p>
                <p className="text-xs text-muted-foreground">Cambio en próximo inicio</p>
              </div>
              <Switch
                checked={currentSettings.require_password_change ?? false}
                onCheckedChange={(checked) => updateSetting('require_password_change', checked)}
              />
            </div>

            <Alert className="bg-amber-500/5 border-amber-500/10 rounded-xl">
              <CheckCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                Las políticas se aplican a todos los perfiles de usuario
                vinculados a esta instancia de Mipos.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Allowed IP Addresses with premium card style */}
      <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-601/20 group-hover:scale-110 transition-transform duration-300">
              <Globe className="h-5 w-5" />
            </div>
            Acceso Geográfico e IPs
          </CardTitle>
          <CardDescription className="text-base">
            Whitelist de conexiones autorizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2.5">
              <Label htmlFor="new_ip" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Nueva IP IPv4</Label>
              <Input
                id="new_ip"
                placeholder="201.217.45.XXX"
                className="bg-muted/30 border-none h-11 focus-visible:ring-blue-600"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={addAllowedIp} className="h-11 border-blue-200 hover:bg-blue-50 text-blue-600 px-8 rounded-xl">
              Autorizar IP
            </Button>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Direcciones en Lista Blanca</Label>
            {(currentSettings.allowed_ip_addresses?.length || 0) > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {currentSettings.allowed_ip_addresses?.map((ip) => (
                  <div key={ip} className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 animate-in zoom-in-50 duration-300">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{ip}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-500/20 hover:text-red-600" onClick={() => removeAllowedIp(ip)}>
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed text-muted-foreground italic text-sm">
                No hay restricciones por IP. Se permite el acceso global.
              </div>
            )}
          </div>

          <Alert className="bg-blue-500/5 border-blue-500/10 rounded-xl">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
              Recomendación: Agrega la IP fija de tu local para prevenir accesos no autorizados desde otras ubicaciones.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

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