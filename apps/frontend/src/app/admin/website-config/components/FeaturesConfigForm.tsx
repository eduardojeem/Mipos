'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, MessageCircle, Search, Heart, BarChart3, FileText, Mail } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

interface FeaturesConfigFormProps {
  config: WebsiteConfig;
  onUpdate: (updates: Partial<WebsiteConfig>) => void;
}

export default function FeaturesConfigForm({ config, onUpdate }: FeaturesConfigFormProps) {
  const handleFeatureChange = (field: keyof WebsiteConfig['features'], value: boolean) => {
    onUpdate({
      features: {
        ...config.features,
        [field]: value
      }
    });
  };

  const features = [
    {
      key: 'enableSearch',
      label: 'Búsqueda de productos',
      description: 'Permitir a los usuarios buscar productos en el sitio',
      icon: Search,
      recommended: true
    },
    {
      key: 'enableWishlist',
      label: 'Lista de deseos',
      description: 'Los usuarios pueden guardar productos favoritos',
      icon: Heart,
      recommended: false
    },
    {
      key: 'enableCompare',
      label: 'Comparar productos',
      description: 'Comparación lado a lado de productos',
      icon: BarChart3,
      recommended: false
    },
    {
      key: 'enableTestimonials',
      label: 'Testimonios',
      description: 'Mostrar reseñas y testimonios de clientes',
      icon: MessageCircle,
      recommended: true
    },
    {
      key: 'enableBlog',
      label: 'Blog/Noticias',
      description: 'Sección de blog o noticias del negocio',
      icon: FileText,
      recommended: false
    },
    {
      key: 'enableNewsletter',
      label: 'Newsletter',
      description: 'Suscripción a boletín de noticias',
      icon: Mail,
      recommended: false
    },
    {
      key: 'enableLiveChat',
      label: 'Chat en vivo',
      description: 'Widget de chat para atención al cliente',
      icon: MessageCircle,
      recommended: false
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Funcionalidades del Sitio Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {features.map(({ key, label, description, icon: Icon, recommended }) => (
            <div key={key} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{label}</Label>
                    {recommended && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
              </div>
              <Switch
                checked={(config.features as any)[key] || false}
                onCheckedChange={(checked) => handleFeatureChange(key as keyof WebsiteConfig['features'], checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades Habilitadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {features.map(({ key, label, icon: Icon }) => {
              const isEnabled = (config.features as any)[key] || false;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    isEnabled 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{label}</span>
                  {isEnabled && <span className="text-green-600">✓</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}