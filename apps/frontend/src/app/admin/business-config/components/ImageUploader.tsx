'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  FileImage,
  Loader2,
  Trash2,
  Minimize2,
  Settings,
  Info
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { OptimizedImage } from './OptimizedImage';
import { SupabaseDiagnostic } from './SupabaseDiagnostic';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface FileWithPreview {
  // Propiedades básicas de File
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;
  
  // Métodos de File
  arrayBuffer: () => Promise<ArrayBuffer>;
  slice: (start?: number, end?: number, contentType?: string) => Blob;
  stream: () => ReadableStream<Uint8Array>;
  text: () => Promise<string>;
  
  // Propiedades adicionales
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  compressed?: File;
  metadata?: {
    originalSize: number;
    compressedSize: number;
    dimensions: { width: number; height: number };
  };
}

interface ImageUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // MB
  allowedTypes?: string[];
  autoCompress?: boolean;
  compressQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface CompressionSettings {
  enabled: boolean;
  quality: number;
  maxWidth: number;
  maxHeight: number;
  format: 'original' | 'jpeg' | 'webp';
}

const DEFAULT_SETTINGS: CompressionSettings = {
  enabled: true,
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
  format: 'jpeg'
};

// Presets de optimización para diferentes necesidades
const COMPRESSION_PRESETS = {
  'ultra-light': {
    enabled: true,
    quality: 0.6,
    maxWidth: 800,
    maxHeight: 600,
    format: 'jpeg' as const,
    description: 'Máximo ahorro (60% calidad, 800x600px)'
  },
  'light': {
    enabled: true,
    quality: 0.7,
    maxWidth: 1200,
    maxHeight: 800,
    format: 'jpeg' as const,
    description: 'Ahorro alto (70% calidad, 1200x800px)'
  },
  'balanced': {
    enabled: true,
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'jpeg' as const,
    description: 'Equilibrado (80% calidad, Full HD)'
  },
  'quality': {
    enabled: true,
    quality: 0.9,
    maxWidth: 2560,
    maxHeight: 1440,
    format: 'webp' as const,
    description: 'Alta calidad (90% calidad, 2K, WebP)'
  },
  'original': {
    enabled: false,
    quality: 1.0,
    maxWidth: 4000,
    maxHeight: 4000,
    format: 'original' as const,
    description: 'Sin compresión (tamaño original)'
  }
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 10;

export function ImageUploader({
  isOpen,
  onClose,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = MAX_FILE_SIZE_MB,
  allowedTypes = ALLOWED_TYPES,
  autoCompress = true
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithPreview | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_CAROUSEL || 'carousel';

  // Función de diagnóstico para verificar configuración
  const diagnoseSupabaseConfig = useCallback(async () => {
    console.log('🔍 Diagnosticando configuración de Supabase...');
    
    try {
      // Verificar cliente
      if (!supabase) {
        console.error('❌ Cliente de Supabase no inicializado');
        return false;
      }

      // Verificar bucket
      console.log('📦 Bucket configurado:', bucket);
      
      // Verificar autenticación
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Error de autenticación:', authError);
        return false;
      }
      
      if (!user) {
        console.warn('⚠️ Usuario no autenticado');
        return false;
      }
      
      console.log('✅ Usuario autenticado:', user.email);
      
      // Verificar acceso al bucket usando API
      const response = await fetch('/api/storage/buckets');
      if (!response.ok) {
        console.error('❌ Error consultando buckets:', response.statusText);
        return false;
      }
      
      const { buckets, error: bucketsError } = await response.json();
      if (bucketsError) {
        console.error('❌ Error en respuesta de buckets:', bucketsError);
        return false;
      }
      
      const bucketExists = buckets?.some((b: any) => b.name === bucket);
      if (!bucketExists) {
        console.error('❌ Bucket no encontrado:', bucket);
        console.log('📋 Buckets disponibles:', buckets?.map((b: any) => b.name));
        return false;
      }
      
      console.log('✅ Bucket encontrado:', bucket);
      
      // Verificar permisos de escritura (test con archivo pequeño)
      const testFileName = `test-${Date.now()}.txt`;
      const testFile = new Blob(['test'], { type: 'text/plain' });
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(testFileName, testFile);
      
      if (uploadError) {
        console.error('❌ Error de permisos de escritura:', uploadError);
        return false;
      }
      
      // Limpiar archivo de test
      await supabase.storage.from(bucket).remove([testFileName]);
      
      console.log('✅ Permisos de escritura confirmados');
      return true;
      
    } catch (error) {
      console.error('💥 Error en diagnóstico:', error);
      return false;
    }
  }, [supabase, bucket]);

  // Generar ID único para archivos
  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Validar archivo
  const validateFile = useCallback((file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Tipo no permitido. Formatos válidos: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Archivo muy grande. Máximo ${maxFileSize}MB`;
    }
    return null;
  }, [allowedTypes, maxFileSize]);

  // Obtener dimensiones de imagen
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      // Validar que el archivo sea válido
      if (!file || !(file instanceof File)) {
        console.error('Invalid file provided to getImageDimensions:', file);
        resolve({ width: 0, height: 0 });
        return;
      }

      // Verificar que sea una imagen
      if (!file.type.startsWith('image/')) {
        console.warn('File is not an image:', file.type);
        resolve({ width: 0, height: 0 });
        return;
      }

      const img = new Image();
      let objectUrl: string | null = null;
      
      img.onload = () => {
        const dimensions = { width: img.width, height: img.height };
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        resolve(dimensions);
      };
      
      img.onerror = (error) => {
        console.error('Error loading image for dimensions:', error);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        resolve({ width: 0, height: 0 });
      };
      
      try {
        objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
      } catch (error) {
        console.error('Error creating object URL for dimensions:', error);
        resolve({ width: 0, height: 0 });
      }
    });
  };

  // Comprimir imagen
  const compressImage = useCallback(async (file: File, settings: CompressionSettings): Promise<File> => {
    if (!settings.enabled) return file;

    // Validar que el archivo sea válido
    if (!file) {
      console.error('No file provided to compressImage');
      return file;
    }

    if (!(file instanceof File)) {
      console.error('Invalid file provided to compressImage:', {
        file,
        type: typeof file,
        constructor: (file as any)?.constructor?.name,
        isFile: false
      });
      return file;
    }

    // Verificar propiedades esenciales del archivo
    if (!file.name || !file.type || typeof file.size !== 'number') {
      console.error('File missing essential properties:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      return file;
    }

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      console.warn('File is not an image, skipping compression:', file.type);
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      let objectUrl: string | null = null;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('Could not get canvas context');
            resolve(file);
            return;
          }
          
          let { width, height } = img;
          
          // Calcular nuevas dimensiones manteniendo aspect ratio
          if (width > settings.maxWidth || height > settings.maxHeight) {
            const ratio = Math.min(settings.maxWidth / width, settings.maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);
          
          // Determinar formato de salida
          let outputType = file.type;
          if (settings.format === 'jpeg') outputType = 'image/jpeg';
          else if (settings.format === 'webp') outputType = 'image/webp';
          
          canvas.toBlob(
            (blob) => {
              // Limpiar URL del objeto
              if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
              }
              
              if (blob) {
                try {
                  const compressedFile = new File([blob], file.name, { 
                    type: outputType,
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                } catch (error) {
                  console.error('Error creating compressed file:', error);
                  resolve(file);
                }
              } else {
                console.warn('Canvas toBlob returned null, using original file');
                resolve(file);
              }
            },
            outputType,
            settings.quality
          );
        } catch (error) {
          console.error('Error in image compression:', error);
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          resolve(file);
        }
      };
      
      img.onerror = (error) => {
        console.error('Error loading image for compression:', error);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        resolve(file);
      };
      
      try {
        objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
      } catch (error) {
        console.error('Error creating object URL:', error);
        resolve(file);
      }
    });
  }, []);

  // Comprimir archivos en lote
  const compressFiles = useCallback(async (filesToCompress: FileWithPreview[]) => {
    for (const file of filesToCompress) {
      try {
        // Validar que el archivo sea válido antes de comprimir
        if (!file || !(file instanceof File) || !file.type.startsWith('image/')) {
          console.warn('Skipping invalid file in compressFiles:', file);
          continue;
        }

        const compressed = await compressImage(file, settings);
        const compressedSize = compressed.size;
        
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                compressed,
                metadata: {
                  ...f.metadata!,
                  compressedSize
                }
              }
            : f
        ));
      } catch (error) {
        console.error('Compression error for file:', file?.name || 'unknown', error);
      }
    }
  }, [compressImage, settings]);

  // Procesar archivos seleccionados
  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: FileWithPreview[] = [];
    
    try {
      for (const file of Array.from(fileList)) {
        // Validar que el archivo sea válido
        if (!file || !(file instanceof File)) {
          console.warn('Invalid file in fileList:', file);
          continue;
        }

        const error = validateFile(file);
        if (error) {
          toast({
            title: "Archivo rechazado",
            description: `${file.name}: ${error}`,
            variant: "destructive"
          });
          continue;
        }
        
        if (files.length + newFiles.length >= maxFiles) {
          toast({
            title: "Límite alcanzado",
            description: `Máximo ${maxFiles} archivos permitidos`,
            variant: "destructive"
          });
          break;
        }
        
        const id = generateId();
        let preview: string;
        let dimensions: { width: number; height: number };
        
        try {
          preview = URL.createObjectURL(file);
          dimensions = await getImageDimensions(file);
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          toast({
            title: "Error procesando archivo",
            description: `No se pudo procesar ${file.name}`,
            variant: "destructive"
          });
          continue;
        }
        
        // Crear FileWithPreview de manera segura
        const fileWithPreview: FileWithPreview = {
          // Propiedades de File accedidas de forma segura
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          webkitRelativePath: file.webkitRelativePath || '',
          
          // Métodos de File
          arrayBuffer: file.arrayBuffer.bind(file),
          slice: file.slice.bind(file),
          stream: file.stream.bind(file),
          text: file.text.bind(file),
          
          // Propiedades adicionales
          id,
          preview,
          status: 'pending' as const,
          progress: 0,
          metadata: {
            originalSize: file.size,
            compressedSize: file.size,
            dimensions
          }
        } as FileWithPreview;
        
        newFiles.push(fileWithPreview);
      }
      
      setFiles(prev => [...prev, ...newFiles]);
      
      // Auto-comprimir si está habilitado
      if (autoCompress && settings.enabled && newFiles.length > 0) {
        // Filtrar solo archivos válidos para compresión
        const validFiles = newFiles.filter(f => 
          f && f instanceof File && f.type.startsWith('image/')
        );
        if (validFiles.length > 0) {
          compressFiles(validFiles);
        }
      }
    } catch (error) {
      console.error('Error in processFiles:', error);
      toast({
        title: "Error procesando archivos",
        description: "Ocurrió un error al procesar los archivos seleccionados",
        variant: "destructive"
      });
    }
  }, [files.length, maxFiles, validateFile, toast, autoCompress, settings, compressFiles]);

  // Subir archivo individual
  const uploadFile = useCallback(async (file: FileWithPreview): Promise<string | null> => {
    const fileToUpload = file.compressed || file;
    
    try {
      console.log('🚀 Iniciando subida:', {
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type,
        bucket: bucket
      });

      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading' as const } : f
      ));
      
      // Generar nombre único para el archivo
      const ext = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).slice(2);
      const fileName = `carousel/${timestamp}-${randomId}.${ext}`;
      
      console.log('📁 Subiendo a:', fileName);
      
      // Verificar que el cliente de Supabase esté configurado
      if (!supabase) {
        throw new Error('Cliente de Supabase no inicializado');
      }

      // Intentar subir el archivo
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false, // Cambiar a false para evitar sobrescribir
          contentType: fileToUpload.type
        });
      
      if (error) {
        console.error('❌ Error de Supabase Storage:', error);
        throw new Error(`Error de Supabase: ${error.message}`);
      }

      if (!data) {
        throw new Error('No se recibieron datos de la subida');
      }

      console.log('✅ Archivo subido exitosamente:', data);
      
      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      if (!publicUrl) {
        throw new Error('No se pudo generar URL pública');
      }

      console.log('🔗 URL pública generada:', publicUrl);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'success' as const, progress: 100 }
          : f
      ));
      
      return publicUrl;
    } catch (error) {
      console.error('💥 Error completo en subida:', error);
      
      let errorMessage = 'Error desconocido';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }

      // Mensajes de error más específicos
      if (errorMessage.includes('JWT')) {
        errorMessage = 'Error de autenticación. Inicia sesión nuevamente.';
      } else if (errorMessage.includes('RLS')) {
        errorMessage = 'Sin permisos para subir archivos. Contacta al administrador.';
      } else if (errorMessage.includes('Bucket')) {
        errorMessage = 'Bucket de almacenamiento no encontrado.';
      } else if (errorMessage.includes('size')) {
        errorMessage = 'Archivo muy grande para subir.';
      }
      
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: 'error' as const, 
              error: errorMessage
            }
          : f
      ));
      
      // Mostrar toast con error específico
      toast({
        title: "Error al subir imagen",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    }
  }, [supabase, bucket, toast]);

  // Subir todos los archivos
  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    
    setIsUploading(true);
    setOverallProgress(0);
    
    const uploadPromises = pendingFiles.map(async (file, index) => {
      const url = await uploadFile(file);
      setOverallProgress(((index + 1) / pendingFiles.length) * 100);
      return url;
    });
    
    const results = await Promise.all(uploadPromises);
    const successfulUrls = results.filter(Boolean) as string[];
    
    setIsUploading(false);
    
    if (successfulUrls.length > 0) {
      toast({
        title: "Subida completada",
        description: `${successfulUrls.length} de ${pendingFiles.length} imágenes subidas correctamente.`,
      });
      onUploadComplete(successfulUrls);
    }
    
    // Limpiar archivos exitosos después de un delay
    setTimeout(() => {
      setFiles(prev => prev.filter(f => f.status !== 'success'));
    }, 2000);
  }, [files, uploadFile, onUploadComplete, toast]);

  // Remover archivo
  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Limpiar todos los archivos
  const clearAllFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  }, [files]);

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calcular estadísticas
  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    success: files.filter(f => f.status === 'success').length,
    error: files.filter(f => f.status === 'error').length,
    totalOriginalSize: files.reduce((acc, f) => acc + (f.metadata?.originalSize || 0), 0),
    totalCompressedSize: files.reduce((acc, f) => acc + (f.metadata?.compressedSize || 0), 0)
  };

  const compressionSavings = stats.totalOriginalSize > 0 
    ? ((stats.totalOriginalSize - stats.totalCompressedSize) / stats.totalOriginalSize) * 100 
    : 0;

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  // Diagnóstico automático al abrir
  useEffect(() => {
    if (isOpen) {
      diagnoseSupabaseConfig();
    }
  }, [isOpen, diagnoseSupabaseConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Subir Imágenes</CardTitle>
                <p className="text-sm text-slate-500">
                  Arrastra archivos o haz clic para seleccionar
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Configuración
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiagnostic(true)}
                className="gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Info className="h-4 w-4" />
                Diagnóstico
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Estadísticas */}
          {stats.total > 0 && (
            <div className="flex items-center gap-4 mt-4 text-sm">
              <Badge variant="outline" className="gap-1">
                <FileImage className="h-3 w-3" />
                {stats.total} archivo{stats.total !== 1 ? 's' : ''}
              </Badge>
              {stats.pending > 0 && (
                <Badge variant="secondary">
                  {stats.pending} pendiente{stats.pending !== 1 ? 's' : ''}
                </Badge>
              )}
              {stats.success > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  {stats.success} exitoso{stats.success !== 1 ? 's' : ''}
                </Badge>
              )}
              {stats.error > 0 && (
                <Badge variant="destructive">
                  {stats.error} error{stats.error !== 1 ? 'es' : ''}
                </Badge>
              )}
              {compressionSavings > 0 && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <Minimize2 className="h-3 w-3 mr-1" />
                  {compressionSavings.toFixed(1)}% compresión
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6 space-y-6">
          {/* Panel de estadísticas de compresión */}
          {stats.total > 0 && compressionSavings > 0 && (
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 dark:from-green-950 dark:to-blue-950 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <Minimize2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-200">
                        Ahorro de Espacio
                      </h4>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {formatFileSize(stats.totalOriginalSize - stats.totalCompressedSize)} ahorrados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {compressionSavings.toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {formatFileSize(stats.totalOriginalSize)} → {formatFileSize(stats.totalCompressedSize)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuración de compresión */}
          {showSettings && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración de Compresión
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "💡 Consejos de Optimización",
                        description: (
                          <div className="space-y-2 text-sm">
                            <p><strong>Ultra Ligero:</strong> Máximo ahorro (85-90%) para web</p>
                            <p><strong>Ligero:</strong> Alto ahorro (70-80%) para catálogo</p>
                            <p><strong>Equilibrado:</strong> Calidad/tamaño balanceado</p>
                            <p className="text-blue-600">💾 Ahorro típico: 2MB → 200KB</p>
                          </div>
                        ),
                        duration: 8000,
                      });
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="compression-enabled">Compresión automática</Label>
                  <Switch
                    id="compression-enabled"
                    checked={settings.enabled}
                    onCheckedChange={(enabled) => 
                      setSettings(prev => ({ ...prev, enabled }))
                    }
                  />
                </div>
                
                {settings.enabled && (
                  <>
                    {/* Presets de optimización */}
                    <div className="space-y-2">
                      <Label>Presets de optimización</Label>
                      <Select
                        value={Object.keys(COMPRESSION_PRESETS).find(key => {
                          const preset = COMPRESSION_PRESETS[key as keyof typeof COMPRESSION_PRESETS];
                          return preset.quality === settings.quality && 
                                 preset.maxWidth === settings.maxWidth && 
                                 preset.maxHeight === settings.maxHeight &&
                                 preset.format === settings.format;
                        }) || 'custom'}
                        onValueChange={(presetKey) => {
                          if (presetKey !== 'custom') {
                            const preset = COMPRESSION_PRESETS[presetKey as keyof typeof COMPRESSION_PRESETS];
                            setSettings({
                              enabled: preset.enabled,
                              quality: preset.quality,
                              maxWidth: preset.maxWidth,
                              maxHeight: preset.maxHeight,
                              format: preset.format
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar preset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ultra-light">
                            <div className="flex flex-col">
                              <span className="font-medium">Ultra Ligero</span>
                              <span className="text-xs text-muted-foreground">
                                {COMPRESSION_PRESETS['ultra-light'].description}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="light">
                            <div className="flex flex-col">
                              <span className="font-medium">Ligero</span>
                              <span className="text-xs text-muted-foreground">
                                {COMPRESSION_PRESETS.light.description}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="balanced">
                            <div className="flex flex-col">
                              <span className="font-medium">Equilibrado</span>
                              <span className="text-xs text-muted-foreground">
                                {COMPRESSION_PRESETS.balanced.description}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="quality">
                            <div className="flex flex-col">
                              <span className="font-medium">Alta Calidad</span>
                              <span className="text-xs text-muted-foreground">
                                {COMPRESSION_PRESETS.quality.description}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="original">
                            <div className="flex flex-col">
                              <span className="font-medium">Original</span>
                              <span className="text-xs text-muted-foreground">
                                {COMPRESSION_PRESETS.original.description}
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom">
                            <div className="flex flex-col">
                              <span className="font-medium">Personalizado</span>
                              <span className="text-xs text-muted-foreground">
                                Configuración manual
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {settings.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Calidad ({Math.round(settings.quality * 100)}%)</Label>
                      <Slider
                        value={[settings.quality]}
                        onValueChange={([quality]) => 
                          setSettings(prev => ({ ...prev, quality }))
                        }
                        min={0.1}
                        max={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ancho máximo (px)</Label>
                        <Input
                          type="number"
                          value={settings.maxWidth}
                          onChange={(e) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              maxWidth: parseInt(e.target.value) || 1920 
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alto máximo (px)</Label>
                        <Input
                          type="number"
                          value={settings.maxHeight}
                          onChange={(e) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              maxHeight: parseInt(e.target.value) || 1080 
                            }))
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Formato de salida</Label>
                      <Select
                        value={settings.format}
                        onValueChange={(format: 'original' | 'jpeg' | 'webp') =>
                          setSettings(prev => ({ ...prev, format }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original">Original</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Zona de drop */}
          <div
            ref={dropZoneRef}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
              isDragging 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragging ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Máximo {maxFiles} archivos • {maxFileSize}MB por archivo
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos: {allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
                </p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              className="hidden"
            />
          </div>
          
          {/* Lista de archivos */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Archivos seleccionados</h3>
                <div className="flex gap-2">
                  {settings.enabled && stats.pending > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const validPendingFiles = files.filter(f => 
                          f.status === 'pending' && 
                          f instanceof File && 
                          f.type.startsWith('image/')
                        );
                        if (validPendingFiles.length > 0) {
                          compressFiles(validPendingFiles);
                        }
                      }}
                      className="gap-2"
                    >
                      <Minimize2 className="h-4 w-4" />
                      Comprimir
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFiles}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpiar todo
                  </Button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-white dark:bg-slate-800"
                  >
                    {/* Preview */}
                    <div 
                      className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      <OptimizedImage
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full"
                        aspectRatio={1}
                      />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{formatFileSize(file.metadata?.originalSize || file.size)}</span>
                        {file.metadata?.compressedSize !== file.metadata?.originalSize && (
                          <>
                            <span>→</span>
                            <span className="text-blue-600">
                              {formatFileSize(file.metadata?.compressedSize || file.size)}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {file.metadata?.dimensions.width}×{file.metadata?.dimensions.height}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1 mt-2" />
                      )}
                      
                      {/* Error message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-red-500 mt-1">{file.error}</p>
                      )}
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {file.status === 'pending' && (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                      {file.status === 'uploading' && (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Subiendo
                        </Badge>
                      )}
                      {file.status === 'success' && (
                        <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                          <Check className="h-3 w-3" />
                          Listo
                        </Badge>
                      )}
                      {file.status === 'error' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Error
                        </Badge>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Progress general */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subiendo archivos...</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}
        </CardContent>
        
        {/* Footer con acciones */}
        <div className="flex-shrink-0 border-t p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {stats.total > 0 && (
                <>
                  {stats.total} archivo{stats.total !== 1 ? 's' : ''} • 
                  {formatFileSize(stats.totalCompressedSize)} total
                  {compressionSavings > 0 && (
                    <span className="text-blue-600 ml-1">
                      ({compressionSavings.toFixed(1)}% reducido)
                    </span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={uploadAllFiles}
                disabled={stats.pending === 0 || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Subir {stats.pending} archivo{stats.pending !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Modal de preview */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{previewFile.name}</h3>
                <p className="text-sm text-slate-500">
                  {formatFileSize(previewFile.size)} • 
                  {previewFile.metadata?.dimensions.width}×{previewFile.metadata?.dimensions.height}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={previewFile.preview}
                alt={previewFile.name}
                className="max-w-full max-h-[60vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Diagnóstico de Supabase */}
      {showDiagnostic && (
        <SupabaseDiagnostic
          bucket={bucket}
          onClose={() => setShowDiagnostic(false)}
        />
      )}
    </div>
  );
}