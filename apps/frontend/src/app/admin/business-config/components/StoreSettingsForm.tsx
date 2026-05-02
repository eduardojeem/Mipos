'use client'

import { CreditCard, Package, Settings, Store, Truck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { BusinessConfig } from '@/types/business-config'
import { useConfigValidation } from '../hooks/useConfigValidation'

interface StoreSettingsFormProps {
  config: BusinessConfig
  onUpdate: (updates: Partial<BusinessConfig>) => void
}

export function StoreSettingsForm({ config, onUpdate }: StoreSettingsFormProps) {
  const { getFieldError } = useConfigValidation()

  const handleStoreSettingsChange = (
    field: keyof BusinessConfig['storeSettings'],
    value: string | number | boolean
  ) => {
    onUpdate({
      storeSettings: {
        ...config.storeSettings,
        [field]: value,
      },
    })
  }

  const updateAutoShare = (field: 'whatsapp' | 'email', value: boolean) => {
    onUpdate({
      storeSettings: {
        ...config.storeSettings,
        autoShareReceipt: {
          ...config.storeSettings.autoShareReceipt,
          [field]: value,
        },
      },
    })
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: config.storeSettings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Base comercial
          </CardTitle>
          <CardDescription>
            Moneda de trabajo, minimo de compra y parametros visibles en el flujo publico.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
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
                <SelectItem value="PYG">Guarani paraguayo (PYG)</SelectItem>
                <SelectItem value="USD">Dolar estadounidense (USD)</SelectItem>
                <SelectItem value="ARS">Peso argentino (ARS)</SelectItem>
                <SelectItem value="BRL">Real brasileno (BRL)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
            {getFieldError('storeSettings.currency') && (
              <p className="text-sm text-red-500">{getFieldError('storeSettings.currency')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currencySymbol">Simbolo *</Label>
            <Input
              id="currencySymbol"
              value={config.storeSettings.currencySymbol}
              onChange={(event) => handleStoreSettingsChange('currencySymbol', event.target.value)}
              placeholder="Gs."
              className={getFieldError('storeSettings.currencySymbol') ? 'border-red-500' : ''}
            />
            {getFieldError('storeSettings.currencySymbol') && (
              <p className="text-sm text-red-500">{getFieldError('storeSettings.currencySymbol')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumOrderAmount">Pedido minimo</Label>
            <Input
              id="minimumOrderAmount"
              type="number"
              value={config.storeSettings.minimumOrderAmount || 0}
              onChange={(event) =>
                handleStoreSettingsChange('minimumOrderAmount', Number(event.target.value) || 0)
              }
              placeholder="50000"
            />
            <p className="text-xs text-muted-foreground">
              Actual: {formatCurrency(config.storeSettings.minimumOrderAmount || 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Impuestos y presentacion
          </CardTitle>
          <CardDescription>
            Define si el precio ya incluye IVA y que tasa comercial se muestra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Habilitar IVA</p>
              <p className="text-xs text-muted-foreground">Aplica el calculo fiscal al flujo comercial.</p>
            </div>
            <Switch
              id="taxEnabled"
              checked={config.storeSettings.taxEnabled}
              onCheckedChange={(checked) => handleStoreSettingsChange('taxEnabled', checked)}
            />
          </div>

          {config.storeSettings.taxEnabled && (
            <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tasa de IVA (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={(config.storeSettings.taxRate * 100).toFixed(2)}
                  onChange={(event) =>
                    handleStoreSettingsChange('taxRate', Number(event.target.value) / 100 || 0)
                  }
                  placeholder="10.00"
                />
                <p className="text-xs text-muted-foreground">Referencia habitual en Paraguay: 10%</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Precios con IVA incluido</p>
                  <p className="text-xs text-muted-foreground">
                    Evita dobles lecturas entre catalogo y checkout.
                  </p>
                </div>
                <Switch
                  id="taxIncludedInPrices"
                  checked={config.storeSettings.taxIncludedInPrices}
                  onCheckedChange={(checked) =>
                    handleStoreSettingsChange('taxIncludedInPrices', checked)
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Envio y umbral gratis
          </CardTitle>
          <CardDescription>
            Define cuando mostrar envio gratis y que mensaje se expone al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Activar envio gratis</p>
              <p className="text-xs text-muted-foreground">
                Muestra el beneficio en la experiencia publica y en las reglas comerciales.
              </p>
            </div>
            <Switch
              id="freeShippingEnabled"
              checked={Boolean(config.storeSettings.freeShippingEnabled)}
              onCheckedChange={(checked) => handleStoreSettingsChange('freeShippingEnabled', checked)}
            />
          </div>

          {config.storeSettings.freeShippingEnabled && (
            <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freeShippingThreshold">Monto minimo</Label>
                <Input
                  id="freeShippingThreshold"
                  type="number"
                  value={config.storeSettings.freeShippingThreshold}
                  onChange={(event) =>
                    handleStoreSettingsChange('freeShippingThreshold', Number(event.target.value) || 0)
                  }
                  placeholder="150000"
                />
                <p className="text-xs text-muted-foreground">
                  Actual: {formatCurrency(config.storeSettings.freeShippingThreshold)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeShippingMessage">Mensaje visible</Label>
                <Input
                  id="freeShippingMessage"
                  value={config.storeSettings.freeShippingMessage || ''}
                  onChange={(event) =>
                    handleStoreSettingsChange('freeShippingMessage', event.target.value)
                  }
                  placeholder="Envio gratis a partir de {amount}"
                />
                <p className="text-xs text-muted-foreground">
                  Usa {'{amount}'} para insertar el umbral actual.
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
            Metodos de pago
          </CardTitle>
          <CardDescription>
            Define que medios aparecen como disponibles para cobrar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="acceptsCash">Efectivo</Label>
              <Switch
                id="acceptsCash"
                checked={config.storeSettings.acceptsCash}
                onCheckedChange={(checked) => handleStoreSettingsChange('acceptsCash', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="acceptsDebitCards">Tarjetas de debito</Label>
              <Switch
                id="acceptsDebitCards"
                checked={config.storeSettings.acceptsDebitCards}
                onCheckedChange={(checked) =>
                  handleStoreSettingsChange('acceptsDebitCards', checked)
                }
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="acceptsCreditCards">Tarjetas de credito</Label>
              <Switch
                id="acceptsCreditCards"
                checked={config.storeSettings.acceptsCreditCards}
                onCheckedChange={(checked) =>
                  handleStoreSettingsChange('acceptsCreditCards', checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="acceptsBankTransfer">Transferencia bancaria</Label>
              <Switch
                id="acceptsBankTransfer"
                checked={config.storeSettings.acceptsBankTransfer}
                onCheckedChange={(checked) =>
                  handleStoreSettingsChange('acceptsBankTransfer', checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventario y POS
          </CardTitle>
          <CardDescription>
            Controles que afectan la operacion diaria y los comportamientos visibles del punto de venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enableInventoryTracking">Seguimiento de inventario</Label>
              <Switch
                id="enableInventoryTracking"
                checked={Boolean(config.storeSettings.enableInventoryTracking)}
                onCheckedChange={(checked) =>
                  handleStoreSettingsChange('enableInventoryTracking', checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableBarcodeScanner">Escaner de codigos</Label>
              <Switch
                id="enableBarcodeScanner"
                checked={Boolean(config.storeSettings.enableBarcodeScanner)}
                onCheckedChange={(checked) =>
                  handleStoreSettingsChange('enableBarcodeScanner', checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="printReceipts">Imprimir comprobantes</Label>
              <Switch
                id="printReceipts"
                checked={Boolean(config.storeSettings.printReceipts)}
                onCheckedChange={(checked) => handleStoreSettingsChange('printReceipts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoPrintOnSale">Impresion automatica al vender</Label>
              <Switch
                id="autoPrintOnSale"
                checked={Boolean(config.storeSettings.autoPrintOnSale)}
                onCheckedChange={(checked) => handleStoreSettingsChange('autoPrintOnSale', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableCashDrawer">Cajon de dinero</Label>
              <Switch
                id="enableCashDrawer"
                checked={Boolean(config.storeSettings.enableCashDrawer)}
                onCheckedChange={(checked) =>
                  handleStoreSettingsChange('enableCashDrawer', checked)
                }
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border p-4">
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Umbral de stock bajo</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={config.storeSettings.lowStockThreshold || 0}
                onChange={(event) =>
                  handleStoreSettingsChange('lowStockThreshold', Number(event.target.value) || 0)
                }
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Dispara alertas cuando el stock baje de este valor.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-sm font-medium">Envio automatico de comprobantes</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoShareWhatsApp">WhatsApp</Label>
                  <Switch
                    id="autoShareWhatsApp"
                    checked={Boolean(config.storeSettings.autoShareReceipt?.whatsapp)}
                    onCheckedChange={(checked) => updateAutoShare('whatsapp', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoShareEmail">Email</Label>
                  <Switch
                    id="autoShareEmail"
                    checked={Boolean(config.storeSettings.autoShareReceipt?.email)}
                    onCheckedChange={(checked) => updateAutoShare('email', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
