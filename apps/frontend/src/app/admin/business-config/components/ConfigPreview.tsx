'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Building2,
  Phone,
  MapPin,
  Palette,
  Store,
  Image,
  Settings,
  Scale,
  FileJson,
  Clock,
  TrendingUp,
  Shield
} from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ConfigPreviewProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
  onReset: () => void;
}

interface SectionStatus {
  id: string;
  name: string;
  icon: React.ElementType;
  fields: { name: string; value: string | boolean | number | undefined; required?: boolean }[];
  completedCount: number;
  totalRequired: number;
  color: string;
}

export function ConfigPreview({ config, onUpdate, onReset }: ConfigPreviewProps) {
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `business-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        onUpdate({
          ...importedConfig,
          updatedAt: new Date().toISOString()
        });
        alert('Configuración importada exitosamente');
      } catch (error) {
        alert('Error al importar la configuración. Verifique que el archivo sea válido.');
      }
    };
    reader.readAsText(file);
  };

  const sections: SectionStatus[] = useMemo(() => [
    {
      id: 'business',
      name: 'Información Básica',
      icon: Building2,
      color: 'blue',
      fields: [
        { name: 'Nombre del negocio', value: config.businessName, required: true },
        { name: 'Eslogan', value: config.tagline },
        { name: 'Título principal', value: config.heroTitle, required: true },
        { name: 'Texto destacado', value: config.heroHighlight },
      ],
      completedCount: [config.businessName, config.heroTitle].filter(Boolean).length,
      totalRequired: 2,
    },
    {
      id: 'legal',
      name: 'Legal y Fiscal',
      icon: Scale,
      color: 'violet',
      fields: [
        { name: 'RUC', value: config.legalInfo?.ruc },
        { name: 'Tipo de empresa', value: config.legalInfo?.businessType, required: true },
        { name: 'Régimen tributario', value: config.legalInfo?.taxRegime },
        { name: 'Actividad económica', value: config.legalInfo?.economicActivity },
      ],
      completedCount: [config.legalInfo?.businessType].filter(Boolean).length,
      totalRequired: 1,
    },
    {
      id: 'contact',
      name: 'Contacto',
      icon: Phone,
      color: 'emerald',
      fields: [
        { name: 'Teléfono', value: config.contact?.phone, required: true },
        { name: 'Email', value: config.contact?.email, required: true },
        { name: 'WhatsApp', value: config.contact?.whatsapp },
        { name: 'Sitio web', value: config.contact?.website },
      ],
      completedCount: [config.contact?.phone, config.contact?.email].filter(Boolean).length,
      totalRequired: 2,
    },
    {
      id: 'address',
      name: 'Ubicación',
      icon: MapPin,
      color: 'amber',
      fields: [
        { name: 'Dirección', value: config.address?.street, required: true },
        { name: 'Ciudad', value: config.address?.city, required: true },
        { name: 'Departamento', value: config.address?.department, required: true },
        { name: 'Código postal', value: config.address?.zipCode },
      ],
      completedCount: [config.address?.street, config.address?.city, config.address?.department].filter(Boolean).length,
      totalRequired: 3,
    },
    {
      id: 'branding',
      name: 'Marca y Diseño',
      icon: Palette,
      color: 'pink',
      fields: [
        { name: 'Color primario', value: config.branding?.primaryColor, required: true },
        { name: 'Color secundario', value: config.branding?.secondaryColor },
        { name: 'Color de acento', value: config.branding?.accentColor },
        { name: 'Logo', value: config.branding?.logo },
      ],
      completedCount: [config.branding?.primaryColor].filter(Boolean).length,
      totalRequired: 1,
    },
    {
      id: 'store',
      name: 'Configuración Tienda',
      icon: Store,
      color: 'cyan',
      fields: [
        { name: 'Moneda', value: config.storeSettings?.currency, required: true },
        { name: 'Símbolo', value: config.storeSettings?.currencySymbol, required: true },
        { name: 'IVA habilitado', value: config.storeSettings?.taxEnabled ? 'Sí' : 'No' },
        { name: 'Tasa IVA', value: config.storeSettings?.taxEnabled ? `${(config.storeSettings.taxRate * 100).toFixed(0)}%` : 'N/A' },
      ],
      completedCount: [config.storeSettings?.currency, config.storeSettings?.currencySymbol].filter(Boolean).length,
      totalRequired: 2,
    },
    {
      id: 'carousel',
      name: 'Carruseles',
      icon: Image,
      color: 'indigo',
      fields: [
        { name: 'Carrusel principal', value: config.carousel?.enabled ? 'Activo' : 'Inactivo' },
        { name: 'Imágenes', value: `${config.carousel?.images?.length || 0} configuradas` },
        { name: 'Carrusel ofertas', value: config.homeOffersCarousel?.enabled ? 'Activo' : 'Inactivo' },
        { name: 'Autoplay', value: config.carousel?.autoplay ? 'Sí' : 'No' },
      ],
      completedCount: config.carousel?.enabled ? 1 : 0,
      totalRequired: 0,
    },
    {
      id: 'system',
      name: 'Sistema',
      icon: Settings,
      color: 'slate',
      fields: [
        { name: 'Backup automático', value: config.systemSettings?.autoBackup ? 'Activo' : 'Inactivo' },
        { name: 'Seguimiento inventario', value: config.storeSettings?.enableInventoryTracking ? 'Sí' : 'No' },
        { name: 'Escáner de barras', value: config.storeSettings?.enableBarcodeScanner ? 'Sí' : 'No' },
        { name: 'Impresión recibos', value: config.storeSettings?.printReceipts ? 'Sí' : 'No' },
      ],
      completedCount: 0,
      totalRequired: 0,
    },
  ], [config]);

  const totalRequired = sections.reduce((sum, s) => sum + s.totalRequired, 0);
  const totalCompleted = sections.reduce((sum, s) => sum + s.completedCount, 0);
  const completionPercentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: config.storeSettings?.currency || 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getColorClasses = (color: string, isComplete: boolean) => ({
    bg: isComplete ? `bg-${color}-100 dark:bg-${color}-950/30` : 'bg-slate-100 dark:bg-slate-800',
    icon: isComplete ? `text-${color}-600 dark:text-${color}-400` : 'text-slate-400',
    border: isComplete ? `border-${color}-200 dark:border-${color}-800` : 'border-slate-200 dark:border-slate-700',
  });

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className="overflow-hidden border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Estado de Configuración</CardTitle>
                <CardDescription>Resumen general de la configuración del negocio</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {completionPercentage}%
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">completado</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Progress value={completionPercentage} className="h-3 flex-1" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {totalCompleted}/{totalRequired} campos requeridos
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{totalCompleted}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Completados</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{totalRequired - totalCompleted}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Pendientes</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {sections.filter(s => s.totalRequired === 0 || s.completedCount === s.totalRequired).length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Secciones OK</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <Settings className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{sections.length}</p>
                <p className="text-xs text-purple-600 dark:text-purple-500">Total Secciones</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isComplete = section.totalRequired === 0 || section.completedCount >= section.totalRequired;
          const percentage = section.totalRequired > 0 
            ? Math.round((section.completedCount / section.totalRequired) * 100) 
            : 100;
          
          return (
            <Card 
              key={section.id} 
              className={cn(
                "transition-all hover:shadow-md",
                isComplete 
                  ? "border-emerald-200 dark:border-emerald-800/50" 
                  : "border-amber-200 dark:border-amber-800/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isComplete 
                      ? "bg-emerald-100 dark:bg-emerald-950/30" 
                      : "bg-amber-100 dark:bg-amber-950/30"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      isComplete ? "text-emerald-600" : "text-amber-600"
                    )} />
                  </div>
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      {section.totalRequired - section.completedCount} pendiente
                    </Badge>
                  )}
                </div>
                <h4 className="font-semibold text-sm mb-1">{section.name}</h4>
                {section.totalRequired > 0 && (
                  <div className="flex items-center gap-2">
                    <Progress value={percentage} className="h-1.5 flex-1" />
                    <span className="text-xs text-slate-500">{percentage}%</span>
                  </div>
                )}
                {section.totalRequired === 0 && (
                  <p className="text-xs text-slate-500">Opcional</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Visual Preview */}
      <Card className="overflow-hidden border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Vista Previa Visual</CardTitle>
              <CardDescription>Cómo se verá tu negocio con la configuración actual</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Hero Preview */}
          <div 
            className="p-8 rounded-2xl border-2 border-dashed transition-all"
            style={{
              background: `linear-gradient(135deg, ${config.branding?.gradientStart || '#e9f0f7'}, ${config.branding?.gradientEnd || '#f9fbfe'})`,
              color: config.branding?.textColor || '#202c38'
            }}
          >
            <h2 className="text-3xl font-bold mb-2">
              <span>{config.heroTitle || 'Tu Título'}</span>{' '}
              <span style={{ color: config.branding?.accentColor || '#059669' }}>
                {config.heroHighlight || 'Destacado'}
              </span>
            </h2>
            <p className="text-lg mb-4 opacity-80">{config.tagline || 'Tu eslogan aquí'}</p>
            <p className="text-sm opacity-60">{config.heroDescription || 'Descripción de tu negocio...'}</p>
          </div>

          {/* Color Palette */}
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Paleta de Colores</p>
            <div className="flex gap-3">
              {[
                { label: 'Primario', color: config.branding?.primaryColor || '#dc2626' },
                { label: 'Secundario', color: config.branding?.secondaryColor || '#1d4ed8' },
                { label: 'Acento', color: config.branding?.accentColor || '#059669' },
              ].map((item) => (
                <div key={item.label} className="flex-1">
                  <div 
                    className="h-16 rounded-xl shadow-lg transition-transform hover:scale-105"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs text-center mt-2 text-slate-500">{item.label}</p>
                  <p className="text-xs text-center font-mono text-slate-400">{item.color}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 mb-1">Moneda</p>
              <p className="font-semibold">
                {config.storeSettings?.currencySymbol || '₲'} {config.storeSettings?.currency || 'PYG'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 mb-1">IVA</p>
              <p className="font-semibold">
                {config.storeSettings?.taxEnabled 
                  ? `${(config.storeSettings.taxRate * 100).toFixed(0)}%` 
                  : 'Deshabilitado'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 mb-1">Ubicación</p>
              <p className="font-semibold truncate">{config.address?.city || 'No configurado'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 mb-1">Contacto</p>
              <p className="font-semibold truncate">{config.contact?.phone || 'No configurado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card className="overflow-hidden border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg">
              <FileJson className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Gestión de Configuración</CardTitle>
              <CardDescription>Exportar, importar o resetear la configuración</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showJsonPreview ? 'Ocultar' : 'Ver'} JSON
            </Button>

            <Button
              variant="outline"
              onClick={exportConfig}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>

            <label className="cursor-pointer">
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  Importar
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="hidden"
              />
            </label>

            <Button
              variant="destructive"
              onClick={onReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetear
            </Button>
          </div>

          {showJsonPreview && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">business-config.json</span>
                <Button variant="ghost" size="sm" onClick={exportConfig}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
              <pre className="bg-slate-50 dark:bg-slate-900 p-4 text-xs overflow-auto max-h-80 font-mono">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Última actualización: {new Date(config.updatedAt).toLocaleString('es-PY')}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span>Creado: {new Date(config.createdAt).toLocaleString('es-PY')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
