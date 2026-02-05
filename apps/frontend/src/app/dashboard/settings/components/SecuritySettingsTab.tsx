import { useState } from 'react';
import { Save, Shield, Lock, Key, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useSecuritySettings, useUpdateSecuritySettings, type SecuritySettings } from '../hooks/useOptimizedSettings';

export function SecuritySettingsTab() {
  const { data: securitySettings, isLoading } = useSecuritySettings();
  const updateSecuritySettings = useUpdateSecuritySettings();
  const [localSettings, setLocalSettings] = useState<Partial<SecuritySettings>>({});

  // Merge server data with local changes
  const currentSettings = { ...securitySettings, ...localSettings };

  const updateSetting = (key: keyof SecuritySettings, value: unknown) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(localSettings).length > 0) {
      updateSecuritySettings.mutate(localSettings);
      setLocalSettings({});
    }
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  // Calculate security score
  const securityScore = [
    currentSettings.require_strong_passwords,
    currentSettings.two_factor_enabled,
    (currentSettings.max_login_attempts || 5) <= 5,
    (currentSettings.session_timeout || 30) <= 30,
  ].filter(Boolean).length;

  const securityLevel = securityScore >= 3 ? 'high' : securityScore >= 2 ? 'medium' : 'low';
  const securityColor = securityLevel === 'high' ? 'text-green-600' : securityLevel === 'medium' ? 'text-amber-600' : 'text-red-600';
  const securityBg = securityLevel === 'high' ? 'bg-green-500/10' : securityLevel === 'medium' ? 'bg-amber-500/10' : 'bg-red-500/10';

  return (
    <div className="space-y-8">
      {/* Security Health Dashboard */}
      <Card className="border-none shadow-xl shadow-emerald-500/5 bg-gradient-to-br from-emerald-500/5 to-transparent backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Shield className="h-5 w-5" />
            </div>
            Estado de Seguridad
          </CardTitle>
          <CardDescription className="text-base">
            Nivel de protección actual del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Puntuación de Seguridad
              </p>
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-black ${securityColor}`}>
                  {securityScore}/4
                </div>
                <Badge className={`${securityBg} ${securityColor} border-none px-4 py-1.5 text-sm font-bold uppercase`}>
                  {securityLevel === 'high' ? 'Excelente' : securityLevel === 'medium' ? 'Bueno' : 'Mejorable'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Contraseñas Fuertes', active: currentSettings.require_strong_passwords },
                { label: '2FA Habilitado', active: currentSettings.two_factor_enabled },
                { label: 'Límite de Intentos', active: (currentSettings.max_login_attempts || 5) <= 5 },
                { label: 'Sesión Segura', active: (currentSettings.session_timeout || 30) <= 30 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  {item.active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Password Policies */}
        <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
                <Lock className="h-5 w-5" />
              </div>
              Políticas de Contraseñas
            </CardTitle>
            <CardDescription className="text-base">
              Requisitos de seguridad para credenciales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-blue-500" />
                  Contraseñas Robustas
                </Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Mínimo 8 caracteres, mayúsculas, números y símbolos
                </p>
              </div>
              <Switch
                checked={currentSettings.require_strong_passwords ?? true}
                onCheckedChange={(checked) => updateSetting('require_strong_passwords', checked)}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password_expiry" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Caducidad de Contraseña (días)
              </Label>
              <Input
                id="password_expiry"
                type="number"
                min="0"
                max="365"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.password_expiry_days || 90}
                onChange={(e) => updateSetting('password_expiry_days', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                0 = sin caducidad. Recomendado: 90 días
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold">Cambio Obligatorio</Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Forzar cambio de contraseña en próximo login
                </p>
              </div>
              <Switch
                checked={currentSettings.require_password_change ?? false}
                onCheckedChange={(checked) => updateSetting('require_password_change', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Access Control */}
        <Card className="border-none shadow-xl shadow-purple-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-purple-600 text-white shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-5 w-5" />
              </div>
              Control de Acceso
            </CardTitle>
            <CardDescription className="text-base">
              Protección contra accesos no autorizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="max_attempts" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Intentos Máximos de Login
              </Label>
              <Input
                id="max_attempts"
                type="number"
                min="1"
                max="10"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.max_login_attempts || 5}
                onChange={(e) => updateSetting('max_login_attempts', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Después de este número, la cuenta se bloqueará temporalmente
              </p>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="lockout_duration" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Duración de Bloqueo (minutos)
              </Label>
              <Input
                id="lockout_duration"
                type="number"
                min="5"
                max="1440"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.lockout_duration || 15}
                onChange={(e) => updateSetting('lockout_duration', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Tiempo que permanecerá bloqueada la cuenta
              </p>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="session_timeout" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Tiempo de Sesión (minutos)
              </Label>
              <Input
                id="session_timeout"
                type="number"
                min="5"
                max="1440"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.session_timeout || 30}
                onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Cierre automático de sesión por inactividad
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="border-none shadow-xl shadow-indigo-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
                <Key className="h-5 w-5" />
              </div>
              Autenticación de Dos Factores
              <Badge variant="outline" className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none px-3 py-1 font-bold">
                PRO
              </Badge>
            </CardTitle>
            <CardDescription className="text-base">
              Capa adicional de seguridad con códigos temporales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  Habilitar 2FA
                </Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Requiere código de verificación adicional al iniciar sesión
                </p>
              </div>
              <Switch
                checked={currentSettings.two_factor_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            <Alert className="bg-indigo-500/5 border-indigo-500/10 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-indigo-600" />
              <AlertDescription className="text-xs text-indigo-800 dark:text-indigo-300">
                La autenticación de dos factores requiere que los usuarios configuren
                una aplicación de autenticación (Google Authenticator, Authy, etc.)
              </AlertDescription>
            </Alert>

            {currentSettings.two_factor_enabled && (
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">
                    2FA Activo
                  </p>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Todos los usuarios deberán configurar 2FA en su próximo inicio de sesión
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login Notifications */}
        <Card className="border-none shadow-xl shadow-amber-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              Alertas de Seguridad
            </CardTitle>
            <CardDescription className="text-base">
              Notificaciones de eventos de acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold">Notificar Inicios de Sesión</Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Enviar email cuando se detecte un nuevo inicio de sesión
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_login_notifications ?? true}
                onCheckedChange={(checked) => updateSetting('enable_login_notifications', checked)}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <Alert className="bg-amber-500/5 border-amber-500/10 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                Las alertas incluyen: nuevos dispositivos, ubicaciones inusuales,
                intentos fallidos de login y cambios de contraseña.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <PermissionGuard permission="settings.edit">
            <Button
              onClick={handleSave}
              disabled={updateSecuritySettings.isPending}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-xl shadow-emerald-500/20 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {updateSecuritySettings.isPending ? (
                <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-3" />
              )}
              Guardar Configuración de Seguridad
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}
