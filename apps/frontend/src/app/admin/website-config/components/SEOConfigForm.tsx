'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Tag, Globe } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

interface SEOConfigFormProps {
  config: WebsiteConfig;
  onUpdate: (updates: Partial<WebsiteConfig>) => void;
}

export default function SEOConfigForm({ config, onUpdate }: SEOConfigFormProps) {
  const handleSEOChange = (field: keyof WebsiteConfig['seo'], value: string | string[]) => {
    onUpdate({
      seo: {
        ...config.seo,
        [field]: value
      }
    });
  };

  const handleKeywordsChange = (value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    handleSEOChange('keywords', keywords);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Meta Tags Básicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seoTitle">Título SEO *</Label>
            <Input
              id="seoTitle"
              value={config.seo.title}
              onChange={(e) => handleSEOChange('title', e.target.value)}
              placeholder="Mi Negocio - Calidad y Servicio"
              maxLength={60}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Recomendado: 50-60 caracteres</span>
              <span>{config.seo.title.length}/60</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoDescription">Descripción SEO *</Label>
            <Textarea
              id="seoDescription"
              value={config.seo.description}
              onChange={(e) => handleSEOChange('description', e.target.value)}
              placeholder="Ofrecemos productos y servicios de calidad en Paraguay..."
              rows={3}
              maxLength={160}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Recomendado: 150-160 caracteres</span>
              <span>{config.seo.description.length}/160</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Palabras Clave</Label>
            <Input
              id="keywords"
              value={config.seo.keywords.join(', ')}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder="productos, servicios, calidad, paraguay"
            />
            <p className="text-xs text-gray-500">
              Separe las palabras clave con comas
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {config.seo.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Open Graph y Redes Sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ogImage">Imagen Open Graph</Label>
            <Input
              id="ogImage"
              value={config.seo.ogImage}
              onChange={(e) => handleSEOChange('ogImage', e.target.value)}
              placeholder="https://ejemplo.com/og-image.jpg"
            />
            <p className="text-xs text-gray-500">
              Imagen que aparece cuando se comparte en redes sociales (1200x630px recomendado)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitterCard">Tipo de Twitter Card</Label>
            <select
              id="twitterCard"
              value={config.seo.twitterCard}
              onChange={(e) => handleSEOChange('twitterCard', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">Summary Large Image</option>
              <option value="app">App</option>
              <option value="player">Player</option>
            </select>
          </div>

          {/* Vista previa de Open Graph */}
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <p className="text-sm font-medium mb-3">Vista Previa en Redes Sociales</p>
            <div className="border rounded-lg bg-white p-3 max-w-md">
              {config.seo.ogImage && (
                <img 
                  src={config.seo.ogImage} 
                  alt="OG Preview" 
                  className="w-full h-32 object-cover rounded mb-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <h3 className="font-semibold text-sm line-clamp-1">{config.seo.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-2 mt-1">{config.seo.description}</p>
              <p className="text-xs text-gray-400 mt-1">minegocio.com.py</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Configuración Técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="canonicalUrl">URL Canónica</Label>
            <Input
              id="canonicalUrl"
              value={config.seo.canonicalUrl}
              onChange={(e) => handleSEOChange('canonicalUrl', e.target.value)}
              placeholder="https://minegocio.com.py"
            />
            <p className="text-xs text-gray-500">
              URL principal de su sitio web para evitar contenido duplicado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="robots">Directivas para Robots</Label>
            <select
              id="robots"
              value={config.seo.robots}
              onChange={(e) => handleSEOChange('robots', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="index,follow">Index, Follow (Recomendado)</option>
              <option value="index,nofollow">Index, No Follow</option>
              <option value="noindex,follow">No Index, Follow</option>
              <option value="noindex,nofollow">No Index, No Follow</option>
            </select>
            <p className="text-xs text-gray-500">
              Controla cómo los motores de búsqueda indexan su sitio
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Consejos SEO</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use títulos únicos y descriptivos para cada página</li>
              <li>• Mantenga las descripciones entre 150-160 caracteres</li>
              <li>• Use palabras clave relevantes pero evite el spam</li>
              <li>• Optimice las imágenes con texto alternativo</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}