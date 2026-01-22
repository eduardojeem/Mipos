'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Image as ImageIcon } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

interface HeroConfigFormProps {
  config: WebsiteConfig;
  onUpdate: (updates: Partial<WebsiteConfig>) => void;
}

export default function HeroConfigForm({ config, onUpdate }: HeroConfigFormProps) {
  const handleHeroChange = (field: keyof WebsiteConfig['hero'], value: string) => {
    onUpdate({
      hero: {
        ...config.hero,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sección Principal (Hero)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Título Principal *</Label>
              <Input
                id="heroTitle"
                value={config.hero.title}
                onChange={(e) => handleHeroChange('title', e.target.value)}
                placeholder="Bienvenidos a"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroHighlight">Texto Destacado</Label>
              <Input
                id="heroHighlight"
                value={config.hero.highlight}
                onChange={(e) => handleHeroChange('highlight', e.target.value)}
                placeholder="nuestro negocio"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroDescription">Descripción *</Label>
            <Textarea
              id="heroDescription"
              value={config.hero.description}
              onChange={(e) => handleHeroChange('description', e.target.value)}
              placeholder="Ofrecemos productos y servicios de la más alta calidad..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctaText">Texto del Botón</Label>
              <Input
                id="ctaText"
                value={config.hero.ctaText}
                onChange={(e) => handleHeroChange('ctaText', e.target.value)}
                placeholder="Ver Productos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctaLink">Enlace del Botón</Label>
              <Input
                id="ctaLink"
                value={config.hero.ctaLink}
                onChange={(e) => handleHeroChange('ctaLink', e.target.value)}
                placeholder="/productos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backgroundImage">Imagen de Fondo (Opcional)</Label>
            <Input
              id="backgroundImage"
              value={config.hero.backgroundImage}
              onChange={(e) => handleHeroChange('backgroundImage', e.target.value)}
              placeholder="https://ejemplo.com/hero-bg.jpg"
            />
            <p className="text-xs text-gray-500">
              URL de la imagen de fondo para la sección hero
            </p>
          </div>

          {/* Vista previa del hero */}
          <div className="mt-6 p-6 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50">
            <p className="text-sm font-medium mb-4">Vista Previa</p>
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {config.hero.title} <span className="text-blue-600">{config.hero.highlight}</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {config.hero.description}
              </p>
              {config.hero.ctaText && (
                <button 
                  className="px-6 py-3 rounded-lg text-white font-medium"
                  style={{ backgroundColor: config.branding.primaryColor }}
                >
                  {config.hero.ctaText}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Carrusel de Imágenes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.carousel.enabled}
                onChange={(e) => onUpdate({
                  carousel: {
                    ...config.carousel,
                    enabled: e.target.checked
                  }
                })}
              />
              <span>Habilitar carrusel de imágenes</span>
            </label>
          </div>

          {config.carousel.enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tiempo de transición (segundos)</Label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={config.carousel.transitionSeconds}
                    onChange={(e) => onUpdate({
                      carousel: {
                        ...config.carousel,
                        transitionSeconds: parseInt(e.target.value) || 5
                      }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Proporción de aspecto</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={config.carousel.ratio}
                    onChange={(e) => onUpdate({
                      carousel: {
                        ...config.carousel,
                        ratio: parseFloat(e.target.value) || 2.5
                      }
                    })}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.carousel.autoplay}
                  onChange={(e) => onUpdate({
                    carousel: {
                      ...config.carousel,
                      autoplay: e.target.checked
                    }
                  })}
                />
                <span>Reproducción automática</span>
              </label>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Las imágenes del carrusel se gestionan desde la sección 
                  "Carruseles" en la configuración del negocio.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}