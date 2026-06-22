'use client'

import { CreditCard, Package, Plus, Settings, Store, Trash2, Truck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { BusinessConfig } from '@/types/business-config'
import { useConfigValidation } from '../hooks/useConfigValidation'
import { useCurrentVertical } from '@/hooks/use-current-vertical'

interface StoreSettingsFormProps {
  config: BusinessConfig
  onUpdate: (updates: Partial<BusinessConfig>) => void
}

export function StoreSettingsForm({ config, onUpdate }: StoreSettingsFormProps) {
  const { getFieldError } = useConfigValidation()
  // Una barbería no hace envíos: ocultamos toda la sección de envío/zonas.
  const isBarbershop = useCurrentVertical() === 'BARBERSHOP'

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
          ...(config.storeSettings.autoShareReceipt ?? {}),
          [field]: value,
        },
      },
    })
  }

  const shippingZones = config.storeSettings.freeShippingRegions || []

  const updateShippingZones = (zones: NonNullable<BusinessConfig['storeSettings']['freeShippingRegions']>) => {
    onUpdate({
      storeSettings: {
        ...config.storeSettings,
        freeShippingRegions: zones,
      },
    })
  }

  const handleAddShippingZone = () => {
    updateShippingZones([
      ...shippingZones,
      {
        id: `zone-${Date.now()}`,
        name: '',
        shippingCost: config.storeSettings.shippingCost || 0,
        threshold: config.storeSettings.freeShippingThreshold || 0,
      },
    ])
  }

  const handleUpdateShippingZone = (
    index: number,
    field: 'name' | 'shippingCost' | 'threshold',
    value: string | number
  ) => {
    updateShippingZones(
      shippingZones.map((zone, currentIndex) =>
        currentIndex === index
          ? {
              ...zone,
              [field]: field === 'name' ? String(value) : Math.max(0, Number(value) || 0),
              id: field === 'name' ? String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || zone.id : zone.id,
            }
          : zone
      )
    )
  }

  const handleRemoveShippingZone = (index: number) => {
    updateShippingZones(shippingZones.filter((_, currentIndex) => currentIndex !== index))
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: config.storeSettings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const interpolateFreeShippingMessage = (message: string, threshold: number) => {
    return message.replace('{amount}', formatCurrency(threshold))
  }

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
            {getFieldError('storeSettings.currencySymbol') ? (
              <p className="text-sm text-red-500">{getFieldError('storeSettings.currencySymbol')}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Ej: Gs., $, R$, €</p>
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

      {!isBarbershop && (
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

          <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <Label htmlFor="shippingCost">Costo base de envio</Label>
            <Input
              id="shippingCost"
              type="number"
              min={0}
              value={config.storeSettings.shippingCost || 0}
              onChange={(event) =>
                handleStoreSettingsChange('shippingCost', Math.max(0, Number(event.target.value) || 0))
              }
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Actual: {formatCurrency(config.storeSettings.shippingCost || 0)}. Se aplica en el checkout salvo que el pedido alcance envio gratis.
            </p>
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
                {config.storeSettings.freeShippingMessage?.includes('{amount}') && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Preview: {interpolateFreeShippingMessage(
                      config.storeSettings.freeShippingMessage,
                      config.storeSettings.freeShippingThreshold
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-border/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Zonas, ciudades o barrios</p>
                <p className="text-xs text-muted-foreground">
                  Define precios distintos por zona y un monto minimo propio para envio gratis.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddShippingZone}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar zona
              </Button>
            </div>

            {shippingZones.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Sin zonas configuradas. El checkout usara el costo base de envio.
              </div>
            ) : (
              <div className="space-y-3">
                {shippingZones.map((zone, index) => (
                  <div
                    key={zone.id || index}
                    className="grid gap-3 rounded-xl border border-border/60 bg-background p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`shipping-zone-name-${index}`}>Zona</Label>
                      <Input
                        id={`shipping-zone-name-${index}`}
                        value={zone.name}
                        onChange={(event) => handleUpdateShippingZone(index, 'name', event.target.value)}
                        placeholder="Ej: Asuncion centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`shipping-zone-cost-${index}`}>Costo de envio</Label>
                      <Input
                        id={`shipping-zone-cost-${index}`}
                        type="number"
                        min={0}
                        value={zone.shippingCost || 0}
                        onChange={(event) => handleUpdateShippingZone(index, 'shippingCost', event.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`shipping-zone-threshold-${index}`}>Gratis desde</Label>
                      <Input
                        id={`shipping-zone-threshold-${index}`}
                        type="number"
                        min={0}
                        value={zone.threshold || 0}
                        onChange={(event) => handleUpdateShippingZone(index, 'threshold', event.target.value)}
                        placeholder="150000"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveShippingZone(index)}
                        aria-label={`Eliminar zona ${zone.name || index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Metodos de pago
          </CardTitle>
          <CardDescription>
            Define que medios aparecen como disponibles para cobrar. Tarjeta de credito online estara disponible proximamente.
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
            Operacion interna (POS)
          </CardTitle>
          <CardDescription>
            Controles de inventario, hardware y comportamiento del punto de venta. Estos ajustes no son visibles para el cliente publico.
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

            <div className="rounded-xl border bg-muted/20 p-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Envio automatico de comprobantes</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  Próximamente
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Esta función estará disponible en una próxima actualización.
              </p>
              <div className="mt-3 space-y-3 opacity-40 pointer-events-none select-none">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoShareWhatsApp">WhatsApp</Label>
                  <Switch
                    id="autoShareWhatsApp"
                    checked={Boolean(config.storeSettings.autoShareReceipt?.whatsapp)}
                    onCheckedChange={(checked) => updateAutoShare('whatsapp', checked)}
                    disabled
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoShareEmail">Email</Label>
                  <Switch
                    id="autoShareEmail"
                    checked={Boolean(config.storeSettings.autoShareReceipt?.email)}
                    onCheckedChange={(checked) => updateAutoShare('email', checked)}
                    disabled
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
