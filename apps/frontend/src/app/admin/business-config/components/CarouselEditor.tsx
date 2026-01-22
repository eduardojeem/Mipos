'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Timer,
  Maximize2,
  Zap,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  MonitorPlay,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileImage,
  X,
  FolderOpen
} from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { ImageGallery } from './ImageGallery';

interface CarouselEditorProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
  onSave?: () => Promise<void>;
}

const ASPECT_RATIOS = [
  { label: '16:9', value: 1.777, description: 'Pantalla ancha' },
  { label: '4:3', value: 1.333, description: 'Estándar' },
  { label: '21:9', value: 2.333, description: 'Ultra ancho' },
  { label: '1:1', value: 1, description: 'Cuadrado' },
];

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];



export function CarouselEditor({ config, onUpdate, onSave }: CarouselEditorProps) {
  const { getFieldError } = useConfigValidation();
  const [previewCarousel, setPreviewCarousel] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file');
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_CAROUSEL || 'carousel';

  // Función para agregar imagen desde galería al carrusel
  const addGalleryImageToCarousel = (imageUrl: string) => {
    const newImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: imageUrl,
      alt: '',
      link: ''
    };
    handleCarouselChange('images', [...config.carousel.images, newImage]);
    toast.success('Imagen agregada al carrusel');
  };

  const handleCarouselChange = useCallback((field: keyof BusinessConfig['carousel'], value: any) => {
    setHasChanges(true);
    onUpdate({
      carousel: {
        ...config.carousel,
        [field]: value
      }
    });
  }, [config.carousel, onUpdate]);

  const handleHomeOffersCarouselChange = (field: keyof NonNullable<BusinessConfig['homeOffersCarousel']>, value: any) => {
    setHasChanges(true);
    const currentCarousel = config.homeOffersCarousel || {
      enabled: false,
      autoplay: true,
      intervalSeconds: 5,
      transitionMs: 700,
      ratio: 16/9
    };
    
    onUpdate({
      homeOffersCarousel: {
        ...currentCarousel,
        [field]: value
      }
    });
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo de archivo no permitido. Use: JPG, PNG, WebP o GIF`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `El archivo es muy grande. Máximo ${MAX_FILE_SIZE_MB}MB`;
    }
    return null;
  };

  const compressImage = async (file: File, maxWidth = 1920): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      let processedFile = file;
      
      if (file.size > 1024 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
        processedFile = await compressImage(file);
      }
      
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `carousel-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, processedFile, { 
          upsert: true, 
          contentType: processedFile.type 
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    const filesToUpload = Array.from(files);
    const uploadedUrls: string[] = [];
    let errors: string[] = [];
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }
      
      setUploadProgress(Math.round((i / filesToUpload.length) * 80));
      
      const url = await uploadFile(file);
      if (url) {
        uploadedUrls.push(url);
      } else {
        errors.push(`${file.name}: Error al subir`);
      }
    }
    
    setUploadProgress(100);
    
    if (uploadedUrls.length > 0) {
      const newImages = uploadedUrls.map(url => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        alt: '',
        link: ''
      }));
      
      handleCarouselChange('images', [...config.carousel.images, ...newImages]);
      toast.success(`${uploadedUrls.length} imagen(es) subida(s) exitosamente`);
    }
    
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }
    
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 500);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addCarouselImageByUrl = () => {
    const newImage = {
      id: `img-${Date.now()}`,
      url: '',
      alt: '',
      link: ''
    };
    handleCarouselChange('images', [...config.carousel.images, newImage]);
  };

  const updateCarouselImage = (index: number, field: 'url' | 'alt' | 'link', value: string) => {
    const updatedImages = [...config.carousel.images];
    updatedImages[index] = { ...updatedImages[index], [field]: value };
    handleCarouselChange('images', updatedImages);
  };

  const removeCarouselImage = (index: number) => {
    const updatedImages = config.carousel.images.filter((_, i) => i !== index);
    handleCarouselChange('images', updatedImages);
    if (currentSlide >= updatedImages.length) {
      setCurrentSlide(Math.max(0, updatedImages.length - 1));
    }
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.carousel.images.length) return;

    const updatedImages = [...config.carousel.images];
    [updatedImages[index], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[index]];
    handleCarouselChange('images', updatedImages);
  };

  const handleManualSave = async () => {
    if (!onSave) return;
    
    setSaving(true);
    try {
      await onSave();
      setHasChanges(false);
      toast.success('Configuración del carrusel guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isPlaying || !previewCarousel || config.carousel.images.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => 
        prev < config.carousel.images.length - 1 ? prev + 1 : 0
      );
    }, (config.carousel.transitionSeconds || 5) * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, previewCarousel, config.carousel.images.length, config.carousel.transitionSeconds]);

  return (
    <div className="space-y-6">
      {/* Main Carousel */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <MonitorPlay className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Carrusel Principal de Imágenes</CardTitle>
                <CardDescription>Imágenes destacadas en la página principal pública</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <Badge variant="outline" className="gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-700 dark:text-amber-300">Sin guardar</span>
                </Badge>
              )}
              <Button
                onClick={handleManualSave}
                disabled={saving || !hasChanges}
                size="sm"
                className={cn(
                  "gap-2 transition-all",
                  hasChanges 
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                    : ""
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar
                  </>
                )}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Switch
                id="carouselEnabled"
                checked={config.carousel.enabled}
                onCheckedChange={(checked) => handleCarouselChange('enabled', checked)}
              />
              <Label htmlFor="carouselEnabled" className="text-sm font-medium">
                {config.carousel.enabled ? 'Activo' : 'Inactivo'}
              </Label>
            </div>
          </div>
        </CardHeader>
        
        {config.carousel.enabled && (
          <CardContent className="p-6 space-y-6">
            {/* Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Duration */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Timer className="h-4 w-4 text-cyan-500" />
                  Duración por slide
                </Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.carousel.transitionSeconds || 5]}
                    onValueChange={([value]) => handleCarouselChange('transitionSeconds', value)}
                    min={3}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>3s</span>
                    <span className="font-medium text-cyan-600">{config.carousel.transitionSeconds || 5}s</span>
                    <span>10s</span>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Maximize2 className="h-4 w-4 text-blue-500" />
                  Proporción
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => handleCarouselChange('ratio', ratio.value)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all text-center",
                        Math.abs((config.carousel.ratio || 1.777) - ratio.value) < 0.01
                          ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <p className="text-xs font-bold">{ratio.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transition Speed */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Velocidad de transición
                </Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.carousel.transitionMs || 800]}
                    onValueChange={([value]) => handleCarouselChange('transitionMs', value)}
                    min={200}
                    max={2000}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Rápido</span>
                    <span className="font-medium text-amber-600">{config.carousel.transitionMs || 800}ms</span>
                    <span>Lento</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Autoplay Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Play className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium">Reproducción Automática</p>
                  <p className="text-sm text-slate-500">El carrusel avanza automáticamente</p>
                </div>
              </div>
              <Switch
                checked={config.carousel.autoplay || false}
                onCheckedChange={(checked) => handleCarouselChange('autoplay', checked)}
              />
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-lg">Imágenes del Carrusel</h4>
                  <p className="text-sm text-slate-500">
                    {config.carousel.images.length} imagen{config.carousel.images.length !== 1 ? 'es' : ''} configurada{config.carousel.images.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowGallery(true)}
                    className="gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Galería Avanzada
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      onClick={() => setUploadMode('file')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                        uploadMode === 'file' 
                          ? "bg-cyan-500 text-white" 
                          : "bg-white dark:bg-slate-800 hover:bg-slate-50"
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      Subir
                    </button>
                    <button
                      onClick={() => setUploadMode('url')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                        uploadMode === 'url' 
                          ? "bg-cyan-500 text-white" 
                          : "bg-white dark:bg-slate-800 hover:bg-slate-50"
                      )}
                    >
                      <LinkIcon className="h-4 w-4" />
                      URL
                    </button>
                  </div>
                  
                  {uploadMode === 'file' ? (
                    <label className="cursor-pointer">
                      <Button
                        className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                        disabled={uploading}
                        asChild
                      >
                        <span>
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Subir Imágenes
                            </>
                          )}
                        </span>
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  ) : (
                    <Button
                      onClick={addCarouselImageByUrl}
                      className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Agregar por URL
                    </Button>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                    <span className="font-medium text-cyan-900 dark:text-cyan-100">Subiendo imágenes...</span>
                    <span className="text-sm text-cyan-700 dark:text-cyan-300">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Advanced Image Gallery */}
              <ImageGallery
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                onSelectImage={addGalleryImageToCarousel}
                multiSelect={false}
              />

              {config.carousel.images.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400">No hay imágenes</p>
                  <p className="text-sm text-slate-500 mt-1 mb-4">Sube imágenes o agrega URLs para mostrar en el carrusel</p>
                  <div className="flex justify-center gap-3">
                    <label className="cursor-pointer">
                      <Button variant="default" className="gap-2" asChild>
                        <span>
                          <Upload className="h-4 w-4" />
                          Subir Imágenes
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <Button variant="outline" onClick={addCarouselImageByUrl} className="gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Agregar por URL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {config.carousel.images.map((image, index) => (
                    <div 
                      key={image.id} 
                      className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all"
                    >
                      <div className="flex gap-4">
                        {/* Image Preview */}
                        <div className="relative w-40 h-24 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 group/preview">
                          {image.url ? (
                            <>
                              <img
                                src={image.url}
                                alt={image.alt || 'Preview'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f1f5f9" width="100%" height="100%"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%2394a3b8" text-anchor="middle" dy=".3em">Error</text></svg>';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/40 transition-all flex items-center justify-center">
                                <label className="cursor-pointer opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                  <Button size="sm" variant="secondary" className="gap-1" asChild>
                                    <span>
                                      <Upload className="h-3 w-3" />
                                      Cambiar
                                    </span>
                                  </Button>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      
                                      const error = validateFile(file);
                                      if (error) {
                                        toast.error(error);
                                        return;
                                      }
                                      
                                      setUploading(true);
                                      const url = await uploadFile(file);
                                      setUploading(false);
                                      
                                      if (url) {
                                        updateCarouselImage(index, 'url', url);
                                        toast.success('Imagen actualizada');
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <FileImage className="h-8 w-8 text-slate-300" />
                              <label className="cursor-pointer">
                                <span className="text-xs text-cyan-600 hover:underline">Subir imagen</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const error = validateFile(file);
                                    if (error) {
                                      toast.error(error);
                                      return;
                                    }
                                    
                                    setUploading(true);
                                    const url = await uploadFile(file);
                                    setUploading(false);
                                    
                                    if (url) {
                                      updateCarouselImage(index, 'url', url);
                                      toast.success('Imagen subida');
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                          <Badge className="absolute top-1 left-1 text-[10px] bg-slate-900/70">{index + 1}</Badge>
                        </div>

                        {/* Image Details */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              URL de la imagen
                            </Label>
                            <Input
                              value={image.url}
                              onChange={(e) => updateCarouselImage(index, 'url', e.target.value)}
                              placeholder="https://ejemplo.com/imagen.jpg"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Texto alternativo (SEO)</Label>
                            <Input
                              value={image.alt || ''}
                              onChange={(e) => updateCarouselImage(index, 'alt', e.target.value)}
                              placeholder="Descripción de la imagen"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveImage(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveImage(index, 'down')}
                            disabled={index === config.carousel.images.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => removeCarouselImage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Section */}
            {config.carousel.images.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewCarousel(!previewCarousel)}
                    className="gap-2"
                  >
                    {previewCarousel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {previewCarousel ? 'Ocultar Preview' : 'Ver Preview'}
                  </Button>
                  {previewCarousel && (
                    <Button
                      variant="outline"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="gap-2"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlaying ? 'Pausar' : 'Reproducir'}
                    </Button>
                  )}
                </div>

                {previewCarousel && (
                  <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-xs text-slate-500">Vista previa del carrusel</p>
                      <div />
                    </div>
                    <div 
                      className="relative overflow-hidden bg-slate-200 dark:bg-slate-800"
                      style={{ aspectRatio: config.carousel.ratio || 1.777 }}
                    >
                      <img
                        src={config.carousel.images[currentSlide]?.url || ''}
                        alt={config.carousel.images[currentSlide]?.alt || ''}
                        className="w-full h-full object-cover transition-opacity duration-500"
                        style={{ transitionDuration: `${config.carousel.transitionMs || 800}ms` }}
                      />
                      
                      {/* Navigation Arrows */}
                      <button
                        onClick={() => setCurrentSlide((prev) => 
                          prev > 0 ? prev - 1 : config.carousel.images.length - 1
                        )}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => setCurrentSlide((prev) => 
                          prev < config.carousel.images.length - 1 ? prev + 1 : 0
                        )}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>

                      {/* Dots */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {config.carousel.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              index === currentSlide 
                                ? "bg-white w-6" 
                                : "bg-white/50 hover:bg-white/80"
                            )}
                          />
                        ))}
                      </div>

                      {/* Slide Counter */}
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                        {currentSlide + 1} / {config.carousel.images.length}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button Footer */}
            {hasChanges && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Tienes cambios sin guardar</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Recuerda guardar los cambios del carrusel</p>
                  </div>
                </div>
                <Button
                  onClick={handleManualSave}
                  disabled={saving}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
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
          </CardContent>
        )}
      </Card>

      {/* Offers Carousel */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Carrusel de Ofertas</CardTitle>
                <CardDescription>Muestra productos en oferta automáticamente</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.homeOffersCarousel?.enabled || false}
                onCheckedChange={(checked) => handleHomeOffersCarouselChange('enabled', checked)}
              />
              <Label className="text-sm font-medium">
                {config.homeOffersCarousel?.enabled ? 'Activo' : 'Inactivo'}
              </Label>
            </div>
          </div>
        </CardHeader>

        {config.homeOffersCarousel?.enabled && (
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Interval */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Timer className="h-4 w-4 text-emerald-500" />
                  Intervalo
                </Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.homeOffersCarousel?.intervalSeconds || 5]}
                    onValueChange={([value]) => handleHomeOffersCarouselChange('intervalSeconds', value)}
                    min={3}
                    max={10}
                    step={1}
                  />
                  <p className="text-xs text-center text-slate-500">
                    {config.homeOffersCarousel?.intervalSeconds || 5} segundos
                  </p>
                </div>
              </div>

              {/* Ratio */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Maximize2 className="h-4 w-4 text-teal-500" />
                  Proporción
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => handleHomeOffersCarouselChange('ratio', ratio.value)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all text-center",
                        Math.abs((config.homeOffersCarousel?.ratio || 1.777) - ratio.value) < 0.01
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <p className="text-xs font-bold">{ratio.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transition */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Transición
                </Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.homeOffersCarousel?.transitionMs || 700]}
                    onValueChange={([value]) => handleHomeOffersCarouselChange('transitionMs', value)}
                    min={200}
                    max={2000}
                    step={100}
                  />
                  <p className="text-xs text-center text-slate-500">
                    {config.homeOffersCarousel?.transitionMs || 700}ms
                  </p>
                </div>
              </div>
            </div>

            {/* Autoplay */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <Play className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium">Reproducción Automática</p>
                  <p className="text-sm text-slate-500">Avance automático entre ofertas</p>
                </div>
              </div>
              <Switch
                checked={config.homeOffersCarousel?.autoplay || false}
                onCheckedChange={(checked) => handleHomeOffersCarouselChange('autoplay', checked)}
              />
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Ofertas Automáticas</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Este carrusel muestra automáticamente los productos marcados como "En Oferta". 
                    Para agregar ofertas, ve a <strong>Productos → Editar producto → Marcar como oferta</strong>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
