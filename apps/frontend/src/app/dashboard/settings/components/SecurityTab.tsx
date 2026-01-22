import { useState } from 'react';
import { Save, Lock, Shield, Globe, Eye, EyeOff, CheckCircle, Info } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
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
                  type={showPassword.current ? "text" : "password"}
                  value={passwordData.current_password}
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
                  {showPassword.current ? (
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
                  type={showPassword.new ? "text" : "password"}
                  value={passwordData.new_password}
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
                  {showPassword.new ? (
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
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordData.confirm_password}
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
                  {showPassword.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={changePassword.isPending} className="w-full">
              {changePassword.isPending ? (
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
        <Card>
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
                checked={currentSettings.two_factor_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_timeout">Tiempo de Sesión (minutos)</Label>
              <Input
                id="session_timeout"
                type="number"
                min="5"
                max="480"
                value={currentSettings.session_timeout || 30}
                onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value) || 30)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_login_attempts">Intentos de Login Máximos</Label>
              <Input
                id="max_login_attempts"
                type="number"
                min="3"
                max="10"
                value={currentSettings.max_login_attempts || 5}
                onChange={(e) => updateSetting('max_login_attempts', parseInt(e.target.value) || 5)}
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
                checked={currentSettings.enable_login_notifications ?? true}
                onCheckedChange={(checked) => updateSetting('enable_login_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card>
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
                value={currentSettings.password_expiry_days || 90}
                onChange={(e) => updateSetting('password_expiry_days', parseInt(e.target.value) || 90)}
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
                checked={currentSettings.require_password_change ?? false}
                onCheckedChange={(checked) => updateSetting('require_password_change', checked)}
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
      <Card>
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

          {(currentSettings.allowed_ip_addresses?.length || 0) > 0 ? (
            <div className="space-y-2">
              <Label>Lista de IPs</Label>
              <div className="flex flex-wrap gap-2">
                {currentSettings.allowed_ip_addresses?.map((ip) => (
                  <div key={ip} className="flex items-center gap-2 border rounded-md px-2 py-1">
                    <span className="text-sm">{ip}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeAllowedIp(ip)}>
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay IPs registradas.</p>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Si no hay IPs configuradas, se permite el acceso desde cualquier dirección.
              Configura IPs específicas para mayor seguridad.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <PermissionGuard permission="settings.edit">
          <Button 
            onClick={handleSave} 
            disabled={updateSecuritySettings.isPending} 
            className="w-full"
          >
            {updateSecuritySettings.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración de Seguridad
          </Button>
        </PermissionGuard>
      )}
    </div>
  );
}