import { useState } from 'react';
import { Save, Store, CreditCard, Database, Zap, Globe, Upload } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Información de la Tienda
          </CardTitle>
          <CardDescription>
            Configura los datos básicos de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Nombre de la Tienda</Label>
              <Input
                id="store_name"
                value={currentSettings.store_name || ''}
                onChange={(e) => updateSetting('store_name', e.target.value)}
                placeholder="4G Celulares"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_email">Email de la Tienda</Label>
              <Input
                id="store_email"
                type="email"
                value={currentSettings.store_email || ''}
                onChange={(e) => updateSetting('store_email', e.target.value)}
                placeholder="contacto@4gcelulares.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_phone">Teléfono</Label>
              <Input
                id="store_phone"
                value={currentSettings.store_phone || ''}
                onChange={(e) => updateSetting('store_phone', e.target.value)}
                placeholder="+595 21 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_website">Sitio Web</Label>
              <Input
                id="store_website"
                value={currentSettings.store_website || ''}
                onChange={(e) => updateSetting('store_website', e.target.value)}
                placeholder="https://4gcelulares.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="store_logo_url">Logo (URL)</Label>
              <Input
                id="store_logo_url"
                value={currentSettings.store_logo_url || ''}
                onChange={(e) => updateSetting('store_logo_url', e.target.value)}
                placeholder="https://ruta-a-tu-logo.png"
              />
            </div>
          </div>

          {currentSettings.store_logo_url && (
            <div className="mt-2 flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border bg-white dark:bg-slate-900">
                <img
                  src={currentSettings.store_logo_url}
                  alt="Logo de la tienda"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="text-sm text-muted-foreground">Vista previa del logo</div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Subir Logo</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <Button onClick={handleUploadLogo} disabled={uploadingLogo || !logoFile}>
                {uploadingLogo ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Subir
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_address">Dirección</Label>
            <Textarea
              id="store_address"
              value={currentSettings.store_address || ''}
              onChange={(e) => updateSetting('store_address', e.target.value)}
              placeholder="Calle Principal 123, Asunción, Paraguay"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_footer">Pie de Recibo</Label>
            <Textarea
              id="receipt_footer"
              value={currentSettings.receipt_footer || ''}
              onChange={(e) => updateSetting('receipt_footer', e.target.value)}
              placeholder="¡Gracias por su compra! Vuelva pronto."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Configuración Financiera
            </CardTitle>
            <CardDescription>
              Ajustes de moneda, impuestos y precios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select 
                value={currentSettings.currency || 'PYG'} 
                onValueChange={(value) => updateSetting('currency', value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tasa de Impuesto (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={currentSettings.tax_rate || 0}
                onChange={(e) => updateSetting('tax_rate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimal_places">Decimales</Label>
              <Select
                value={(currentSettings.decimal_places || 0).toString()}
                onValueChange={(value) => updateSetting('decimal_places', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin decimales</SelectItem>
                  <SelectItem value="2">2 decimales</SelectItem>
                  <SelectItem value="3">3 decimales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_discount">Descuento Máximo (%)</Label>
              <Input
                id="max_discount"
                type="number"
                min="0"
                max="100"
                value={currentSettings.max_discount_percentage || 0}
                onChange={(e) => updateSetting('max_discount_percentage', parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Configuración de Inventario
            </CardTitle>
            <CardDescription>
              Parámetros del sistema de inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Umbral de Stock Bajo</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                value={currentSettings.low_stock_threshold || 10}
                onChange={(e) => updateSetting('low_stock_threshold', parseInt(e.target.value) || 0)}
              />
              <p className="text-sm text-muted-foreground">
                Cantidad mínima para alertas de stock bajo
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Escáner de Códigos</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilitar lectura de códigos de barras
                  </p>
                </div>
                <Switch
                  checked={currentSettings.enable_barcode_scanner ?? true}
                  onCheckedChange={(checked) => updateSetting('enable_barcode_scanner', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Información de Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    Requerir datos del cliente en ventas
                  </p>
                </div>
                <Switch
                  checked={currentSettings.require_customer_info ?? false}
                  onCheckedChange={(checked) => updateSetting('require_customer_info', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Programa de Lealtad</Label>
                  <p className="text-sm text-muted-foreground">
                    Sistema de puntos y recompensas
                  </p>
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

      {/* Hardware Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Configuración de Hardware
          </CardTitle>
          <CardDescription>
            Configuración de dispositivos conectados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Impresora de Recibos</Label>
                <p className="text-sm text-muted-foreground">
                  Imprimir recibos automáticamente
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_receipt_printer ?? true}
                onCheckedChange={(checked) => updateSetting('enable_receipt_printer', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cajón de Dinero</Label>
                <p className="text-sm text-muted-foreground">
                  Abrir cajón automáticamente
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_cash_drawer ?? true}
                onCheckedChange={(checked) => updateSetting('enable_cash_drawer', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Respaldo Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Crear respaldos periódicos
                </p>
              </div>
              <Switch
                checked={currentSettings.auto_backup ?? true}
                onCheckedChange={(checked) => updateSetting('auto_backup', checked)}
              />
            </div>
          </div>

          {currentSettings.auto_backup && (
            <div className="mt-4 space-y-2">
              <Label>Frecuencia de Respaldo</Label>
              <Select
                value={currentSettings.backup_frequency || 'daily'}
                onValueChange={(value) => updateSetting('backup_frequency', value)}
              >
                <SelectTrigger className="w-full">
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

      {/* Format and Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Formato y Zona Horaria
          </CardTitle>
          <CardDescription>
            Ajusta la visualización de fechas y la zona horaria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Zona Horaria</Label>
            <Select 
              value={currentSettings.timezone || 'America/Asuncion'} 
              onValueChange={(value) => updateSetting('timezone', value)}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Formato de Fecha</Label>
            <Select 
              value={currentSettings.date_format || 'DD/MM/YYYY'} 
              onValueChange={(value) => updateSetting('date_format', value)}
            >
              <SelectTrigger>
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
            <Label>Formato de Hora</Label>
            <Select 
              value={currentSettings.time_format || '24h'} 
              onValueChange={(value) => updateSetting('time_format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <PermissionGuard permission="settings.edit">
          <Button 
            onClick={handleSave} 
            disabled={updateSystemSettings.isPending} 
            className="w-full"
          >
            {updateSystemSettings.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración del Sistema
          </Button>
        </PermissionGuard>
      )}
    </div>
  );
}