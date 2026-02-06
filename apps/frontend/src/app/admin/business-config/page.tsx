'use client';

import { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Building2, 
  Scale, 
  Phone, 
  Palette, 
  Store, 
  Image, 
  Settings, 
  Eye,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building,
  Globe
} from 'lucide-react';

import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { BusinessConfig } from '@/types/business-config';
import { useAutoSave } from './hooks/useAutoSave';
import { useAuth } from '@/hooks/use-auth';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
// Lazy load components for better performance
const BusinessInfoForm = lazy(() => import('./components/BusinessInfoForm').then(m => ({ default: m.BusinessInfoForm })));
const DomainSettingsForm = lazy(() => import('./components/DomainSettingsForm').then(m => ({ default: m.DomainSettingsForm })));
const LegalInfoForm = lazy(() => import('./components/LegalInfoForm').then(m => ({ default: m.LegalInfoForm })));
const ContactForm = lazy(() => import('./components/ContactForm').then(m => ({ default: m.ContactForm })));
const BrandingForm = lazy(() => import('./components/BrandingForm').then(m => ({ default: m.BrandingForm })));
const StoreSettingsForm = lazy(() => import('./components/StoreSettingsForm').then(m => ({ default: m.StoreSettingsForm })));
const CarouselEditor = lazy(() => import('./components/CarouselEditor').then(m => ({ default: m.CarouselEditor })));
const SystemSettingsForm = lazy(() => import('./components/SystemSettingsForm').then(m => ({ default: m.SystemSettingsForm })));
const ConfigPreview = lazy(() => import('./components/ConfigPreview').then(m => ({ default: m.ConfigPreview })));
const OrganizationSelectorForConfig = lazy(() => import('./components/OrganizationSelectorForConfig').then(m => ({ default: m.OrganizationSelectorForConfig })));
const ConfigHistory = lazy(() => import('./components/ConfigHistory').then(m => ({ default: m.ConfigHistory })));

const TABS = [
  {
    id: 'business',
    label: 'Información Básica',
    icon: Building2,
    description: 'Datos generales del negocio'
  },
  {
    id: 'domain',
    label: 'Dominio y Tienda',
    icon: Globe,
    description: 'Configuración de tu tienda pública'
  },
  {
    id: 'legal',
    label: 'Legal y Fiscal',
    icon: Scale,
    description: 'Información legal y tributaria'
  },
  {
    id: 'contact',
    label: 'Contacto y Ubicación',
    icon: Phone,
    description: 'Datos de contacto y dirección'
  },
  {
    id: 'branding',
    label: 'Marca y Diseño',
    icon: Palette,
    description: 'Colores, logo y elementos visuales'
  },
  {
    id: 'store',
    label: 'Configuración Tienda',
    icon: Store,
    description: 'Precios, pagos y configuración comercial'
  },
  {
    id: 'carousel',
    label: 'Carruseles',
    icon: Image,
    description: 'Imágenes y ofertas destacadas'
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: Settings,
    description: 'Configuración avanzada del sistema'
  },
  {
    id: 'preview',
    label: 'Vista Previa',
    icon: Eye,
    description: 'Resumen y preview de la configuración'
  },
  {
    id: 'history',
    label: 'Historial',
    icon: Building,
    description: 'Historial de cambios y versiones'
  }
];

export default function BusinessConfigPage() {
  const { config, updateConfig, loading, error, resetConfig, persisted, organizationId, organizationName } = useBusinessConfig();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localChanges, setLocalChanges] = useState<Partial<BusinessConfig>>({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // Combinar configuración actual con cambios locales para mostrar el estado actual
  const currentConfig = { ...config, ...localChanges };

  // Auto-save functionality
  const autoSave = useAutoSave(currentConfig, {
    enabled: autoSaveEnabled && hasUnsavedChanges,
    delay: 2000, // 2 seconds delay
    onSave: async (configToSave) => {
      const result = await updateConfig({
        ...localChanges,
        updatedAt: new Date().toISOString()
      });
      
      if (result.persisted) {
        setHasUnsavedChanges(false);
        setLocalChanges({});
      }
      
      return result;
    },
    onError: (error) => {
      toast({
        title: "Error en auto-guardado",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Función para manejar cambios locales (sin guardar automáticamente)
  const handleConfigUpdate = useCallback((updates: Partial<BusinessConfig>) => {
    setHasUnsavedChanges(true);
    setLocalChanges(prev => {
      const merged = { ...prev };
      Object.keys(updates).forEach(key => {
        const k = key as keyof BusinessConfig;
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
          description: "Los cambios se han guardado correctamente.",
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
        description: "No se pudieron guardar los cambios. Inténtelo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [localChanges, hasUnsavedChanges, updateConfig, toast]);

  // Función para descartar cambios locales
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
    if (!confirm('¿Está seguro de que desea resetear toda la configuración a los valores por defecto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setSaving(true);
      await resetConfig();
      setHasUnsavedChanges(false);
      toast({
        title: "Configuración reseteada",
        description: "La configuración ha sido restaurada a los valores por defecto.",
      });
    } catch (error) {
      toast({
        title: "Error al resetear",
        description: "No se pudo resetear la configuración.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [resetConfig, toast]);

  const getTabStatus = (tabId: string) => {
    switch (tabId) {
      case 'business':
        return currentConfig.businessName && currentConfig.contact?.phone && currentConfig.contact?.email ? 'complete' : 'incomplete';
      case 'legal':
        return currentConfig.legalInfo?.businessType && currentConfig.legalInfo?.ruc ? 'complete' : 'incomplete';
      case 'contact':
        return currentConfig.address?.street && currentConfig.address?.city && currentConfig.address?.department ? 'complete' : 'incomplete';
      case 'branding':
        return currentConfig.branding?.primaryColor ? 'complete' : 'incomplete';
      case 'store':
        return currentConfig.storeSettings?.currency && currentConfig.storeSettings?.currencySymbol ? 'complete' : 'incomplete';
      case 'carousel':
        return currentConfig.carousel?.enabled && currentConfig.carousel?.images?.length > 0 ? 'complete' : 'partial';
      case 'system':
        return 'optional';
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
            case 'business':
              return <BusinessInfoForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'domain':
              return <DomainSettingsForm onUpdate={() => {
                toast({
                  title: 'Dominio actualizado',
                  description: 'Tu tienda pública está lista con el nuevo dominio',
                });
              }} />;
            case 'legal':
              return <LegalInfoForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'contact':
              return <ContactForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'branding':
              return <BrandingForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'store':
              return <StoreSettingsForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'carousel':
              return <CarouselEditor config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'system':
              return <SystemSettingsForm config={currentConfig} onUpdate={handleConfigUpdate} />;
            case 'preview':
              return <ConfigPreview config={currentConfig} onUpdate={handleConfigUpdate} onReset={handleReset} />;
            case 'history':
              return organizationId ? (
                <ConfigHistory 
                  organizationId={organizationId} 
                  onRestore={(config) => {
                    handleConfigUpdate(config);
                    toast({
                      title: 'Configuración restaurada',
                      description: 'Recuerda guardar los cambios para aplicarlos.',
                    });
                  }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Selecciona una organización para ver el historial
                </div>
              );
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
          <p className="text-gray-600">Cargando configuración...</p>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Negocio</h1>
            <p className="text-gray-600 mt-1">
              Configure todos los aspectos de su negocio desde un solo lugar
            </p>
            
            {/* Selector de organización (solo visible para super admin) */}
            <div className="mt-4">
              <Suspense fallback={
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              }>
                <OrganizationSelectorForConfig />
              </Suspense>
            </div>
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

            {autoSave.isSaving && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Auto-guardando...
              </Badge>
            )}

            <div className="flex items-center gap-2 px-3 py-1 rounded-md border">
              <label className="text-sm font-medium">Auto-guardar:</label>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded"
              />
            </div>

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