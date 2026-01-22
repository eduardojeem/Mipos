'use client';

import { useState } from 'react';
import { 
  FileText, 
  Layout, 
  Image, 
  Plus, 
  RefreshCw,
  Settings,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';

// Components
import { 
  ContentStats,
  PagesTable,
  BannersTable,
  MediaGallery,
  ContentFilters,
  PageEditor,
  BannerEditor,
  MediaUploader
} from './components';

// Hooks
import { useContent, useContentFilters } from './hooks';
import type { WebPage, Banner, MediaFile } from './hooks/useContent';

export default function ContentPage() {
  return (
    <PermissionProvider>
      <ContentPageContent />
    </PermissionProvider>
  );
}

function ContentPageContent() {
  const [activeTab, setActiveTab] = useState<'pages' | 'banners' | 'media'>('pages');
  const [isPageEditorOpen, setIsPageEditorOpen] = useState(false);
  const [isBannerEditorOpen, setIsBannerEditorOpen] = useState(false);
  const [isMediaUploaderOpen, setIsMediaUploaderOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WebPage | Banner | MediaFile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Custom hooks
  const filters = useContentFilters();
  const { 
    pages, 
    banners, 
    media, 
    stats,
    isLoading,
    refreshContent,
    deletePage,
    deleteBanner,
    deleteMedia,
    isDeletingPage,
    isDeletingBanner,
    isDeletingMedia
  } = useContent(filters.filters);

  // Handler functions
  const handleEditPage = (page: WebPage) => {
    setSelectedItem(page);
    setIsEditMode(true);
    setIsPageEditorOpen(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setSelectedItem(banner);
    setIsEditMode(true);
    setIsBannerEditorOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedItem(null);
    setIsEditMode(false);
    
    if (activeTab === 'pages') {
      setIsPageEditorOpen(true);
    } else if (activeTab === 'banners') {
      setIsBannerEditorOpen(true);
    } else if (activeTab === 'media') {
      setIsMediaUploaderOpen(true);
    }
  };

  const handleDuplicatePage = (page: WebPage) => {
    setSelectedItem({
      ...page,
      title: `${page.title} (Copia)`,
      slug: `${page.slug}-copia`,
      isPublished: false
    });
    setIsEditMode(false);
    setIsPageEditorOpen(true);
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            Gestión de Contenido
          </h1>
          <p className="text-muted-foreground">
            Administra páginas web, banners promocionales y archivos multimedia
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshContent}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <PermissionGuard permission="content.export">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </PermissionGuard>
          
          <PermissionGuard permission="content.configure">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats */}
      <ContentStats stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <ContentFilters
        filters={filters.filters}
        onUpdateFilter={filters.updateFilter}
        onResetFilters={filters.resetFilters}
        hasActiveFilters={filters.hasActiveFilters}
        filterCount={filters.filterCount}
        activeTab={activeTab}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pages' | 'banners' | 'media')} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pages" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Páginas ({pages.length})</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex items-center space-x-2">
              <Layout className="h-4 w-4" />
              <span>Banners ({banners.length})</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center space-x-2">
              <Image className="h-4 w-4" />
              <span>Media ({media.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <PermissionGuard permission="content.create">
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'pages' && 'Nueva Página'}
              {activeTab === 'banners' && 'Nuevo Banner'}
              {activeTab === 'media' && 'Subir Archivo'}
            </Button>
          </PermissionGuard>
        </div>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <PagesTable
            pages={pages}
            isLoading={isLoading}
            onEdit={handleEditPage}
            onDelete={deletePage}
            onDuplicate={handleDuplicatePage}
            isDeletingPage={isDeletingPage}
          />
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <BannersTable
            banners={banners}
            isLoading={isLoading}
            onEdit={handleEditBanner}
            onDelete={deleteBanner}
            isDeletingBanner={isDeletingBanner}
          />
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          <MediaGallery
            media={media}
            isLoading={isLoading}
            onDelete={deleteMedia}
            isDeletingMedia={isDeletingMedia}
          />
        </TabsContent>
      </Tabs>

      {/* Editors and Modals */}
      <PageEditor
        open={isPageEditorOpen}
        onOpenChange={setIsPageEditorOpen}
        page={selectedItem && 'slug' in selectedItem ? (selectedItem as WebPage) : null}
        isEditMode={isEditMode}
      />
      
      <BannerEditor
        open={isBannerEditorOpen}
        onOpenChange={setIsBannerEditorOpen}
        banner={selectedItem && 'position' in selectedItem ? (selectedItem as Banner) : null}
        isEditMode={isEditMode}
      />
      
      <MediaUploader
        open={isMediaUploaderOpen}
        onOpenChange={setIsMediaUploaderOpen}
      />
    </div>
  );
}
