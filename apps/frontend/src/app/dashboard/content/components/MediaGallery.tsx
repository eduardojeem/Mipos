'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  Copy, 
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Folder,
  Calendar,
  HardDrive
} from 'lucide-react';
import { MediaFile } from '../hooks/useContent';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';

interface MediaGalleryProps {
  media: MediaFile[];
  isLoading: boolean;
  onDelete: (mediaId: string) => void;
  isDeletingMedia: boolean;
}

export function MediaGallery({ 
  media, 
  isLoading, 
  onDelete,
  isDeletingMedia 
}: MediaGalleryProps) {
  const { toast } = useToast();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (mimeType.startsWith('video/')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (mimeType.startsWith('audio/')) return 'bg-green-50 text-green-700 border-green-200';
    if (mimeType.includes('pdf')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getFolderColor = (folder: string) => {
    switch (folder) {
      case 'banners': return 'bg-orange-50 text-orange-700';
      case 'productos': return 'bg-green-50 text-green-700';
      case 'newsletter': return 'bg-blue-50 text-blue-700';
      case 'documentos': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No se encontraron archivos
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Comienza subiendo tu primer archivo multimedia
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {media.map((file) => (
        <Card key={file.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* File Preview */}
            <div className="relative aspect-video mb-3 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
              {file.mimeType.startsWith('image/') ? (
                <img
                  src={file.thumbnailUrl || file.url}
                  alt={file.alt || file.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getFileIcon(file.mimeType)}
                </div>
              )}
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    try {
                      window.open(file.url, '_blank')
                    } catch (e: any) {
                      toast({ title: 'No se pudo abrir el archivo', description: String(e), variant: 'destructive' })
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    try {
                      const a = document.createElement('a');
                      a.href = file.url;
                      a.download = file.originalName;
                      a.click();
                    } catch (e: any) {
                      toast({ title: 'No se pudo descargar', description: String(e), variant: 'destructive' })
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              {/* File type badge */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className={`text-xs ${getFileTypeColor(file.mimeType)}`}>
                  {file.mimeType.split('/')[0]}
                </Badge>
              </div>
              
              {/* Actions menu */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      try {
                        window.open(file.url, '_blank')
                      } catch (e: any) {
                        toast({ title: 'No se pudo abrir el archivo', description: String(e), variant: 'destructive' })
                      }
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver archivo
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => {
                        try {
                          const a = document.createElement('a');
                          a.href = file.url;
                          a.download = file.originalName;
                          a.click();
                        } catch (e: any) {
                          toast({ title: 'No se pudo descargar', description: String(e), variant: 'destructive' })
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(file.url)
                        toast({ title: 'Copiado', description: 'URL copiada al portapapeles' })
                      } catch {
                        toast({ title: 'Error al copiar', description: 'Permiso denegado o error del navegador', variant: 'destructive' })
                      }
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar URL
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <PermissionGuard permission="content.delete">
                      <DropdownMenuItem 
                        onClick={() => onDelete(file.id)}
                        className="text-red-600"
                        disabled={isDeletingMedia}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* File Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-sm truncate flex-1" title={file.originalName}>
                  {file.originalName}
                </h4>
              </div>
              
              {file.caption && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {file.caption}
                </p>
              )}
              
              {/* File details */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatFileSize(file.size)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
              
              {/* Folder and tags */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Folder className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className={`text-xs ${getFolderColor(file.folder)}`}>
                    {file.folder}
                  </Badge>
                </div>
                
                {file.downloadCount > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Download className="h-3 w-3" />
                    <span>{file.downloadCount}</span>
                  </div>
                )}
              </div>
              
              {/* Tags */}
              {file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {file.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                  {file.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      +{file.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
