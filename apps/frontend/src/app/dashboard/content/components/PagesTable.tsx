'use client';

import { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Globe,
  Calendar,
  User,
  BarChart3,
  FileText,
  Tag
} from 'lucide-react';
import { WebPage } from '../hooks/useContent';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';

interface PagesTableProps {
  pages: WebPage[];
  isLoading: boolean;
  onEdit: (page: WebPage) => void;
  onDelete: (pageId: string) => void;
  onDuplicate?: (page: WebPage) => void;
  isDeletingPage: boolean;
}

export function PagesTable({ 
  pages, 
  isLoading, 
  onEdit, 
  onDelete, 
  onDuplicate,
  isDeletingPage 
}: PagesTableProps) {
  const { toast } = useToast();
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const handleSelectPage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map(page => page.id)));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pages.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No se encontraron páginas
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Comienza creando tu primera página web
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedPages.size === pages.length && pages.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Página</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>SEO</TableHead>
                <TableHead>Vistas</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} className="hover:bg-muted/50">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedPages.has(page.id)}
                      onChange={() => handleSelectPage(page.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{page.title}</h4>
                        {page.version > 1 && (
                          <Badge variant="outline" className="text-xs">
                            v{page.version}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <span>/{page.slug}</span>
                      </div>
                      {page.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {page.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {page.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                +{page.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                        {page.isPublished ? 'Publicada' : 'Borrador'}
                      </Badge>
                      {page.isPublished && page.publishedAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatDate(page.publishedAt)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">{page.category}</Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getSEOScoreColor(page.seoScore)}`}>
                        {page.seoScore}%
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatNumber(page.viewCount)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{page.authorName}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(page.updatedAt)}</span>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            try {
                              window.open(`/pages/${page.slug}`, '_blank')
                            } catch (e: any) {
                              toast({ title: 'No se pudo abrir la página', description: String(e), variant: 'destructive' })
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver página
                        </DropdownMenuItem>
                        
                        <PermissionGuard permission="content.edit">
                          <DropdownMenuItem onClick={() => onEdit(page)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </PermissionGuard>
                        
                        {onDuplicate && (
                          <PermissionGuard permission="content.create">
                            <DropdownMenuItem onClick={() => onDuplicate(page)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                          </PermissionGuard>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`${window.location.origin}/pages/${page.slug}`)
                              toast({ title: 'Copiado', description: 'URL copiada al portapapeles' })
                            } catch {
                              toast({ title: 'Error al copiar', description: 'Permiso denegado o error del navegador', variant: 'destructive' })
                            }
                          }}
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Copiar URL
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <PermissionGuard permission="content.delete">
                          <DropdownMenuItem 
                            onClick={() => onDelete(page.id)}
                            className="text-red-600"
                            disabled={isDeletingPage}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Bulk Actions */}
        {selectedPages.size > 0 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedPages.size} página{selectedPages.size !== 1 ? 's' : ''} seleccionada{selectedPages.size !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                <PermissionGuard permission="content.edit">
                  <Button variant="outline" size="sm">
                    Publicar seleccionadas
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="content.delete">
                  <Button variant="outline" size="sm" className="text-red-600">
                    Eliminar seleccionadas
                  </Button>
                </PermissionGuard>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
