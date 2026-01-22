'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Image as ImageIcon } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

interface BrandingConfigFormProps {
  config: WebsiteConfig;
  onUpdate: (updates: Partial<WebsiteConfig>) => void;
}

export default function BrandingConfigForm({ config, onUpdate }: BrandingConfigFormProps) {
  const handleBrandingChange = (field: keyof WebsiteConfig['branding'], value: string) => {
    onUpdate({
      branding: {
        ...config.branding,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Identidad de Marca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Nombre de la Marca *</Label>
              <Input
                id="brandName"
                value={config.branding.brandName}
                onChange={(e) => handleBrandingChange('brandName', e.target.value)}
                placeholder="Mi Negocio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Eslogan</Label>
              <Input
                id="tagline"
                value={config.branding.tagline}
                onChange={(e) => handleBrandingChange('tagline', e.target.value)}
                placeholder="Calidad y servicio de excelencia"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Colores del Sitio Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Color Primario</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.branding.primaryColor}
                  onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Input
                  value={config.branding.primaryColor}
                  onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                  placeholder="#dc2626"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color Secundario</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.branding.secondaryColor}
                  onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Input
                  value={config.branding.secondaryColor}
                  onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                  placeholder="#1d4ed8"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color de Acento</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.branding.accentColor}
                  onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Input
                  value={config.branding.accentColor}
                  onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                  placeholder="#059669"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Vista previa de colores */}
          <div className="mt-6 p-4 rounded-lg border bg-gray-50">
            <p className="text-sm font-medium mb-3">Vista Previa</p>
            <div className="flex gap-2">
              <div 
                className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: config.branding.primaryColor }}
              >
                Primario
              </div>
              <div 
                className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: config.branding.secondaryColor }}
              >
                Secundario
              </div>
              <div 
                className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: config.branding.accentColor }}
              >
                Acento
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Recursos Visuales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">URL del Logo</Label>
            <Input
              id="logo"
              value={config.branding.logo}
              onChange={(e) => handleBrandingChange('logo', e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
            />
            <p className="text-xs text-gray-500">
              URL pública del logo de su sitio web
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="favicon">URL del Favicon</Label>
            <Input
              id="favicon"
              value={config.branding.favicon}
              onChange={(e) => handleBrandingChange('favicon', e.target.value)}
              placeholder="https://ejemplo.com/favicon.ico"
            />
            <p className="text-xs text-gray-500">
              Icono que aparece en la pestaña del navegador (.ico o .png)
            </p>
          </div>

          {/* Preview de logo si existe */}
          {config.branding.logo && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <p className="text-sm font-medium mb-2">Vista Previa del Logo</p>
              <img 
                src={config.branding.logo} 
                alt="Logo preview" 
                className="max-h-16 max-w-48 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}