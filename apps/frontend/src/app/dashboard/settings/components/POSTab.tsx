import { useState } from 'react';
import { Save, ShoppingCart, Package, Printer, DollarSign, AlertTriangle, RefreshCw, Barcode, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useSystemSettings, useUpdateSystemSettings, type SystemSettings } from '../hooks/useOptimizedSettings';

export function POSTab() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});

  // Merge server data with local changes
  const currentSettings = { ...systemSettings, ...localSettings };

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
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

  const taxRate = currentSettings.tax_rate || 10;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Tax and Currency */}
        <Card className="border-none shadow-xl shadow-green-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-green-600 text-white shadow-lg shadow-green-600/20 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-5 w-5" />
              </div>
              Impuestos y Moneda
            </CardTitle>
            <CardDescription className="text-base">
              Configuración fiscal y monetaria del punto de venta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tasa de IVA
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-green-600">
                    {taxRate}%
                  </span>
                </div>
              </div>
              <Slider
                value={[taxRate]}
                onValueChange={(value) => updateSetting('tax_rate', value[0])}
                min={0}
                max={30}
                step={0.5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>

            <Alert className="bg-green-500/5 border-green-500/10 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs text-green-800 dark:text-green-300">
                En Paraguay, la tasa estándar de IVA es del 10%. Esta configuración
                se aplicará automáticamente a todas las ventas.
              </AlertDescription>
            </Alert>

            <div className="space-y-2.5">
              <Label htmlFor="max_discount" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Descuento Máximo Permitido (%)
              </Label>
              <Input
                id="max_discount"
                type="number"
                min="0"
                max="100"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.max_discount_percentage || 50}
                onChange={(e) => updateSetting('max_discount_percentage', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Límite de descuento que pueden aplicar los vendedores
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Management */}
        <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-5 w-5" />
              </div>
              Control de Inventario
            </CardTitle>
            <CardDescription className="text-base">
              Gestión de stock y alertas de productos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Seguimiento de Inventario
                </Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Actualizar stock automáticamente con cada venta
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_inventory_tracking ?? true}
                onCheckedChange={(checked) => {
                  updateSetting('enable_inventory_tracking', checked);
                }}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="low_stock" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Umbral de Stock Bajo
              </Label>
              <Input
                id="low_stock"
                type="number"
                min="0"
                max="1000"
                className="bg-muted/30 border-none h-11"
                value={currentSettings.low_stock_threshold || 10}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateSetting('low_stock_threshold', value);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Cantidad mínima antes de mostrar alerta de reabastecimiento
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold">Requerir Info de Cliente</Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Solicitar datos del cliente en cada venta
                </p>
              </div>
              <Switch
                checked={currentSettings.require_customer_info ?? false}
                onCheckedChange={(checked) => updateSetting('require_customer_info', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Hardware Configuration */}
        <Card className="border-none shadow-xl shadow-purple-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-purple-600 text-white shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform duration-300">
                <Printer className="h-5 w-5" />
              </div>
              Hardware del POS
            </CardTitle>
            <CardDescription className="text-base">
              Dispositivos conectados al punto de venta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                  <Barcode className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <Label className="font-bold">Lector de Códigos de Barra</Label>
                  <p className="text-xs text-muted-foreground">
                    Escaneo rápido de productos
                  </p>
                </div>
              </div>
              <Switch
                checked={currentSettings.enable_barcode_scanner ?? true}
                onCheckedChange={(checked) => {
                  updateSetting('enable_barcode_scanner', checked);
                }}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <Label className="font-bold">Impresora de Tickets</Label>
                  <p className="text-xs text-muted-foreground">
                    Impresión automática de recibos
                  </p>
                </div>
              </div>
              <Switch
                checked={currentSettings.enable_receipt_printer ?? true}
                onCheckedChange={(checked) => {
                  updateSetting('enable_receipt_printer', checked);
                }}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <Label className="font-bold">Cajón de Dinero</Label>
                  <p className="text-xs text-muted-foreground">
                    Apertura automática al cobrar
                  </p>
                </div>
              </div>
              <Switch
                checked={currentSettings.enable_cash_drawer ?? true}
                onCheckedChange={(checked) => {
                  updateSetting('enable_cash_drawer', checked);
                }}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            <Alert className="bg-purple-500/5 border-purple-500/10 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-xs text-purple-800 dark:text-purple-300">
                Asegúrate de que los dispositivos estén correctamente conectados
                y configurados antes de habilitar estas opciones.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Loyalty Program */}
        <Card className="border-none shadow-xl shadow-amber-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform duration-300">
                <ShoppingCart className="h-5 w-5" />
              </div>
              Programa de Fidelización
            </CardTitle>
            <CardDescription className="text-base">
              Recompensas y puntos para clientes frecuentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="font-bold flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                  Habilitar Programa de Lealtad
                </Label>
                <p className="text-xs text-muted-foreground leading-tight">
                  Acumular puntos por compras y canjear recompensas
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_loyalty_program ?? false}
                onCheckedChange={(checked) => {
                  updateSetting('enable_loyalty_program', checked);
                }}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            {currentSettings.enable_loyalty_program && (
              <div className="space-y-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Puntos por Compra
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className="bg-background border-none h-11"
                    defaultValue={1}
                    placeholder="1 punto por cada ₲1000"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Puntos para Recompensa
                  </Label>
                  <Input
                    type="number"
                    min="10"
                    max="10000"
                    className="bg-background border-none h-11"
                    defaultValue={100}
                    placeholder="100 puntos = ₲10,000 descuento"
                  />
                </div>
              </div>
            )}

            <Alert className="bg-amber-500/5 border-amber-500/10 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                El programa de fidelización requiere que los clientes se registren
                con su información de contacto para acumular puntos.
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
              disabled={updateSystemSettings.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {updateSystemSettings.isPending ? (
                <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-3" />
              )}
              Guardar Configuración POS
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}
