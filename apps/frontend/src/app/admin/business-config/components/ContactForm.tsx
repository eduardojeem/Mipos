'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Phone, MapPin, Globe } from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';

interface ContactFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

export function ContactForm({ config, onUpdate }: ContactFormProps) {
  const { getFieldError } = useConfigValidation();

  const handleContactChange = (field: keyof BusinessConfig['contact'], value: string) => {
    onUpdate({
      contact: {
        ...config.contact,
        [field]: value
      }
    });
  };

  const handleAddressChange = (field: keyof BusinessConfig['address'], value: string | number | boolean) => {
    onUpdate({
      address: {
        ...config.address,
        [field]: value
      }
    });
  };

  const handleSocialMediaChange = (field: keyof BusinessConfig['socialMedia'], value: string) => {
    onUpdate({
      socialMedia: {
        ...config.socialMedia,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Información de Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono Principal *</Label>
              <Input
                id="phone"
                value={config.contact.phone}
                onChange={(e) => handleContactChange('phone', e.target.value)}
                placeholder="+595 21 123-456"
                className={getFieldError('contact.phone') ? 'border-red-500' : ''}
              />
              {getFieldError('contact.phone') && (
                <p className="text-sm text-red-500">{getFieldError('contact.phone')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="landline">Teléfono Fijo</Label>
              <Input
                id="landline"
                value={config.contact.landline || ''}
                onChange={(e) => handleContactChange('landline', e.target.value)}
                placeholder="+595 21 654-321"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={config.contact.email}
                onChange={(e) => handleContactChange('email', e.target.value)}
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
                onChange={(e) => handleContactChange('whatsapp', e.target.value)}
                placeholder="+595 981 123-456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <Input
              id="website"
              value={config.contact.website || ''}
              onChange={(e) => handleContactChange('website', e.target.value)}
              placeholder="https://minegocio.com.py"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Dirección
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Dirección *</Label>
            <Input
              id="street"
              value={config.address.street}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder="Av. Mariscal López 1234"
              className={getFieldError('address.street') ? 'border-red-500' : ''}
            />
            {getFieldError('address.street') && (
              <p className="text-sm text-red-500">{getFieldError('address.street')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Barrio</Label>
              <Input
                id="neighborhood"
                value={config.address.neighborhood}
                onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                placeholder="Villa Morra"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={config.address.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="Asunción"
                className={getFieldError('address.city') ? 'border-red-500' : ''}
              />
              {getFieldError('address.city') && (
                <p className="text-sm text-red-500">{getFieldError('address.city')}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Input
                id="department"
                value={config.address.department}
                onChange={(e) => handleAddressChange('department', e.target.value)}
                placeholder="Central"
                className={getFieldError('address.department') ? 'border-red-500' : ''}
              />
              {getFieldError('address.department') && (
                <p className="text-sm text-red-500">{getFieldError('address.department')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Código Postal</Label>
              <Input
                id="zipCode"
                value={config.address.zipCode}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                placeholder="1209"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={config.address.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                placeholder="Paraguay"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia de Ubicación</Label>
            <Textarea
              id="reference"
              value={config.address.reference || ''}
              onChange={(e) => handleAddressChange('reference', e.target.value)}
              placeholder="Cerca del Shopping del Sol, frente a la plaza"
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mapUrl">URL de Google Maps</Label>
              <Input
                id="mapUrl"
                value={config.address.mapUrl || ''}
                onChange={(e) => handleAddressChange('mapUrl', e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="mapEmbedEnabled"
                checked={config.address.mapEmbedEnabled || false}
                onCheckedChange={(checked) => handleAddressChange('mapEmbedEnabled', checked)}
              />
              <Label htmlFor="mapEmbedEnabled">Habilitar mapa embebido</Label>
            </div>

            {config.address.mapEmbedEnabled && (
              <div className="space-y-2">
                <Label htmlFor="mapEmbedUrl">URL de Mapa Embebido</Label>
                <Input
                  id="mapEmbedUrl"
                  value={config.address.mapEmbedUrl || ''}
                  onChange={(e) => handleAddressChange('mapEmbedUrl', e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-xs text-gray-500">
                  URL embebible de Google Maps (iframe src)
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitud</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={config.address.latitude || ''}
                  onChange={(e) => handleAddressChange('latitude', parseFloat(e.target.value) || 0)}
                  placeholder="-25.2637"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitud</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={config.address.longitude || ''}
                  onChange={(e) => handleAddressChange('longitude', parseFloat(e.target.value) || 0)}
                  placeholder="-57.5759"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Redes Sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={config.socialMedia.facebook || ''}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                placeholder="https://facebook.com/minegocio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={config.socialMedia.instagram || ''}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                placeholder="https://instagram.com/minegocio"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                value={config.socialMedia.twitter || ''}
                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                placeholder="https://twitter.com/minegocio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                value={config.socialMedia.tiktok || ''}
                onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                placeholder="https://tiktok.com/@minegocio"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={config.socialMedia.linkedin || ''}
              onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/company/minegocio"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}