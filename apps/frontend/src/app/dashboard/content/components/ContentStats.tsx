'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Layout, 
  Image, 
  Eye, 
  MousePointer, 
  HardDrive,
  TrendingUp,
  Clock
} from 'lucide-react';
import { ContentStats as ContentStatsType } from '../hooks/useContent';

interface ContentStatsProps {
  stats: ContentStatsType | null;
  isLoading: boolean;
}

export function ContentStats({ stats, isLoading }: ContentStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Páginas Totales</p>
                <p className="text-2xl font-bold">{stats.totalPages}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="default" className="text-xs">
                    {stats.publishedPages} publicadas
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {stats.draftPages} borradores
                  </Badge>
                </div>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Banners</p>
                <p className="text-2xl font-bold">{stats.totalBanners}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="default" className="text-xs">
                    {stats.activeBanners} activos
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {stats.totalBanners - stats.activeBanners} inactivos
                  </Badge>
                </div>
              </div>
              <Layout className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Archivos Media</p>
                <p className="text-2xl font-bold">{stats.totalMedia}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(stats.mediaSize)} total
                </p>
              </div>
              <Image className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vistas Totales</p>
                <p className="text-2xl font-bold">{formatNumber(stats.pageViews)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(stats.bannerClicks)} clics en banners
                </p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Páginas Más Visitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topPages.map((page, index) => (
                <div key={page.slug} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{page.title}</p>
                      <p className="text-xs text-muted-foreground">/{page.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatNumber(page.views)}</p>
                    <p className="text-xs text-muted-foreground">vistas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {activity.type === 'page_created' && <FileText className="h-4 w-4" />}
                    {activity.type === 'banner_updated' && <Layout className="h-4 w-4" />}
                    {activity.type === 'media_uploaded' && <Image className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.type === 'page_created' && 'Página creada'}
                        {activity.type === 'banner_updated' && 'Banner actualizado'}
                        {activity.type === 'media_uploaded' && 'Media subido'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        por {activity.author}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}