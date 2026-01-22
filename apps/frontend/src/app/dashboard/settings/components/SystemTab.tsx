import { useState } from 'react';
import { Save, Store, CreditCard, Database, Zap, Globe, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useSystemSettings, useUpdateSystemSettings, type SystemSettings } from '../hooks/useOptimizedSettings';

export function SystemTab() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const handleUploadLogo = async () => {
    try {
      if (!logoFile) {
        toast({
          title: 'Selecciona una imagen',
          description: 'Elige un archivo de imagen para subir.',
          variant: 'destructive'
        });
        return;
      }
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('bucket', 'branding');
      formData.append('prefix', 'logo');
      formData.append('public', 'true');

      const res = await api.post('/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploaded = Array.isArray(res.data?.files) ? res.data.files[0] : undefined;
      const publicUrl = uploaded?.url;
      if (publicUrl) {
        updateSetting('store_logo_url', publicUrl);
        toast({
          title: 'Logo subido',
          description: 'Se actualizó el logo de la tienda.',
        });
      } else {
        toast({
          title: 'Error al subir',
          description: 'No se recibió URL pública del archivo subido.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error al subir logo',
        description: 'Verifica tus permisos y el tamaño del archivo (máx. 5MB).',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Store Information with premium card style */}
      <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
              <Store className="h-5 w-5" />
            </div>
            Información de la Tienda
          </CardTitle>
          <CardDescription className="text-base">
            Configura los datos maestros y de contacto de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="store_name" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Nombre Comercial</Label>
              <Input
                id="store_name"
                className="bg-muted/30 border-none focus-visible:ring-blue-600 h-11"
                value={currentSettings.store_name || ''}
                onChange={(e) => updateSetting('store_name', e.target.value)}
                placeholder="Mi Negocio"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="store_email" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email de Contacto</Label>
              <Input
                id="store_email"
                type="email"
                className="bg-muted/30 border-none focus-visible:ring-blue-600 h-11"
                value={currentSettings.store_email || ''}
                onChange={(e) => updateSetting('store_email', e.target.value)}
                placeholder="contacto@negocio.com"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="store_phone" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</Label>
              <Input
                id="store_phone"
                className="bg-muted/30 border-none focus-visible:ring-blue-600 h-11"
                value={currentSettings.store_phone || ''}
                onChange={(e) => updateSetting('store_phone', e.target.value)}
                placeholder="+595 21 123 4567"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="store_website" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sitio Web</Label>
              <Input
                id="store_website"
                className="bg-muted/30 border-none focus-visible:ring-blue-600 h-11"
                value={currentSettings.store_website || ''}
                onChange={(e) => updateSetting('store_website', e.target.value)}
                placeholder="https://minegocio.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <Card className="md:col-span-1 border-dashed bg-muted/20 p-4 flex flex-col items-center justify-center gap-4 text-center">
              {currentSettings.store_logo_url ? (
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-white dark:bg-slate-900 transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={currentSettings.store_logo_url}
                      alt="Logo"
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">Logo Actual</div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                  <Upload className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}

              <div className="w-full">
                <input
                  type="file"
                  id="logo-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all rounded-lg"
                >
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <Upload className="h-3 w-3 mr-2" />
                    {logoFile ? logoFile.name.substring(0, 15) + '...' : 'Elegir archivo'}
                  </label>
                </Button>
                {logoFile && (
                  <Button
                    onClick={handleUploadLogo}
                    disabled={uploadingLogo}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-lg"
                  >
                    {uploadingLogo ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                    Confirmar Subida
                  </Button>
                )}
              </div>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="store_address" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dirección Física</Label>
                <Textarea
                  id="store_address"
                  className="bg-muted/30 border-none focus-visible:ring-blue-600 min-h-[100px]"
                  value={currentSettings.store_address || ''}
                  onChange={(e) => updateSetting('store_address', e.target.value)}
                  placeholder="Calle Principal 123, Asunción, Paraguay"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="receipt_footer" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pie de Página (Tickets)</Label>
                <Textarea
                  id="receipt_footer"
                  className="bg-muted/30 border-none focus-visible:ring-blue-600 min-h-[100px]"
                  value={currentSettings.receipt_footer || ''}
                  onChange={(e) => updateSetting('receipt_footer', e.target.value)}
                  placeholder="Gracias por preferirnos. Política de cambios: 30 días."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Financial Settings with premium card style */}
        <Card className="border-none shadow-xl shadow-emerald-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-5 w-5" />
              </div>
              Configuración Financiera
            </CardTitle>
            <CardDescription className="text-base">
              Ajustes de moneda, impuestos y precios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="currency" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Moneda Base</Label>
              <Select
                value={currentSettings.currency || 'PYG'}
                onValueChange={(value) => updateSetting('currency', value)}
              >
                <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PYG">🇵🇾 Guaraní Paraguayo (PYG)</SelectItem>
                  <SelectItem value="USD">🇺🇸 Dólar Americano (USD)</SelectItem>
                  <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
                  <SelectItem value="BRL">🇧🇷 Real Brasileño (BRL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="tax_rate" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Impuesto (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600"
                  value={currentSettings.tax_rate || 0}
                  onChange={(e) => updateSetting('tax_rate', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="decimal_places" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Decimales</Label>
                <Select
                  value={(currentSettings.decimal_places || 0).toString()}
                  onValueChange={(value) => updateSetting('decimal_places', parseInt(value))}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin decimales</SelectItem>
                    <SelectItem value="2">2 decimales</SelectItem>
                    <SelectItem value="3">3 decimales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="max_discount" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Descuento Permitido (%)</Label>
              <Input
                id="max_discount"
                type="number"
                className="bg-muted/30 border-none h-11 focus-visible:ring-emerald-600"
                value={currentSettings.max_discount_percentage || 0}
                onChange={(e) => updateSetting('max_discount_percentage', parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings with premium card style */}
        <Card className="border-none shadow-xl shadow-amber-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform duration-300">
                <Database className="h-5 w-5" />
              </div>
              Gestión de Inventario
            </CardTitle>
            <CardDescription className="text-base">
              Control de stock y parámetros de venta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="low_stock_threshold" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alerta Stock Bajo (Uds)</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                className="bg-muted/30 border-none h-11 focus-visible:ring-amber-600"
                value={currentSettings.low_stock_threshold || 10}
                onChange={(e) => updateSetting('low_stock_threshold', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Escáner de Barras</p>
                  <p className="text-xs text-muted-foreground">Agiliza la venta directa</p>
                </div>
                <Switch
                  checked={currentSettings.enable_barcode_scanner ?? true}
                  onCheckedChange={(checked) => updateSetting('enable_barcode_scanner', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Datos del Cliente</p>
                  <p className="text-xs text-muted-foreground">Obligatorio en facturación</p>
                </div>
                <Switch
                  checked={currentSettings.require_customer_info ?? false}
                  onCheckedChange={(checked) => updateSetting('require_customer_info', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Club de Lealtad</p>
                  <p className="text-xs text-muted-foreground">Sistema de fidelización</p>
                </div>
                <Switch
                  checked={currentSettings.enable_loyalty_program ?? false}
                  onCheckedChange={(checked) => updateSetting('enable_loyalty_program', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Hardware Settings with premium card style */}
        <Card className="border-none shadow-xl shadow-purple-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-purple-600 text-white shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-5 w-5" />
              </div>
              Periféricos y Hardware
            </CardTitle>
            <CardDescription className="text-base">
              Configuración de dispositivos conectados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Impresora Térmica</p>
                  <p className="text-xs text-muted-foreground">Impresión automática de tickets</p>
                </div>
                <Switch
                  checked={currentSettings.enable_receipt_printer ?? true}
                  onCheckedChange={(checked) => updateSetting('enable_receipt_printer', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Cajón Monedero</p>
                  <p className="text-xs text-muted-foreground">Apertura electrónica tras cobro</p>
                </div>
                <Switch
                  checked={currentSettings.enable_cash_drawer ?? true}
                  onCheckedChange={(checked) => updateSetting('enable_cash_drawer', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Respaldo en Nube</p>
                  <p className="text-xs text-muted-foreground">Backup automático de seguridad</p>
                </div>
                <Switch
                  checked={currentSettings.auto_backup ?? true}
                  onCheckedChange={(checked) => updateSetting('auto_backup', checked)}
                />
              </div>
            </div>

            {currentSettings.auto_backup && (
              <div className="space-y-2.5 pt-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Frecuencia de Backup</Label>
                <Select
                  value={currentSettings.backup_frequency || 'daily'}
                  onValueChange={(value) => updateSetting('backup_frequency', value)}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-purple-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

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
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Zona Horaria</Label>
              <Select
                value={currentSettings.timezone || 'America/Asuncion'}
                onValueChange={(value) => updateSetting('timezone', value)}
              >
                <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Asuncion">America/Asuncion</SelectItem>
                  <SelectItem value="America/Sao_Paulo">America/Sao_Paulo</SelectItem>
                  <SelectItem value="America/Buenos_Aires">America/Buenos_Aires</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Formato Fecha</Label>
                <Select
                  value={currentSettings.date_format || 'DD/MM/YYYY'}
                  onValueChange={(value) => updateSetting('date_format', value)}
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
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Formato Hora</Label>
                <Select
                  value={currentSettings.time_format || '24h'}
                  onValueChange={(value) => updateSetting('time_format', value)}
                >
                  <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12h (AM/PM)</SelectItem>
                    <SelectItem value="24h">24h</SelectItem>
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