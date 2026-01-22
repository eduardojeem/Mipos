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
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink,
  Calendar,
  MousePointer,
  Eye,
  Layout as LayoutIcon
} from 'lucide-react';
import { Banner } from '../hooks/useContent';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';

interface BannersTableProps {
  banners: Banner[];
  isLoading: boolean;
  onEdit: (banner: Banner) => void;
  onDelete: (bannerId: string) => void;
  isDeletingBanner: boolean;
}

export function BannersTable({ 
  banners, 
  isLoading, 
  onEdit, 
  onDelete,
  isDeletingBanner 
}: BannersTableProps) {
  const { toast } = useToast();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'HERO': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SIDEBAR': return 'bg-green-50 text-green-700 border-green-200';
      case 'FOOTER': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'POPUP': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0%';
    return ((clicks / impressions) * 100).toFixed(1) + '%';
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex space-x-4">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LayoutIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No se encontraron banners
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Comienza creando tu primer banner promocional
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {banners.map((banner) => (
        <Card key={banner.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex space-x-4 flex-1">
                {/* Banner Image */}
                <div className="relative">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-24 h-16 object-cover rounded border"
                      loading="lazy"
                      width={96}
                      height={64}
                    />
                  ) : (
                    <div className="w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                      <LayoutIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute -top-2 -right-2">
                    <Badge variant={banner.isActive ? 'default' : 'secondary'} className="text-xs">
                      {banner.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                
                {/* Banner Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold truncate">{banner.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {banner.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Banner Details */}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <Badge variant="outline" className={`text-xs ${getPositionColor(banner.position)}`}>
                      {banner.position}
                    </Badge>
                    
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Orden: {banner.order}</span>
                    </div>
                    
                    {banner.linkUrl && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-32">{banner.linkUrl}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="flex items-center space-x-4 mt-3 text-sm">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{formatNumber(banner.impressionCount)}</span>
                      <span className="text-muted-foreground">vistas</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <MousePointer className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{formatNumber(banner.clickCount)}</span>
                      <span className="text-muted-foreground">clics</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">CTR:</span>
                      <span className="font-medium">{getCTR(banner.clickCount, banner.impressionCount)}</span>
                    </div>
                  </div>
                  
                  {/* Dates and Targeting */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Creado: {formatDate(banner.createdAt)}</span>
                    </div>
                    
                    {banner.startDate && (
                      <div className="flex items-center space-x-1">
                        <span>Inicio: {formatDate(banner.startDate)}</span>
                      </div>
                    )}
                    
                    {banner.endDate && (
                      <div className="flex items-center space-x-1">
                        <span>Fin: {formatDate(banner.endDate)}</span>
                      </div>
                    )}
                    
                    {banner.targetAudience.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span>Audiencia: {banner.targetAudience.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {banner.linkUrl && (
                    <DropdownMenuItem 
                      onClick={() => {
                        try {
                          window.open(banner.linkUrl!, '_blank')
                        } catch (e: any) {
                          toast({ title: 'No se pudo abrir el enlace', description: String(e), variant: 'destructive' })
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir enlace
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      try {
                        window.open(banner.imageUrl, '_blank')
                      } catch (e: any) {
                        toast({ title: 'No se pudo abrir la imagen', description: String(e), variant: 'destructive' })
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver imagen
                  </DropdownMenuItem>
                  
                  <PermissionGuard permission="content.edit">
                    <DropdownMenuItem onClick={() => onEdit(banner)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  </PermissionGuard>
                  
                  <DropdownMenuItem 
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(banner.imageUrl)
                        toast({ title: 'Copiado', description: 'URL de imagen copiada al portapapeles' })
                      } catch (e: any) {
                        toast({ title: 'Error al copiar', description: 'Permiso denegado o error del navegador', variant: 'destructive' })
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar URL imagen
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <PermissionGuard permission="content.delete">
                    <DropdownMenuItem 
                      onClick={() => onDelete(banner.id)}
                      className="text-red-600"
                      disabled={isDeletingBanner}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </PermissionGuard>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
