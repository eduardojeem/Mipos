'use client'

import { Globe, MapPin, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { BusinessConfig } from '@/types/business-config'
import { useConfigValidation } from '../hooks/useConfigValidation'

interface ContactFormProps {
  config: BusinessConfig
  onUpdate: (updates: Partial<BusinessConfig>) => void
}

export function ContactForm({ config, onUpdate }: ContactFormProps) {
  const { getFieldError } = useConfigValidation()

  const handleContactChange = (field: keyof BusinessConfig['contact'], value: string) => {
    onUpdate({
      contact: {
        ...config.contact,
        [field]: value,
      },
    })
  }

  const handleAddressChange = (field: keyof BusinessConfig['address'], value: string | number | boolean | undefined) => {
    onUpdate({
      address: {
        ...config.address,
        [field]: value,
      },
    })
  }

  const handleSocialMediaChange = (field: keyof BusinessConfig['socialMedia'], value: string) => {
    onUpdate({
      socialMedia: {
        ...config.socialMedia,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contacto comercial
          </CardTitle>
          <CardDescription>
            Canales visibles para clientes y soporte operativo del negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono principal *</Label>
              <Input
                id="phone"
                value={config.contact.phone}
                onChange={(event) => handleContactChange('phone', event.target.value)}
                placeholder="+595 21 123 456"
                className={getFieldError('contact.phone') ? 'border-red-500' : ''}
              />
              {getFieldError('contact.phone') && (
                <p className="text-sm text-red-500">{getFieldError('contact.phone')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="landline">Telefono fijo</Label>
              <Input
                id="landline"
                value={config.contact.landline || ''}
                onChange={(event) => handleContactChange('landline', event.target.value)}
                placeholder="+595 21 654 321"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email publico *</Label>
              <Input
                id="email"
                type="email"
                value={config.contact.email}
                onChange={(event) => handleContactChange('email', event.target.value)}
                placeholder="info@minegocio.com.py"
                className={getFieldError('contact.email') ? 'border-red-500' : ''}
              />
              {getFieldError('contact.email') && (
                <p className="text-sm text-red-500">{getFieldError('contact.email')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={config.contact.whatsapp || ''}
                onChange={(event) => handleContactChange('whatsapp', event.target.value)}
                placeholder="+595 981 123 456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Sitio web</Label>
            <Input
              id="website"
              value={config.contact.website || ''}
              onChange={(event) => handleContactChange('website', event.target.value)}
              placeholder="https://minegocio.com.py"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicacion publica
          </CardTitle>
          <CardDescription>
            Direccion, referencias y mapa embebido para la pagina del negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Direccion *</Label>
            <Input
              id="street"
              value={config.address.street}
              onChange={(event) => handleAddressChange('street', event.target.value)}
              placeholder="Av. Mariscal Lopez 1234"
              className={getFieldError('address.street') ? 'border-red-500' : ''}
            />
            {getFieldError('address.street') && (
              <p className="text-sm text-red-500">{getFieldError('address.street')}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Barrio</Label>
              <Input
                id="neighborhood"
                value={config.address.neighborhood}
                onChange={(event) => handleAddressChange('neighborhood', event.target.value)}
                placeholder="Villa Morra"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={config.address.city}
                onChange={(event) => handleAddressChange('city', event.target.value)}
                placeholder="Asuncion"
                className={getFieldError('address.city') ? 'border-red-500' : ''}
              />
              {getFieldError('address.city') && (
                <p className="text-sm text-red-500">{getFieldError('address.city')}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Input
                id="department"
                value={config.address.department}
                onChange={(event) => handleAddressChange('department', event.target.value)}
                placeholder="Central"
                className={getFieldError('address.department') ? 'border-red-500' : ''}
              />
              {getFieldError('address.department') && (
                <p className="text-sm text-red-500">{getFieldError('address.department')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Codigo postal</Label>
              <Input
                id="zipCode"
                value={config.address.zipCode}
                onChange={(event) => handleAddressChange('zipCode', event.target.value)}
                placeholder="1209"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Pais</Label>
              <Input
                id="country"
                value={config.address.country}
                onChange={(event) => handleAddressChange('country', event.target.value)}
                placeholder="Paraguay"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia</Label>
            <Textarea
              id="reference"
              value={config.address.reference || ''}
              onChange={(event) => handleAddressChange('reference', event.target.value)}
              placeholder="Frente a la plaza, cerca del Shopping del Sol"
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapUrl">URL de Google Maps</Label>
              <Input
                id="mapUrl"
                value={config.address.mapUrl || ''}
                onChange={(event) => handleAddressChange('mapUrl', event.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapEmbedUrl">URL embebida</Label>
              <Input
                id="mapEmbedUrl"
                value={config.address.mapEmbedUrl || ''}
                onChange={(event) => handleAddressChange('mapEmbedUrl', event.target.value)}
                placeholder="https://www.google.com/maps/embed?..."
                disabled={!config.address.mapEmbedEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Solo se usa si activas el mapa embebido.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Mostrar mapa embebido</p>
              <p className="text-xs text-muted-foreground">
                Inserta un iframe publico dentro de la pagina del negocio.
              </p>
            </div>
            <Switch
              id="mapEmbedEnabled"
              checked={Boolean(config.address.mapEmbedEnabled)}
              onCheckedChange={(checked) => handleAddressChange('mapEmbedEnabled', checked)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitud</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={config.address.latitude ?? ''}
                onChange={(event) =>
                  handleAddressChange(
                    'latitude',
                    event.target.value === '' ? undefined : Number(event.target.value)
                  )
                }
                placeholder="-25.2637"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitud</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={config.address.longitude ?? ''}
                onChange={(event) =>
                  handleAddressChange(
                    'longitude',
                    event.target.value === '' ? undefined : Number(event.target.value)
                  )
                }
                placeholder="-57.5759"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Redes publicas
          </CardTitle>
          <CardDescription>
            Enlaces opcionales para reforzar confianza y presencia de marca.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={config.socialMedia.facebook || ''}
              onChange={(event) => handleSocialMediaChange('facebook', event.target.value)}
              placeholder="https://facebook.com/minegocio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={config.socialMedia.instagram || ''}
              onChange={(event) => handleSocialMediaChange('instagram', event.target.value)}
              placeholder="https://instagram.com/minegocio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">X / Twitter</Label>
            <Input
              id="twitter"
              value={config.socialMedia.twitter || ''}
              onChange={(event) => handleSocialMediaChange('twitter', event.target.value)}
              placeholder="https://x.com/minegocio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              value={config.socialMedia.tiktok || ''}
              onChange={(event) => handleSocialMediaChange('tiktok', event.target.value)}
              placeholder="https://tiktok.com/@minegocio"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={config.socialMedia.linkedin || ''}
              onChange={(event) => handleSocialMediaChange('linkedin', event.target.value)}
              placeholder="https://linkedin.com/company/minegocio"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
