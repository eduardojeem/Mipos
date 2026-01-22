'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Globe, 
  Palette, 
  Search, 
  BarChart3, 
  Share2, 
  Settings, 
  Eye,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Smartphone
} from 'lucide-react';

import { useWebsiteConfig } from '@/contexts/WebsiteConfigContext';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

// Lazy load components for better performance
const BrandingConfigForm = lazy(() => import('./components/BrandingConfigForm'));
const HeroConfigForm = lazy(() => import('./components/HeroConfigForm'));
const SEOConfigForm = lazy(() => import('./components/SEOConfigForm'));
const AnalyticsConfigForm = lazy(() => import('./components/AnalyticsConfigForm'));
const SocialMediaConfigForm = lazy(() => import('./components/SocialMediaConfigForm'));
const FeaturesConfigForm = lazy(() => import('./components/FeaturesConfigForm'));
const WebsitePreview = lazy(() => import('./components/WebsitePreview'));

const TABS = [
  {
    id: 'branding',
    label: 'Marca y Diseño',
    icon: Palette,
    description: 'Colores, logo y elementos visuales del sitio web'
  },
  {
    id: 'hero',
    label: 'Página Principal',
    icon: Globe,
    description: 'Contenido de la página de inicio'
  },
  {
    id: 'seo',
    label: 'SEO y Meta Tags',
    icon: Search,
    description: 'Optimización para motores de búsqueda'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Google Analytics, Facebook Pixel, etc.'
  },
  {
    id: 'social',
    label: 'Redes Sociales',
    icon: Share2,
    description: 'Enlaces a redes sociales'
  },
  {
    id: 'features',
    label: 'Funcionalidades',
    icon: Settings,
    description: 'Habilitar/deshabilitar características del sitio'
  },
  {
    id: 'mobile',
    label: 'Móvil',
    icon: Smartphone,
    description: 'Configuración específica para dispositivos móviles'
  },
  {
    id: 'preview',
    label: 'Vista Previa',
    icon: Eye,
    description: 'Preview del sitio web con la configuración actual'
  }
];

export default function WebsiteConfigPage() {
  const { config, updateConfig, loading, error, resetConfig, persisted } = useWebsiteConfig();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('branding');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localChanges, setLocalChanges] = useState<Partial<WebsiteConfig>>({});

  // Combinar configuración actual con cambios locales
  const currentConfig = { ...config, ...localChanges };

  // Función para manejar cambios locales
  const handleConfigUpdate = useCallback((updates: Partial<WebsiteConfig>) => {
    setHasUnsavedChanges(true);
    setLocalChanges(prev => {
      const merged = { ...prev };
      Object.keys(updates).forEach(key => {
        const k = key as keyof WebsiteConfig;
        if (typeof updates[k] === 'object' && updates[k] !== null && !Array.isArray(updates[k])) {
          (merged as any)[k] = { ...(prev as any)[k], ...(updates as any)[k] };
        } else {
          (merged as any)[k] = updates[k];
        }
      });
      return merged;
    });
  }, []);

  // Función para guardar manualmente
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      setSaving(true);
      
      const result = await updateConfig({
        ...localChanges,
        updatedAt: new Date().toISOString()
      });
      
      if (result.persisted) {
        setHasUnsavedChanges(false);
        setLocalChanges({});
        toast({
          title: "Configuración guardada",
          description: "Los cambios del sitio web se han guardado correctamente.",
        });
      } else {
        toast({
          title: "Cambios guardados localmente",
          description: "Los cambios se sincronizarán cuando sea posible.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios del sitio web.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [localChanges, hasUnsavedChanges, updateConfig, toast]);

  // Función para descartar cambios
  const handleDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) return;
    
    if (confirm('¿Está seguro de que desea descartar todos los cambios sin guardar?')) {
      setLocalChanges({});
      setHasUnsavedChanges(false);
      toast({
        title: "Cambios descartados",
        description: "Se han descartado todos los cambios sin guardar.",
      });
    }
  }, [hasUnsavedChanges, toast]);

  const handleReset = useCallback(async () => {
    if (!confirm('¿Está seguro de que desea resetear toda la configuración del sitio web a los valores por defecto?')) {
      return;
    }

    try {
      setSaving(true);
      await resetConfig();
      setHasUnsavedChanges(false);
      setLocalChanges({});
      toast({
        title: "Configuración reseteada",
        description: "La configuración del sitio web ha sido restaurada a los valores por defecto.",
      });
    } catch (error) {
      toast({
        title: "Error al resetear",
        description: "No se pudo resetear la configuración del sitio web.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [resetConfig, toast]);

  const getTabStatus = (tabId: string) => {
    switch (tabId) {
      case 'branding':
        return currentConfig.branding?.brandName && currentConfig.branding?.primaryColor ? 'complete' : 'incomplete';
      case 'hero':
        return currentConfig.hero?.title && currentConfig.hero?.description ? 'complete' : 'incomplete';
      case 'seo':
        return currentConfig.seo?.title && currentConfig.seo?.description ? 'complete' : 'incomplete';
      case 'analytics':
        return currentConfig.analytics?.enabled ? 'complete' : 'optional';
      case 'social':
        return currentConfig.socialMedia?.enabled ? 'complete' : 'optional';
      case 'features':
        return 'complete';
      case 'mobile':
        return 'complete';
      default:
        return 'complete';
    }
  };

  const renderTabContent = () => {
    const LoadingSpinner = () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando...</span>
      </div>
    );

    return (
      <Suspense fallback={<LoadingSpinner />}>
        {(() => {
          switch (activeTab) {
            case 'branding':
              return <BrandingConfigForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'hero':
              return <HeroConfigForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'seo':
              return <SEOConfigForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'analytics':
              return <AnalyticsConfigForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'social':
              return <SocialMediaConfigForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'features':
              return <FeaturesConfigForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'mobile':
              return <div className="p-8 text-center text-gray-500">Configuración móvil - Próximamente</div>;
            case 'preview':
              return <WebsitePreview config={currentConfig} onReset={handleReset} />;
            default:
              return null;
          }
        })()}
      </Suspense>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando configuración del sitio web...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración del Sitio Web</h1>
            <p className="text-gray-600 mt-1">
              Configure la apariencia y funcionalidades de su sitio web público
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Cambios sin guardar
              </Badge>
            )}
            
            {persisted ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sincronizado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Pendiente sync
              </Badge>
            )}

            {saving && (
              <Badge variant="outline">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Guardando...
              </Badge>
            )}

            {hasUnsavedChanges && (
              <Button
                onClick={handleDiscardChanges}
                variant="outline"
                disabled={saving}
                className="gap-2"
              >
                Descartar Cambios
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const status = getTabStatus(tab.id);
            
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center gap-1 p-3 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <div className="flex items-center gap-1">
                  <Icon className="h-4 w-4" />
                  {status === 'complete' && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {status === 'incomplete' && <AlertCircle className="h-3 w-3 text-orange-500" />}
                </div>
                <span className="text-xs font-medium text-center leading-tight">
                  {tab.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </CardTitle>
                <p className="text-sm text-gray-600">{tab.description}</p>
              </CardHeader>
              <CardContent>
                {renderTabContent()}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Floating Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}