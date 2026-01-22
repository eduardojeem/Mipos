'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Store, 
  Sparkles, 
  Heart, 
  Scissors, 
  Coffee,
  ShoppingBag,
  Shirt,
  Car,
  Home,
  CheckCircle,
  Eye
} from 'lucide-react';
import { BusinessConfig, defaultBusinessConfig } from '@/types/business-config';
import { useToast } from '@/components/ui/use-toast';

interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: 'beauty' | 'retail' | 'food' | 'services';
  icon: React.ComponentType<{ className?: string }>;
  preview: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  config: Partial<BusinessConfig>;
}

const templates: ConfigTemplate[] = [
  {
    id: 'beauty-salon',
    name: 'Salón de Belleza',
    description: 'Perfecto para salones de belleza, spas y centros estéticos',
    category: 'beauty',
    icon: Scissors,
    preview: {
      primaryColor: '#ec4899',
      secondaryColor: '#8b5cf6',
      accentColor: '#f59e0b'
    },
    config: {
      businessName: 'Salón de Belleza Elegance',
      tagline: 'Tu belleza es nuestra pasión',
      heroTitle: 'Bienvenida a',
      heroHighlight: 'tu transformación',
      heroDescription: 'Servicios profesionales de belleza con los mejores productos y técnicas del mercado.',
      branding: {
        primaryColor: '#ec4899',
        secondaryColor: '#8b5cf6',
        accentColor: '#f59e0b',
        backgroundColor: '#fdf2f8',
        textColor: '#831843',
        gradientStart: '#fce7f3',
        gradientEnd: '#f3e8ff'
      },
      businessHours: [
        'Lunes - Viernes: 9:00 - 19:00',
        'Sábados: 8:00 - 17:00',
        'Domingos: 10:00 - 15:00'
      ],
      legalInfo: {
        ...defaultBusinessConfig.legalInfo,
        businessType: 'Empresa Individual',
        economicActivity: 'Servicios de belleza y estética'
      }
    }
  },
  {
    id: 'retail-store',
    name: 'Tienda Retail',
    description: 'Ideal para tiendas de ropa, accesorios y productos generales',
    category: 'retail',
    icon: ShoppingBag,
    preview: {
      primaryColor: '#059669',
      secondaryColor: '#0ea5e9',
      accentColor: '#f59e0b'
    },
    config: {
      businessName: 'Tienda Fashion Paraguay',
      tagline: 'Moda y estilo para todos',
      heroTitle: 'Descubre',
      heroHighlight: 'tu estilo único',
      heroDescription: 'Las mejores marcas y tendencias de moda al alcance de todos.',
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#0ea5e9',
        accentColor: '#f59e0b',
        backgroundColor: '#f0fdf4',
        textColor: '#064e3b',
        gradientStart: '#ecfdf5',
        gradientEnd: '#f0f9ff'
      },
      businessHours: [
        'Lunes - Sábado: 8:00 - 20:00',
        'Domingos: 9:00 - 18:00'
      ],
      storeSettings: {
        ...defaultBusinessConfig.storeSettings,
        freeShippingThreshold: 200000,
        minimumOrderAmount: 75000
      }
    }
  },
  {
    id: 'restaurant',
    name: 'Restaurante',
    description: 'Perfecto para restaurantes, cafeterías y servicios de comida',
    category: 'food',
    icon: Coffee,
    preview: {
      primaryColor: '#dc2626',
      secondaryColor: '#ea580c',
      accentColor: '#facc15'
    },
    config: {
      businessName: 'Restaurante Sabor Guaraní',
      tagline: 'Sabores auténticos del Paraguay',
      heroTitle: 'Disfruta de',
      heroHighlight: 'nuestra cocina tradicional',
      heroDescription: 'Platos típicos paraguayos preparados con ingredientes frescos y recetas familiares.',
      branding: {
        primaryColor: '#dc2626',
        secondaryColor: '#ea580c',
        accentColor: '#facc15',
        backgroundColor: '#fef2f2',
        textColor: '#7f1d1d',
        gradientStart: '#fee2e2',
        gradientEnd: '#fed7aa'
      },
      businessHours: [
        'Lunes - Jueves: 11:00 - 22:00',
        'Viernes - Sábado: 11:00 - 23:00',
        'Domingos: 11:00 - 21:00'
      ],
      legalInfo: {
        ...defaultBusinessConfig.legalInfo,
        economicActivity: 'Servicios de restaurante y gastronomía'
      }
    }
  },
  {
    id: 'automotive',
    name: 'Automotriz',
    description: 'Para talleres mecánicos, concesionarias y servicios automotrices',
    category: 'services',
    icon: Car,
    preview: {
      primaryColor: '#1f2937',
      secondaryColor: '#3b82f6',
      accentColor: '#f59e0b'
    },
    config: {
      businessName: 'Taller Mecánico Pro',
      tagline: 'Expertos en tu vehículo',
      heroTitle: 'Cuidamos',
      heroHighlight: 'tu vehículo',
      heroDescription: 'Servicios mecánicos profesionales con garantía y repuestos originales.',
      branding: {
        primaryColor: '#1f2937',
        secondaryColor: '#3b82f6',
        accentColor: '#f59e0b',
        backgroundColor: '#f9fafb',
        textColor: '#111827',
        gradientStart: '#f3f4f6',
        gradientEnd: '#dbeafe'
      },
      businessHours: [
        'Lunes - Viernes: 7:00 - 18:00',
        'Sábados: 7:00 - 12:00',
        'Domingos: Cerrado'
      ],
      legalInfo: {
        ...defaultBusinessConfig.legalInfo,
        economicActivity: 'Servicios de reparación automotriz'
      }
    }
  }
];

interface ConfigTemplatesProps {
  onApplyTemplate: (config: Partial<BusinessConfig>) => Promise<void>;
  currentConfig: BusinessConfig;
}

export function ConfigTemplates({ onApplyTemplate, currentConfig }: ConfigTemplatesProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyTemplate = async (template: ConfigTemplate) => {
    const confirmed = confirm(
      `¿Aplicar el template "${template.name}"?\n\n` +
      'Esta acción sobrescribirá la configuración actual de branding, horarios y algunos datos básicos.\n' +
      'Los datos de contacto y configuración avanzada se mantendrán.'
    );

    if (!confirmed) return;

    try {
      setIsApplying(true);
      setSelectedTemplate(template.id);

      // Merge template config with current config, preserving important data
      const mergedConfig: Partial<BusinessConfig> = {
        ...template.config,
        // Preserve critical current data
        contact: currentConfig.contact,
        address: currentConfig.address,
        socialMedia: currentConfig.socialMedia,
        storeSettings: {
          ...currentConfig.storeSettings,
          ...template.config.storeSettings
        },
        systemSettings: currentConfig.systemSettings,
        notifications: currentConfig.notifications,
        regional: currentConfig.regional,
        updatedAt: new Date().toISOString()
      };

      await onApplyTemplate(mergedConfig);

      toast({
        title: "Template aplicado",
        description: `El template "${template.name}" se ha aplicado correctamente.`,
      });
    } catch (error) {
      console.error('Template application error:', error);
      toast({
        title: "Error al aplicar template",
        description: "No se pudo aplicar el template seleccionado.",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
      setSelectedTemplate(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'beauty': return Heart;
      case 'retail': return Store;
      case 'food': return Coffee;
      case 'services': return Home;
      default: return Store;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'beauty': return 'text-pink-600 bg-pink-100 dark:bg-pink-950/30';
      case 'retail': return 'text-blue-600 bg-blue-100 dark:bg-blue-950/30';
      case 'food': return 'text-orange-600 bg-orange-100 dark:bg-orange-950/30';
      case 'services': return 'text-green-600 bg-green-100 dark:bg-green-950/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-950/30';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Templates Predefinidos
          </CardTitle>
          <CardDescription>
            Aplica configuraciones prediseñadas para diferentes tipos de negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              const TemplateIcon = template.icon;
              
              return (
                <Card 
                  key={template.id}
                  className="relative overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                          <TemplateIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getCategoryColor(template.category)}`}
                          >
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      
                      {selectedTemplate === template.id && isApplying && (
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      {template.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Color Preview */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Paleta de colores</p>
                        <div className="flex gap-2">
                          <div 
                            className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.preview.primaryColor }}
                            title="Color primario"
                          />
                          <div 
                            className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.preview.secondaryColor }}
                            title="Color secundario"
                          />
                          <div 
                            className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.preview.accentColor }}
                            title="Color de acento"
                          />
                        </div>
                      </div>
                      
                      {/* Sample Business Name */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Ejemplo</p>
                        <p className="text-sm font-medium" style={{ color: template.preview.primaryColor }}>
                          {template.config.businessName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {template.config.tagline}
                        </p>
                      </div>
                    </div>
                    
                    {/* Apply Button */}
                    <Button 
                      className="w-full mt-4 gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      variant="outline"
                      disabled={isApplying}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTemplate(template);
                      }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aplicar Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Información importante
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Los templates solo modifican la configuración visual, nombre del negocio y horarios. 
                  Tus datos de contacto, dirección y configuración avanzada se mantendrán intactos.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}