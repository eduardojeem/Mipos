'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Store, CreditCard, Truck, Package, Settings } from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';

interface StoreSettingsFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

export function StoreSettingsForm({ config, onUpdate }: StoreSettingsFormProps) {
  const { getFieldError } = useConfigValidation();

  const handleStoreSettingsChange = (field: keyof BusinessConfig['storeSettings'], value: string | number | boolean) => {
    onUpdate({
      storeSettings: {
        ...config.storeSettings,
        [field]: value
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: config.storeSettings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Configuración Básica de Tienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda *</Label>
              <Select
                value={config.storeSettings.currency}
                onValueChange={(value) => handleStoreSettingsChange('currency', value)}
              >
                <SelectTrigger className={getFieldError('storeSettings.currency') ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PYG">Guaraní Paraguayo (PYG)</SelectItem>
                  <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                  <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                  <SelectItem value="BRL">Real Brasileño (BRL)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError('storeSettings.currency') && (
                <p className="text-sm text-red-500">{getFieldError('storeSettings.currency')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Símbolo de Moneda *</Label>
              <Input
                id="currencySymbol"
                value={config.storeSettings.currencySymbol}
                onChange={(e) => handleStoreSettingsChange('currencySymbol', e.target.value)}
                placeholder="₲"
                className={getFieldError('storeSettings.currencySymbol') ? 'border-red-500' : ''}
              />
              {getFieldError('storeSettings.currencySymbol') && (
                <p className="text-sm text-red-500">{getFieldError('storeSettings.currencySymbol')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumOrderAmount">Monto Mínimo de Pedido</Label>
              <Input
                id="minimumOrderAmount"
                type="number"
                value={config.storeSettings.minimumOrderAmount || 0}
                onChange={(e) => handleStoreSettingsChange('minimumOrderAmount', parseFloat(e.target.value) || 0)}
                placeholder="50000"
              />
              <p className="text-xs text-gray-500">
                Actual: {formatCurrency(config.storeSettings.minimumOrderAmount || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración Fiscal (Paraguay)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="taxEnabled"
              checked={config.storeSettings.taxEnabled}
              onCheckedChange={(checked) => handleStoreSettingsChange('taxEnabled', checked)}
            />
            <Label htmlFor="taxEnabled">Habilitar IVA</Label>
          </div>

          {config.storeSettings.taxEnabled && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tasa de IVA (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(config.storeSettings.taxRate * 100).toFixed(2)}
                    onChange={(e) => handleStoreSettingsChange('taxRate', parseFloat(e.target.value) / 100 || 0)}
                    placeholder="10.00"
                  />
                  <p className="text-xs text-gray-500">
                    IVA estándar en Paraguay: 10%
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="taxIncludedInPrices"
                    checked={config.storeSettings.taxIncludedInPrices}
                    onCheckedChange={(checked) => handleStoreSettingsChange('taxIncludedInPrices', checked)}
                  />
                  <Label htmlFor="taxIncludedInPrices">Precios incluyen IVA</Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Configuración de Envíos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="freeShippingEnabled"
              checked={config.storeSettings.freeShippingEnabled || false}
              onCheckedChange={(checked) => handleStoreSettingsChange('freeShippingEnabled', checked)}
            />
            <Label htmlFor="freeShippingEnabled">Habilitar envío gratis</Label>
          </div>

          {config.storeSettings.freeShippingEnabled && (
            <div className="space-y-4 pl-6 border-l-2 border-green-200">
              <div className="space-y-2">
                <Label htmlFor="freeShippingThreshold">Monto mínimo para envío gratis</Label>
                <Input
                  id="freeShippingThreshold"
                  type="number"
                  value={config.storeSettings.freeShippingThreshold}
                  onChange={(e) => handleStoreSettingsChange('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                  placeholder="150000"
                />
                <p className="text-xs text-gray-500">
                  Actual: {formatCurrency(config.storeSettings.freeShippingThreshold)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeShippingMessage">Mensaje de envío gratis</Label>
                <Input
                  id="freeShippingMessage"
                  value={config.storeSettings.freeShippingMessage || ''}
                  onChange={(e) => handleStoreSettingsChange('freeShippingMessage', e.target.value)}
                  placeholder="Envío gratis a partir de {amount}"
                />
                <p className="text-xs text-gray-500">
                  Use {'{amount}'} para mostrar el monto dinámicamente
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="acceptsCash"
                  checked={config.storeSettings.acceptsCash}
                  onCheckedChange={(checked) => handleStoreSettingsChange('acceptsCash', checked)}
                />
                <Label htmlFor="acceptsCash">Efectivo</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="acceptsDebitCards"
                  checked={config.storeSettings.acceptsDebitCards}
                  onCheckedChange={(checked) => handleStoreSettingsChange('acceptsDebitCards', checked)}
                />
                <Label htmlFor="acceptsDebitCards">Tarjetas de débito</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="acceptsCreditCards"
                  checked={config.storeSettings.acceptsCreditCards}
                  onCheckedChange={(checked) => handleStoreSettingsChange('acceptsCreditCards', checked)}
                />
                <Label htmlFor="acceptsCreditCards">Tarjetas de crédito</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="acceptsBankTransfer"
                  checked={config.storeSettings.acceptsBankTransfer}
                  onCheckedChange={(checked) => handleStoreSettingsChange('acceptsBankTransfer', checked)}
                />
                <Label htmlFor="acceptsBankTransfer">Transferencia bancaria</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Configuración de Inventario y POS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableInventoryTracking"
                  checked={config.storeSettings.enableInventoryTracking || false}
                  onCheckedChange={(checked) => handleStoreSettingsChange('enableInventoryTracking', checked)}
                />
                <Label htmlFor="enableInventoryTracking">Seguimiento de inventario</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableBarcodeScanner"
                  checked={config.storeSettings.enableBarcodeScanner || false}
                  onCheckedChange={(checked) => handleStoreSettingsChange('enableBarcodeScanner', checked)}
                />
                <Label htmlFor="enableBarcodeScanner">Escáner de códigos de barras</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="printReceipts"
                  checked={config.storeSettings.printReceipts || false}
                  onCheckedChange={(checked) => handleStoreSettingsChange('printReceipts', checked)}
                />
                <Label htmlFor="printReceipts">Imprimir recibos</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Umbral de stock bajo</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={config.storeSettings.lowStockThreshold || 0}
                  onChange={(e) => handleStoreSettingsChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                  placeholder="10"
                />
                <p className="text-xs text-gray-500">
                  Alertar cuando el stock sea menor a este número
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableCashDrawer"
                  checked={config.storeSettings.enableCashDrawer || false}
                  onCheckedChange={(checked) => handleStoreSettingsChange('enableCashDrawer', checked)}
                />
                <Label htmlFor="enableCashDrawer">Cajón de dinero automático</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}