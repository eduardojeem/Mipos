'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import {
  Palette,
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  CheckCircle,
  Type,
  Droplets,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { BusinessConfig } from '../../../../types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';
import { ImageUploader } from './ImageUploader';
import { OptimizedImage } from './OptimizedImage';
import { cn } from '../../../../lib/utils';

interface BrandingFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

// Paletas de colores predefinidas
const COLOR_PRESETS = [
  {
    name: 'Elegante',
    primary: '#dc2626',
    secondary: '#1d4ed8',
    accent: '#059669',
    description: 'Rojo profesional con azul elegante'
  },
  {
    name: 'Moderno',
    primary: '#7c3aed',
    secondary: '#0ea5e9',
    accent: '#f59e0b',
    description: 'Violeta vibrante y cyan moderno'
  },
  {
    name: 'Natural',
    primary: '#16a34a',
    secondary: '#0d9488',
    accent: '#ca8a04',
    description: 'Tonos verdes naturales'
  },
  {
    name: 'Corporativo',
    primary: '#2563eb',
    secondary: '#4f46e5',
    accent: '#06b6d4',
    description: 'Azules profesionales'
  },
  {
    name: 'Cálido',
    primary: '#ea580c',
    secondary: '#e11d48',
    accent: '#eab308',
    description: 'Naranjas y rojos cálidos'
  },
  {
    name: 'Minimalista',
    primary: '#18181b',
    secondary: '#52525b',
    accent: '#a855f7',
    description: 'Tonos neutros con acento violeta'
  }
];

export function BrandingForm({ config, onUpdate }: BrandingFormProps) {
  const { getFieldError } = useConfigValidation();
  const [showPreview, setShowPreview] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showLogoUploader, setShowLogoUploader] = useState(false);
  const [showFaviconUploader, setShowFaviconUploader] = useState(false);

  const handleBrandingChange = (field: keyof BusinessConfig['branding'], value: string) => {
    setActivePreset(null);
    onUpdate({
      branding: {
        ...config.branding,
        [field]: value
      }
    });
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setActivePreset(preset.name);
    onUpdate({
      branding: {
        ...config.branding,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        accentColor: preset.accent
      }
    });
  };

  const resetToDefaults = () => {
    setActivePreset(null);
    onUpdate({
      branding: {
        primaryColor: "#dc2626",
        secondaryColor: "#1d4ed8",
        accentColor: "#059669",
        backgroundColor: "#f7f9fb",
        textColor: "#202c38",
        gradientStart: "#e9f0f7",
        gradientEnd: "#f9fbfe"
      }
    });
  };

  const handleLogoUpload = (urls: string[]) => {
    if (urls.length > 0) {
      handleBrandingChange('logo', urls[0]);
      setShowLogoUploader(false);
    }
  };

  const handleFaviconUpload = (urls: string[]) => {
    if (urls.length > 0) {
      handleBrandingChange('favicon', urls[0]);
      setShowFaviconUploader(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Color Presets */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-950/20 dark:to-violet-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Paletas Predefinidas</CardTitle>
                <CardDescription>Selecciona una combinación de colores profesional</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 group",
                  activePreset === preset.name
                    ? "border-violet-500 shadow-lg shadow-violet-500/20 bg-violet-50 dark:bg-violet-950/30"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <div className="flex gap-1 mb-3 justify-center">
                  <div
                    className="w-6 h-6 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 -ml-2"
                    style={{ backgroundColor: preset.secondary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 -ml-2"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <p className="text-sm font-medium text-center">{preset.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-1 line-clamp-2">
                  {preset.description}
                </p>
                {activePreset === preset.name && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-4 w-4 text-violet-500" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Colores Personalizados</CardTitle>
                <CardDescription>Ajusta cada color individualmente</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Ocultar' : 'Preview'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="main" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main" className="gap-2">
                <Droplets className="h-4 w-4" />
                Colores Principales
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Type className="h-4 w-4" />
                Fondo y Texto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Color Primario
                    <Badge variant="outline" className="text-[10px]">Requerido</Badge>
                  </Label>
                  <div className="flex gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={config.branding.primaryColor}
                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 overflow-hidden"
                        style={{ padding: 0 }}
                      />
                      <div
                        className="absolute inset-1 rounded-lg pointer-events-none"
                        style={{ backgroundColor: config.branding.primaryColor }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.primaryColor}
                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                        placeholder="#dc2626"
                        className={cn(
                          "font-mono",
                          getFieldError('branding.primaryColor') ? 'border-red-500' : ''
                        )}
                      />
                      <p className="text-xs text-slate-500">Botones y elementos principales</p>
                    </div>
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Color Secundario</Label>
                  <div className="flex gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={config.branding.secondaryColor}
                        onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 overflow-hidden"
                        style={{ padding: 0 }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.secondaryColor}
                        onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                        placeholder="#1d4ed8"
                        className="font-mono"
                      />
                      <p className="text-xs text-slate-500">Enlaces y elementos secundarios</p>
                    </div>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Color de Acento</Label>
                  <div className="flex gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={config.branding.accentColor}
                        onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 overflow-hidden"
                        style={{ padding: 0 }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.accentColor}
                        onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                        placeholder="#059669"
                        className="font-mono"
                      />
                      <p className="text-xs text-slate-500">Destacados y notificaciones</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Background Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    Color de Fondo
                  </Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={config.branding.backgroundColor || '#f7f9fb'}
                      onChange={(e) => handleBrandingChange('backgroundColor', e.target.value)}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.backgroundColor || ''}
                        onChange={(e) => handleBrandingChange('backgroundColor', e.target.value)}
                        placeholder="#f7f9fb"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4 text-slate-500" />
                    Color de Texto
                  </Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={config.branding.textColor || '#202c38'}
                      onChange={(e) => handleBrandingChange('textColor', e.target.value)}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.textColor || ''}
                        onChange={(e) => handleBrandingChange('textColor', e.target.value)}
                        placeholder="#202c38"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Gradient Start */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Inicio de Gradiente</Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={config.branding.gradientStart || '#e9f0f7'}
                      onChange={(e) => handleBrandingChange('gradientStart', e.target.value)}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.gradientStart || ''}
                        onChange={(e) => handleBrandingChange('gradientStart', e.target.value)}
                        placeholder="#e9f0f7"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Gradient End */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Fin de Gradiente</Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={config.branding.gradientEnd || '#f9fbfe'}
                      onChange={(e) => handleBrandingChange('gradientEnd', e.target.value)}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={config.branding.gradientEnd || ''}
                        onChange={(e) => handleBrandingChange('gradientEnd', e.target.value)}
                        placeholder="#f9fbfe"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Live Preview */}
          {showPreview && (
            <div className="mt-6 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Vista Previa en Tiempo Real</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="p-4 rounded-xl text-white font-medium shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: config.branding.primaryColor }}
                >
                  <p className="text-sm opacity-80">Primario</p>
                  <p className="text-lg">Botón Principal</p>
                </div>
                <div
                  className="p-4 rounded-xl text-white font-medium shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: config.branding.secondaryColor }}
                >
                  <p className="text-sm opacity-80">Secundario</p>
                  <p className="text-lg">Enlace Activo</p>
                </div>
                <div
                  className="p-4 rounded-xl text-white font-medium shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: config.branding.accentColor }}
                >
                  <p className="text-sm opacity-80">Acento</p>
                  <p className="text-lg">Notificación</p>
                </div>
              </div>
              <div
                className="mt-4 p-6 rounded-xl border transition-all"
                style={{
                  background: `linear-gradient(135deg, ${config.branding.gradientStart || '#e9f0f7'}, ${config.branding.gradientEnd || '#f9fbfe'})`,
                  color: config.branding.textColor || '#202c38'
                }}
              >
                <p className="text-sm opacity-70">Fondo con Gradiente</p>
                <p className="text-xl font-semibold">Texto sobre fondo personalizado</p>
                <p className="mt-2">Este es un ejemplo de cómo se verá el contenido con tu paleta de colores seleccionada.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo & Visual Assets */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Recursos Visuales</CardTitle>
              <CardDescription>Logo, favicon e imágenes de marca para tu negocio</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Logo Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-amber-500" />
                  Logo del Negocio
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Imagen principal que representa tu marca
                </p>
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Recomendado
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Logo Preview & Controls */}
              <div className="space-y-4">
                {config.branding.logo ? (
                  <div className="relative group">
                    <div className="p-6 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                      <div className="flex items-center justify-center min-h-24">
                        <OptimizedImage
                          src={config.branding.logo}
                          alt="Logo del negocio"
                          className="max-h-20 max-w-full object-contain"
                          lazy={false}
                        />
                      </div>
                    </div>

                    {/* Overlay con acciones */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-2xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowLogoUploader(true)}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Cambiar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleBrandingChange('logo', '')}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-8 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 text-center cursor-pointer hover:border-amber-300 transition-all"
                    onClick={() => setShowLogoUploader(true)}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="h-8 w-8 text-amber-600" />
                    </div>
                    <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Subir Logo
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Haz clic para seleccionar o arrastra tu logo aquí
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowLogoUploader(true)}
                    className="flex-1 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <Upload className="h-4 w-4" />
                    {config.branding.logo ? 'Cambiar Logo' : 'Subir Logo'}
                  </Button>
                  {config.branding.logo && (
                    <Button
                      variant="outline"
                      onClick={() => handleBrandingChange('logo', '')}
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>

              {/* Logo Guidelines */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Especificaciones Recomendadas
                  </h5>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>Formato:</strong> PNG con fondo transparente
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>Dimensiones:</strong> 200x60px (máximo)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>Tamaño:</strong> Menos de 500KB
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>Proporción:</strong> Horizontal preferible
                    </li>
                  </ul>
                </div>

                {/* Manual URL Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">O ingresa URL manualmente</Label>
                  <Input
                    value={config.branding.logo || ''}
                    onChange={(e) => handleBrandingChange('logo', e.target.value)}
                    placeholder="https://minegocio.com.py/logo.png"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    URL directa a tu logo (debe ser accesible públicamente)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Favicon Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  Favicon
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Icono pequeño que aparece en la pestaña del navegador
                </p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Opcional
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Favicon Preview & Controls */}
              <div className="space-y-4">
                {config.branding.favicon ? (
                  <div className="relative group">
                    <div className="p-6 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                      <div className="flex items-center justify-center min-h-16">
                        <OptimizedImage
                          src={config.branding.favicon}
                          alt="Favicon"
                          className="w-8 h-8 object-contain"
                          lazy={false}
                        />
                      </div>
                    </div>

                    {/* Overlay con acciones */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-2xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowFaviconUploader(true)}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Cambiar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleBrandingChange('favicon', '')}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-8 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 text-center cursor-pointer hover:border-blue-300 transition-all"
                    onClick={() => setShowFaviconUploader(true)}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Subir Favicon
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Icono para la pestaña del navegador
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFaviconUploader(true)}
                    className="flex-1 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4" />
                    {config.branding.favicon ? 'Cambiar Favicon' : 'Subir Favicon'}
                  </Button>
                  {config.branding.favicon && (
                    <Button
                      variant="outline"
                      onClick={() => handleBrandingChange('favicon', '')}
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>

              {/* Favicon Guidelines */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Especificaciones para Favicon
                  </h5>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <strong>Formato:</strong> ICO, PNG o SVG
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <strong>Dimensiones:</strong> 32x32px o 16x16px
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <strong>Tamaño:</strong> Menos de 100KB
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <strong>Diseño:</strong> Simple y reconocible
                    </li>
                  </ul>
                </div>

                {/* Manual URL Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">O ingresa URL manualmente</Label>
                  <Input
                    value={config.branding.favicon || ''}
                    onChange={(e) => handleBrandingChange('favicon', e.target.value)}
                    placeholder="https://minegocio.com.py/favicon.ico"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    URL directa a tu favicon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Uploaders */}
      <ImageUploader
        isOpen={showLogoUploader}
        onClose={() => setShowLogoUploader(false)}
        onUploadComplete={handleLogoUpload}
        maxFiles={1}
        maxFileSize={2}
        allowedTypes={['image/png', 'image/jpeg', 'image/svg+xml']}
        autoCompress={true}
      />

      <ImageUploader
        isOpen={showFaviconUploader}
        onClose={() => setShowFaviconUploader(false)}
        onUploadComplete={handleFaviconUpload}
        maxFiles={1}
        maxFileSize={1}
        allowedTypes={['image/png', 'image/x-icon', 'image/svg+xml']}
        autoCompress={true}
      />
    </div>
  );
}
