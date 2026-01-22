'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Shield, Database, Mail, Users, Clock, AlertTriangle } from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';

interface SystemSettingsFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

export function SystemSettingsForm({ config, onUpdate }: SystemSettingsFormProps) {
  const { getFieldError } = useConfigValidation();

  const handleSystemSettingsChange = (field: keyof NonNullable<BusinessConfig['systemSettings']>, value: any) => {
    // Provide default values to ensure all required properties are present
    const defaultSystemSettings = {
      autoBackup: false,
      backupFrequency: 'daily' as const,
      maxUsers: 50,
      sessionTimeout: 30,
      enableLogging: true,
      logLevel: 'info' as const,
      security: {
        requireStrongPasswords: true,
        enableTwoFactor: false,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      email: {
        provider: 'smtp' as const,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: ''
      }
    };

    onUpdate({
      systemSettings: {
        ...defaultSystemSettings,
        ...config.systemSettings,
        [field]: value
      }
    });
  };

  const handleSecurityChange = (field: keyof NonNullable<BusinessConfig['systemSettings']>['security'], value: any) => {
    const defaultSecurity = {
      requireStrongPasswords: true,
      enableTwoFactor: false,
      maxLoginAttempts: 5,
      lockoutDuration: 15
    };

    const defaultSystemSettings = {
      autoBackup: false,
      backupFrequency: 'daily' as const,
      maxUsers: 50,
      sessionTimeout: 30,
      enableLogging: true,
      logLevel: 'info' as const,
      security: defaultSecurity,
      email: {
        provider: 'smtp' as const,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: ''
      }
    };

    onUpdate({
      systemSettings: {
        ...defaultSystemSettings,
        ...config.systemSettings,
        security: {
          ...defaultSecurity,
          ...config.systemSettings?.security,
          [field]: value
        }
      }
    });
  };

  const handleEmailChange = (field: keyof NonNullable<BusinessConfig['systemSettings']>['email'], value: any) => {
    const defaultEmail = {
      provider: 'smtp' as const,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: ''
    };

    const defaultSystemSettings = {
      autoBackup: false,
      backupFrequency: 'daily' as const,
      maxUsers: 50,
      sessionTimeout: 30,
      enableLogging: true,
      logLevel: 'info' as const,
      security: {
        requireStrongPasswords: true,
        enableTwoFactor: false,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      email: defaultEmail
    };

    onUpdate({
      systemSettings: {
        ...defaultSystemSettings,
        ...config.systemSettings,
        email: {
          ...defaultEmail,
          ...config.systemSettings?.email,
          [field]: value
        }
      }
    });
  };

  const testEmailConnection = async () => {
    // Placeholder para test de conexión de email
    alert('Función de test de email en desarrollo');
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Configuración Avanzada</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Estas configuraciones afectan el funcionamiento del sistema. Modifique con precaución.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Respaldo y Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="autoBackup"
              checked={config.systemSettings?.autoBackup || false}
              onCheckedChange={(checked) => handleSystemSettingsChange('autoBackup', checked)}
            />
            <Label htmlFor="autoBackup">Respaldo automático</Label>
          </div>

          {config.systemSettings?.autoBackup && (
            <div className="pl-6 border-l-2 border-blue-200 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Frecuencia de respaldo</Label>
                <Select
                  value={config.systemSettings?.backupFrequency || 'daily'}
                  onValueChange={(value) => handleSystemSettingsChange('backupFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Máximo número de usuarios</Label>
              <Input
                id="maxUsers"
                type="number"
                min="1"
                max="1000"
                value={config.systemSettings?.maxUsers || 50}
                onChange={(e) => handleSystemSettingsChange('maxUsers', parseInt(e.target.value) || 50)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Tiempo de sesión (minutos)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="5"
                max="480"
                value={config.systemSettings?.sessionTimeout || 30}
                onChange={(e) => handleSystemSettingsChange('sessionTimeout', parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-gray-500">Entre 5 minutos y 8 horas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Logging y Monitoreo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="enableLogging"
              checked={config.systemSettings?.enableLogging || false}
              onCheckedChange={(checked) => handleSystemSettingsChange('enableLogging', checked)}
            />
            <Label htmlFor="enableLogging">Habilitar logging del sistema</Label>
          </div>

          {config.systemSettings?.enableLogging && (
            <div className="pl-6 border-l-2 border-green-200">
              <div className="space-y-2">
                <Label htmlFor="logLevel">Nivel de logging</Label>
                <Select
                  value={config.systemSettings?.logLevel || 'info'}
                  onValueChange={(value) => handleSystemSettingsChange('logLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error (solo errores críticos)</SelectItem>
                    <SelectItem value="warn">Warning (errores y advertencias)</SelectItem>
                    <SelectItem value="info">Info (información general)</SelectItem>
                    <SelectItem value="debug">Debug (información detallada)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Niveles más altos incluyen los anteriores
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuración de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="requireStrongPasswords"
                  checked={config.systemSettings?.security?.requireStrongPasswords || false}
                  onCheckedChange={(checked) => handleSecurityChange('requireStrongPasswords', checked)}
                />
                <Label htmlFor="requireStrongPasswords">Requerir contraseñas seguras</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTwoFactor"
                  checked={config.systemSettings?.security?.enableTwoFactor || false}
                  onCheckedChange={(checked) => handleSecurityChange('enableTwoFactor', checked)}
                />
                <Label htmlFor="enableTwoFactor">Autenticación de dos factores</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Máximo intentos de login</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min="3"
                  max="10"
                  value={config.systemSettings?.security?.maxLoginAttempts || 5}
                  onChange={(e) => handleSecurityChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockoutDuration">Duración de bloqueo (minutos)</Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  min="5"
                  max="60"
                  value={config.systemSettings?.security?.lockoutDuration || 15}
                  onChange={(e) => handleSecurityChange('lockoutDuration', parseInt(e.target.value) || 15)}
                />
              </div>
            </div>
          </div>

          {config.systemSettings?.security?.requireStrongPasswords && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Contraseñas seguras requieren:</strong> Mínimo 8 caracteres, al menos una mayúscula, 
                una minúscula, un número y un carácter especial.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuración de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">Servidor SMTP</Label>
              <Input
                id="smtpHost"
                value={config.systemSettings?.email?.smtpHost || ''}
                onChange={(e) => handleEmailChange('smtpHost', e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPort">Puerto SMTP</Label>
              <Input
                id="smtpPort"
                type="number"
                value={config.systemSettings?.email?.smtpPort || 587}
                onChange={(e) => handleEmailChange('smtpPort', parseInt(e.target.value) || 587)}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Usuario SMTP</Label>
              <Input
                id="smtpUser"
                value={config.systemSettings?.email?.smtpUser || ''}
                onChange={(e) => handleEmailChange('smtpUser', e.target.value)}
                placeholder="usuario@gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPassword">Contraseña SMTP</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={config.systemSettings?.email?.smtpPassword || ''}
                onChange={(e) => handleEmailChange('smtpPassword', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testEmailConnection}
              disabled={!config.systemSettings?.email?.smtpHost || !config.systemSettings?.email?.smtpUser}
            >
              Probar Conexión
            </Button>
          </div>

          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Para Gmail, use una contraseña de aplicación en lugar de su contraseña regular. 
              Para otros proveedores, consulte su documentación SMTP.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Configuración de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="emailNotifications"
                checked={config.notifications?.emailNotifications || false}
                onCheckedChange={(checked) => onUpdate({
                  notifications: {
                    ...config.notifications,
                    emailNotifications: checked
                  }
                })}
              />
              <Label htmlFor="emailNotifications">Notificaciones por email</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="smsNotifications"
                checked={config.notifications?.smsNotifications || false}
                onCheckedChange={(checked) => onUpdate({
                  notifications: {
                    ...config.notifications,
                    smsNotifications: checked
                  }
                })}
              />
              <Label htmlFor="smsNotifications">Notificaciones por SMS</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="pushNotifications"
                checked={config.notifications?.pushNotifications || false}
                onCheckedChange={(checked) => onUpdate({
                  notifications: {
                    ...config.notifications,
                    pushNotifications: checked
                  }
                })}
              />
              <Label htmlFor="pushNotifications">Notificaciones push</Label>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Las notificaciones se enviarán para eventos importantes como nuevos pedidos, 
              stock bajo, errores del sistema y actualizaciones de seguridad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}