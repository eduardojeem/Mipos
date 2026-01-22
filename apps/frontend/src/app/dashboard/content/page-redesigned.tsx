'use client';

import { useState, useMemo } from 'react';
import { 
  FileText, 
  Layout, 
  Image, 
  Plus, 
  RefreshCw,
  Settings,
  Download,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Edit,
  Trash2,
  Copy,
  Globe,
  Calendar,
  Tag,
  Zap,
  BarChart3,
  Users,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ContentEditor from './components/ContentEditor';
import { useContent, useDeleteContent, useDuplicateContent } from '@/hooks/useContent';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
interface ContentItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type: 'page' | 'banner' | 'media';
  status: 'published' | 'draft' | 'archived';
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
  author_id?: string;
  views?: number;
  created_at: string;
  updated_at: string;
  author?: string; // This would be joined from users table
}

interface ContentStats {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalBanners: number;
  activeBanners: number;
  totalMedia: number;
  storageUsed: string;
  monthlyViews: number;
  topPerforming: ContentItem[];
}

// Calculate stats from real data
const calculateStats = (content: ContentItem[]): ContentStats => {
  const pages = content.filter(item => item.type === 'page');
  const banners = content.filter(item => item.type === 'banner');
  const media = content.filter(item => item.type === 'media');
  
  return {
    totalPages: pages.length,
    publishedPages: pages.filter(p => p.status === 'published').length,
    draftPages: pages.filter(p => p.status === 'draft').length,
    totalBanners: banners.length,
    activeBanners: banners.filter(b => b.status === 'published').length,
    totalMedia: media.length,
    storageUsed: '2.4 GB', // This would come from storage API
    monthlyViews: content.reduce((sum, item) => sum + (item.views || 0), 0),
    topPerforming: content
      .filter(item => item.views && item.views > 0)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
  };
};

const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Página Principal - 4G Celulares',
    type: 'page',
    status: 'published',
    updated_at: '2025-12-15T10:30:00Z',
    created_at: '2025-12-15T10:30:00Z',
    author: 'Admin',
    views: 2450,
    description: 'Página de inicio con productos destacados',
    tags: ['inicio', 'productos', 'destacados'],
    category: 'Principal'
  },
  {
    id: '2',
    title: 'Banner Promocional - iPhone 15',
    type: 'banner',
    status: 'published',
    updated_at: '2025-12-14T15:20:00Z',
    created_at: '2025-12-14T15:20:00Z',
    author: 'Marketing',
    views: 1820,
    description: 'Promoción especial iPhone 15 Pro',
    tags: ['promocion', 'iphone', 'oferta'],
    category: 'Promociones'
  },
  {
    id: '3',
    title: 'Catálogo de Productos',
    type: 'page',
    status: 'draft',
    updated_at: '2025-12-13T09:15:00Z',
    created_at: '2025-12-13T09:15:00Z',
    author: 'Editor',
    description: 'Página completa del catálogo',
    tags: ['catalogo', 'productos'],
    category: 'Productos'
  }
];

export default function ContentPageRedesigned() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'banners' | 'media'>('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorContentType, setEditorContentType] = useState<'page' | 'banner' | 'media'>('page');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  // Fetch content with filters
  const contentFilters = useMemo(() => ({
    type: activeTab === 'overview' ? undefined : activeTab.slice(0, -1) as 'page' | 'banner' | 'media',
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: searchTerm || undefined
  }), [activeTab, statusFilter, categoryFilter, searchTerm]);

  const { data: contentData = [], isLoading, error } = useContent(contentFilters);
  const deleteContentMutation = useDeleteContent();
  const duplicateContentMutation = useDuplicateContent();

  // Calculate real stats
  const stats = useMemo(() => calculateStats(contentData), [contentData]);

  // Use real content data
  const filteredContent = useMemo(() => {
    if (!contentData) return [];
    
    return contentData.filter(item => {
      const matchesTab = activeTab === 'overview' || item.type === activeTab.slice(0, -1);
      return matchesTab;
    });
  }, [contentData, activeTab]);

  // Get unique categories from real data
  const categories = useMemo(() => {
    if (!contentData) return [];
    const cats = new Set(contentData.map(item => item.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [contentData]);

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredContent.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredContent.map(item => item.id)));
    }
  };

  const handleCreateContent = (type: 'page' | 'banner' | 'media') => {
    setEditorContentType(type);
    setEditingItem(null);
    setIsEditorOpen(true);
  };

  const handleEditContent = (item: ContentItem) => {
    setEditorContentType(item.type);
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  const handleDeleteContent = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este contenido?')) {
      try {
        await deleteContentMutation.mutateAsync(id);
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  const handleDuplicateContent = async (id: string) => {
    try {
      await duplicateContentMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error duplicating content:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <FileText className="h-6 w-6" />
            </div>
            Gestión de Contenido Web
          </h1>
          <p className="text-muted-foreground text-lg">
            Administra el contenido de tu sitio web de forma intuitiva y eficiente
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button onClick={() => handleCreateContent('page')}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Contenido
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Páginas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalPages}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.publishedPages} publicadas
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Banners Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.activeBanners}</div>
                <p className="text-xs text-muted-foreground">
                  de {stats.totalBanners} totales
                </p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Layout className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Archivos Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalMedia}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.storageUsed} usados
                </p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Image className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vistas del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.monthlyViews.toLocaleString()}</div>
                <p className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% vs mes anterior
                </p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Eye className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contenido por título, descripción o tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Páginas</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Banners</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
          </TabsList>

          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedItems.size} seleccionado{selectedItems.size !== 1 ? 's' : ''}
              </Badge>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>
                  Últimas modificaciones en el contenido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : contentData.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className={cn(
                          "p-2 rounded-lg",
                          item.type === 'page' && "bg-blue-100 dark:bg-blue-900/20",
                          item.type === 'banner' && "bg-green-100 dark:bg-green-900/20",
                          item.type === 'media' && "bg-purple-100 dark:bg-purple-900/20"
                        )}>
                          {item.type === 'page' && <FileText className="h-4 w-4 text-blue-600" />}
                          {item.type === 'banner' && <Layout className="h-4 w-4 text-green-600" />}
                          {item.type === 'media' && <Image className="h-4 w-4 text-purple-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.author} • {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Acciones Rápidas
                </CardTitle>
                <CardDescription>
                  Tareas comunes de gestión de contenido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleCreateContent('page')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nueva Página
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleCreateContent('banner')}
                >
                  <Layout className="h-4 w-4 mr-2" />
                  Diseñar Banner Promocional
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleCreateContent('media')}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Subir Imágenes al Catálogo
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  Actualizar Página Principal
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Estadísticas Detalladas
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Grid/List */}
        <TabsContent value="pages" className="space-y-4">
          <ContentGrid 
            items={filteredContent.filter(item => item.type === 'page')} 
            viewMode={viewMode}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onEditItem={handleEditContent}
            onDeleteItem={handleDeleteContent}
            onDuplicateItem={handleDuplicateContent}
          />
        </TabsContent>

        <TabsContent value="banners" className="space-y-4">
          <ContentGrid 
            items={filteredContent.filter(item => item.type === 'banner')} 
            viewMode={viewMode}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onEditItem={handleEditContent}
            onDeleteItem={handleDeleteContent}
            onDuplicateItem={handleDuplicateContent}
          />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <ContentGrid 
            items={filteredContent.filter(item => item.type === 'media')} 
            viewMode={viewMode}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onEditItem={handleEditContent}
            onDeleteItem={handleDeleteContent}
            onDuplicateItem={handleDuplicateContent}
          />
        </TabsContent>
      </Tabs>

      {/* Content Editor Modal */}
      <ContentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        contentType={editorContentType}
        initialData={editingItem ? {
          id: editingItem.id,
          title: editingItem.title,
          description: editingItem.description,
          status: editingItem.status,
          tags: editingItem.tags,
          category: editingItem.category
        } : undefined}
      />
    </div>
  );
}

// Content Grid Component
interface ContentGridProps {
  items: ContentItem[];
  viewMode: 'grid' | 'list';
  selectedItems: Set<string>;
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  onEditItem: (item: ContentItem) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
}

function ContentGrid({ items, viewMode, selectedItems, onSelectItem, onSelectAll, onEditItem, onDeleteItem, onDuplicateItem }: ContentGridProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ContentCard 
                item={item} 
                isSelected={selectedItems.has(item.id)}
                onSelect={() => onSelectItem(item.id)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
                onDuplicate={() => onDuplicateItem(item.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item) => (
            <ContentListItem 
              key={item.id}
              item={item} 
              isSelected={selectedItems.has(item.id)}
              onSelect={() => onSelectItem(item.id)}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item.id)}
              onDuplicate={() => onDuplicateItem(item.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Content Card Component
interface ContentCardProps {
  item: ContentItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function ContentCard({ item, isSelected, onSelect, onEdit, onDelete, onDuplicate }: ContentCardProps) {
  return (
    <Card className={cn(
      "cursor-pointer transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-blue-500"
    )} onClick={onSelect}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className={cn(
              "p-2 rounded-lg",
              item.type === 'page' && "bg-blue-100 dark:bg-blue-900/20",
              item.type === 'banner' && "bg-green-100 dark:bg-green-900/20",
              item.type === 'media' && "bg-purple-100 dark:bg-purple-900/20"
            )}>
              {item.type === 'page' && <FileText className="h-4 w-4 text-blue-600" />}
              {item.type === 'banner' && <Layout className="h-4 w-4 text-green-600" />}
              {item.type === 'media' && <Image className="h-4 w-4 text-purple-600" />}
            </div>
            <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
              {item.status}
            </Badge>
          </div>

          {/* Content */}
          <div>
            <h3 className="font-semibold truncate">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{item.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.author}</span>
            <div className="flex items-center gap-2">
              {item.views && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {item.views}
                </div>
              )}
              <span>{format(new Date(item.updated_at), 'dd/MM/yyyy')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-1 pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Vista previa
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Content List Item Component
interface ContentListItemProps {
  item: ContentItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function ContentListItem({ item, isSelected, onSelect, onEdit, onDelete, onDuplicate }: ContentListItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer",
      isSelected && "bg-blue-50 dark:bg-blue-900/20"
    )} onClick={onSelect}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onSelect}
        className="rounded"
      />
      
      <div className={cn(
        "p-2 rounded-lg",
        item.type === 'page' && "bg-blue-100 dark:bg-blue-900/20",
        item.type === 'banner' && "bg-green-100 dark:bg-green-900/20",
        item.type === 'media' && "bg-purple-100 dark:bg-purple-900/20"
      )}>
        {item.type === 'page' && <FileText className="h-4 w-4 text-blue-600" />}
        {item.type === 'banner' && <Layout className="h-4 w-4 text-green-600" />}
        {item.type === 'media' && <Image className="h-4 w-4 text-purple-600" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{item.title}</h3>
          <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
            {item.status}
          </Badge>
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {item.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{item.author}</span>
        {item.views && (
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {item.views}
          </div>
        )}
        <span>{format(new Date(item.updated_at), 'dd/MM/yyyy')}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}