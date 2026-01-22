'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ExternalLink, RotateCcw, Smartphone, Monitor } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';
import { useState } from 'react';
import { Label } from '@/components/ui/label';

interface WebsitePreviewProps {
  config: WebsiteConfig;
  onReset: () => void;
}

export default function WebsitePreview({ config, onReset }: WebsitePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const getCompletionStatus = () => {
    const checks = [
      { name: 'Marca configurada', status: !!(config.branding.brandName && config.branding.primaryColor) },
      { name: 'Hero configurado', status: !!(config.hero.title && config.hero.description) },
      { name: 'SEO configurado', status: !!(config.seo.title && config.seo.description) },
      { name: 'Contacto configurado', status: !!(config.contact.phone && config.contact.email) },
    ];
    
    const completed = checks.filter(check => check.status).length;
    const percentage = Math.round((completed / checks.length) * 100);
    
    return { checks, completed, total: checks.length, percentage };
  };

  const status = getCompletionStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Estado de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progreso de configuración</span>
            <Badge variant={status.percentage === 100 ? "default" : "secondary"}>
              {status.completed}/{status.total} completado
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.percentage}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {status.checks.map((check, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${check.status ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-sm ${check.status ? 'text-green-700' : 'text-gray-500'}`}>
                  {check.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa del Sitio Web
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                Escritorio
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Móvil
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`mx-auto border rounded-lg overflow-hidden ${
            viewMode === 'mobile' ? 'max-w-sm' : 'max-w-4xl'
          }`}>
            {/* Header Preview */}
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: config.branding.primaryColor }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {config.branding.logo && (
                    <img 
                      src={config.branding.logo} 
                      alt="Logo" 
                      className="h-8 w-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="font-bold text-lg">{config.branding.brandName}</span>
                </div>
                {viewMode === 'desktop' && (
                  <nav className="hidden md:flex gap-4 text-sm">
                    <span>Inicio</span>
                    <span>Productos</span>
                    <span>Contacto</span>
                  </nav>
                )}
              </div>
            </div>

            {/* Hero Section Preview */}
            <div 
              className="p-8 text-center"
              style={{ 
                background: `linear-gradient(135deg, ${config.branding.gradientStart}, ${config.branding.gradientEnd})`,
                color: config.branding.textColor 
              }}
            >
              <h1 className="text-2xl md:text-4xl font-bold mb-4">
                {config.hero.title} <span style={{ color: config.branding.accentColor }}>
                  {config.hero.highlight}
                </span>
              </h1>
              <p className="text-lg mb-6 opacity-80">
                {config.hero.description}
              </p>
              {config.hero.ctaText && (
                <button 
                  className="px-6 py-3 rounded-lg text-white font-medium"
                  style={{ backgroundColor: config.branding.secondaryColor }}
                >
                  {config.hero.ctaText}
                </button>
              )}
            </div>

            {/* Features Preview */}
            <div className="p-6 bg-gray-50">
              <h2 className="text-xl font-semibold mb-4">Funcionalidades Habilitadas</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(config.features).map(([key, enabled]) => {
                  if (!enabled) return null;
                  const labels: Record<string, string> = {
                    enableSearch: 'Búsqueda',
                    enableWishlist: 'Lista de deseos',
                    enableCompare: 'Comparar',
                    enableTestimonials: 'Testimonios',
                    enableBlog: 'Blog',
                    enableNewsletter: 'Newsletter',
                    enableLiveChat: 'Chat en vivo'
                  };
                  return (
                    <div key={key} className="p-2 bg-white rounded border text-sm text-center">
                      {labels[key] || key}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Preview */}
            <div className="p-4 bg-gray-800 text-white text-sm">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p>&copy; 2024 {config.branding.brandName}. Todos los derechos reservados.</p>
                </div>
                {config.socialMedia.enabled && (
                  <div className="flex gap-3">
                    {config.socialMedia.facebook && <span>Facebook</span>}
                    {config.socialMedia.instagram && <span>Instagram</span>}
                    {config.socialMedia.twitter && <span>Twitter</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Ver Sitio Real
            </Button>
            <Button variant="outline" onClick={onReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Resetear Configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Título SEO</Label>
            <p className="text-sm text-gray-600">{config.seo.title || 'No configurado'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Descripción SEO</Label>
            <p className="text-sm text-gray-600">{config.seo.description || 'No configurada'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Palabras Clave</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {config.seo.keywords.length > 0 ? (
                config.seo.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">No configuradas</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
