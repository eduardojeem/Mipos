'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Grid3X3, 
  Search, 
  Filter, 
  Upload, 
  Trash2, 
  Plus, 
  Copy, 
  Eye, 
  Download,
  Calendar,
  FileImage,
  FolderOpen,
  RefreshCw,
  X,
  Check,
  Loader2,
  SortAsc,
  SortDesc,
  Image as ImageIcon,
  Info,
  ExternalLink
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { OptimizedImage } from './OptimizedImage';
import { ImageUploader } from './ImageUploader';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StorageImage {
  name: string;
  url: string;
  created_at: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    mimetype?: string;
  };
}

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  onSelectMultiple?: (imageUrls: string[]) => void;
  multiSelect?: boolean;
  selectedImages?: string[];
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
type ViewMode = 'grid' | 'list';

export function ImageGallery({ 
  isOpen, 
  onClose, 
  onSelectImage, 
  onSelectMultiple,
  multiSelect = false,
  selectedImages = []
}: ImageGalleryProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set(selectedImages));

  const [deleting, setDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<StorageImage | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  const supabase = createClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_CAROUSEL || 'carousel';

  // Cargar imágenes usando la API
  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🖼️ Cargando imágenes del bucket carousel...');
      
      const response = await fetch('/api/storage/carousel/list');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      console.log(`✅ ${result.images.length} imágenes cargadas del bucket`);
      
      const imageList: StorageImage[] = result.images.map((img: any) => ({
        name: img.name,
        url: img.url,
        created_at: img.created_at || new Date().toISOString(),
        size: img.size || 0,
        metadata: {
          width: img.metadata?.width,
          height: img.metadata?.height,
          mimetype: img.metadata?.mimetype
        }
      }));

      setImages(imageList);
      
      if (imageList.length === 0) {
        toast({
          title: "Galería vacía",
          description: "No hay imágenes en la galería. Sube algunas imágenes para comenzar.",
        });
      }
      
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Error al cargar imágenes",
        description: "No se pudieron cargar las imágenes de la galería. Verifica tu conexión.",
        variant: "destructive"
      });
      setImages([]); // Limpiar imágenes en caso de error
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Filtrar y ordenar imágenes
  const filteredAndSortedImages = useMemo(() => {
    let filtered = images;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = images.filter(img => 
        img.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });

    return filtered;
  }, [images, searchTerm, sortBy]);

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Manejar selección de imagen
  const handleImageSelect = (image: StorageImage) => {
    if (multiSelect) {
      const newSelected = new Set(selectedImageIds);
      if (newSelected.has(image.url)) {
        newSelected.delete(image.url);
      } else {
        newSelected.add(image.url);
      }
      setSelectedImageIds(newSelected);
      onSelectMultiple?.(Array.from(newSelected));
    } else {
      onSelectImage(image.url);
      onClose();
    }
  };

  // Manejar subida completada desde ImageUploader
  const handleUploadComplete = (urls: string[]) => {
    toast({
      title: "Imágenes subidas",
      description: `${urls.length} imagen${urls.length !== 1 ? 'es' : ''} subida${urls.length !== 1 ? 's' : ''} correctamente.`,
    });
    loadImages(); // Recargar la galería
    setShowUploader(false); // Cerrar el uploader
  };

  // Eliminar imágenes seleccionadas
  const handleDeleteSelected = async () => {
    if (selectedImageIds.size === 0) return;

    const selectedCount = selectedImageIds.size;
    const confirmed = confirm(
      `¿Eliminar ${selectedCount} imagen(es) permanentemente?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeleting(true);
    
    try {
      // Obtener nombres de archivos de las URLs seleccionadas
      const fileNames = Array.from(selectedImageIds)
        .map(imageUrl => images.find(img => img.url === imageUrl)?.name)
        .filter(Boolean) as string[];

      if (fileNames.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron archivos válidos para eliminar.",
          variant: "destructive"
        });
        return;
      }

      console.log(`🗑️ Eliminando ${fileNames.length} imagen(es)...`);

      // Llamar a la API de eliminación
      const response = await fetch('/api/storage/carousel/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileNames })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar archivos');
      }

      console.log(`✅ ${result.deleted} imagen(es) eliminada(s) exitosamente`);

      // Limpiar selección y recargar galería
      setSelectedImageIds(new Set());
      
      toast({
        title: "Imágenes eliminadas",
        description: `${result.deleted} imagen(es) eliminada(s) correctamente.`,
      });

      // Recargar la galería
      loadImages();

    } catch (error) {
      console.error('Error eliminando imágenes:', error);
      toast({
        title: "Error al eliminar",
        description: "No se pudieron eliminar las imágenes seleccionadas.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  // Eliminar imagen individual
  const handleDeleteSingle = async (image: StorageImage) => {
    const confirmed = confirm(
      `¿Eliminar "${image.name}" permanentemente?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      console.log(`🗑️ Eliminando imagen individual: ${image.name}`);

      const response = await fetch('/api/storage/carousel/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: image.name })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar archivo');
      }

      console.log(`✅ Imagen eliminada exitosamente: ${image.name}`);

      toast({
        title: "Imagen eliminada",
        description: `"${image.name}" eliminada correctamente.`,
      });

      // Recargar la galería
      loadImages();

    } catch (error) {
      console.error('Error eliminando imagen:', error);
      toast({
        title: "Error al eliminar",
        description: `No se pudo eliminar "${image.name}".`,
        variant: "destructive"
      });
    }
  };

  // Copiar URL al portapapeles
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copiada",
      description: "La URL de la imagen se ha copiado al portapapeles.",
    });
  };

  // Descargar imagen
  const downloadImage = async (image: StorageImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = image.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Descarga iniciada",
        description: "La imagen se está descargando.",
      });
    } catch (error) {
      toast({
        title: "Error de descarga",
        description: "No se pudo descargar la imagen.",
        variant: "destructive"
      });
    }
  };

  // Cargar imágenes al abrir
  useEffect(() => {
    if (isOpen) {
      console.log('🖼️ Galería abierta, cargando imágenes...');
      loadImages();
    }
  }, [isOpen, loadImages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Galería de Imágenes</CardTitle>
                <p className="text-sm text-slate-500">
                  {filteredAndSortedImages.length} de {images.length} imágenes
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedImageIds.size > 0 && (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    {selectedImageIds.size} seleccionada{selectedImageIds.size !== 1 ? 's' : ''}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className="gap-2"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Eliminar
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadImages}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Actualizar
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
          
          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar imágenes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Ordenar */}
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Más recientes</SelectItem>
                <SelectItem value="date-asc">Más antiguos</SelectItem>
                <SelectItem value="name-asc">Nombre A-Z</SelectItem>
                <SelectItem value="name-desc">Nombre Z-A</SelectItem>
                <SelectItem value="size-desc">Tamaño mayor</SelectItem>
                <SelectItem value="size-asc">Tamaño menor</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Vista */}
            <div className="flex rounded-lg border overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Subir Avanzado */}
            <Button
              onClick={() => setShowUploader(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Upload className="h-4 w-4" />
              Subir Avanzado
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-violet-500" />
                <p className="text-slate-600">Cargando imágenes...</p>
              </div>
            </div>
          ) : filteredAndSortedImages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ImageIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-600">
                  {searchTerm ? 'No se encontraron imágenes' : 'No hay imágenes'}
                </p>
                <p className="text-slate-500 mb-6">
                  {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Sube imágenes para comenzar'}
                </p>
                {!searchTerm && (
                  <Button 
                    className="gap-2" 
                    onClick={() => setShowUploader(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Subir Primera Imagen
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredAndSortedImages.map((image) => (
                    <div
                      key={image.name}
                      className={cn(
                        "relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer aspect-square",
                        selectedImageIds.has(image.url)
                          ? "border-violet-500 ring-2 ring-violet-500/30"
                          : "border-transparent hover:border-slate-300"
                      )}
                      onClick={() => handleImageSelect(image)}
                    >
                      <OptimizedImage
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full"
                        aspectRatio={1}
                      />
                      
                      {/* Checkbox para selección múltiple */}
                      {multiSelect && (
                        <div className="absolute top-2 left-2">
                          <Checkbox
                            checked={selectedImageIds.has(image.url)}
                            onChange={() => handleImageSelect(image)}
                            className="bg-white/80 border-slate-300"
                          />
                        </div>
                      )}
                      
                      {/* Overlay con acciones */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectImage(image.url);
                            if (!multiSelect) onClose();
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(image.url);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(image);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingle(image);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Info básica */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">
                          {image.name}
                        </p>
                        <p className="text-white/70 text-xs">
                          {formatFileSize(image.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedImages.map((image) => (
                    <div
                      key={image.name}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer hover:bg-slate-50",
                        selectedImageIds.has(image.url)
                          ? "border-violet-500 bg-violet-50"
                          : "border-slate-200"
                      )}
                      onClick={() => handleImageSelect(image)}
                    >
                      {multiSelect && (
                        <Checkbox
                          checked={selectedImageIds.has(image.url)}
                          onChange={() => handleImageSelect(image)}
                        />
                      )}
                      
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <OptimizedImage
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full"
                          aspectRatio={1}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{image.name}</p>
                        <p className="text-sm text-slate-500">
                          {formatFileSize(image.size)} • {format(new Date(image.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectImage(image.url);
                            if (!multiSelect) onClose();
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(image.url);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(image);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingle(image);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        {/* Footer con acciones */}
        {multiSelect && selectedImageIds.size > 0 && (
          <div className="flex-shrink-0 border-t p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {selectedImageIds.size} imagen{selectedImageIds.size !== 1 ? 'es' : ''} seleccionada{selectedImageIds.size !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedImageIds(new Set())}
                >
                  Limpiar selección
                </Button>
                <Button
                  onClick={() => {
                    onSelectMultiple?.(Array.from(selectedImageIds));
                    onClose();
                  }}
                >
                  Usar seleccionadas
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Modal de preview */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{previewImage.name}</h3>
                <p className="text-sm text-slate-500">
                  {formatFileSize(previewImage.size)} • {format(new Date(previewImage.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(previewImage.url)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(previewImage)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[60vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Advanced Image Uploader */}
      <ImageUploader
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
        onUploadComplete={handleUploadComplete}
        maxFiles={20}
        maxFileSize={10}
        autoCompress={true}
      />
    </div>
  );
}