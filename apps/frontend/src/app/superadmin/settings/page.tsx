'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Lock,
  Globe,
  Bell,
  Database,
  Mail,
  Shield,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    systemName: 'MiPOS SaaS',
    systemEmail: 'admin@mipos.com',
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: true,
    enableTwoFactor: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableNotifications: true,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    backupEnabled: true,
    backupFrequency: 'daily',
    dataRetentionDays: 90
  });

  const handleSave = () => {
    // Aquí iría la lógica para guardar la configuración
    console.log('Guardando configuración:', settings);
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Settings className="h-8 w-8 text-slate-600" />
              Configuración Global
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Configuraciones del sistema y parámetros globales
            </p>
          </div>
          
          <Button onClick={handleSave} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>

        {/* System Status */}
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Sistema Operativo
                  </h3>
                  <p className="text-sm text-slate-500">
                    Todos los servicios funcionando correctamente
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                Saludable
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Configuración General
            </CardTitle>
            <CardDescription>
              Configuraciones básicas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="systemName">Nombre del Sistema</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="systemEmail">Email del Sistema</Label>
                <Input
                  id="systemEmail"
                  type="email"
                  value={settings.systemEmail}
                  onChange={(e) => setSettings({ ...settings, systemEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Modo Mantenimiento</p>
                  <p className="text-sm text-slate-500">
                    Desactiva el acceso al sistema para todos los usuarios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Permitir Registros</p>
                  <p className="text-sm text-slate-500">
                    Permite que nuevas organizaciones se registren
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.allowRegistrations}
                onCheckedChange={(checked) => setSettings({ ...settings, allowRegistrations: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Configuraciones de seguridad y autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Verificación de Email</p>
                  <p className="text-sm text-slate-500">
                    Requiere verificación de email para nuevos usuarios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Autenticación de Dos Factores</p>
                  <p className="text-sm text-slate-500">
                    Habilita 2FA para todos los usuarios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enableTwoFactor}
                onCheckedChange={(checked) => setSettings({ ...settings, enableTwoFactor: checked })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Tiempo de Sesión (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Intentos Máximos de Login</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configuración de notificaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Notificaciones del Sistema</p>
                  <p className="text-sm text-slate-500">
                    Habilita notificaciones generales del sistema
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Notificaciones por Email</p>
                  <p className="text-sm text-slate-500">
                    Envía notificaciones importantes por email
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enableEmailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableEmailNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Respaldos y Datos
            </CardTitle>
            <CardDescription>
              Configuración de respaldos y retención de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Respaldos Automáticos</p>
                  <p className="text-sm text-slate-500">
                    Habilita respaldos automáticos de la base de datos
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.backupEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, backupEnabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataRetention">Retención de Datos (días)</Label>
              <Input
                id="dataRetention"
                type="number"
                value={settings.dataRetentionDays}
                onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
              />
              <p className="text-sm text-slate-500">
                Los datos se eliminarán automáticamente después de este período
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className="gap-2">
            <CheckCircle className="h-5 w-5" />
            Guardar Todos los Cambios
          </Button>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
