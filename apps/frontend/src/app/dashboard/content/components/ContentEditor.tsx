'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  Eye, 
  Code, 
  Image, 
  Type, 
  Layout, 
  Settings,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateContent, useUpdateContent } from '@/hooks/useContent';

interface ContentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'page' | 'banner' | 'media';
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    content?: string;
    status?: 'published' | 'draft' | 'archived';
    tags?: string[];
    category?: string;
  };
}

export default function ContentEditor({ 
  isOpen, 
  onClose, 
  contentType, 
  initialData 
}: ContentEditorProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'preview'>('content');
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    content: initialData?.content || '',
    type: contentType,
    status: initialData?.status || 'draft' as const,
    tags: initialData?.tags || [],
    category: initialData?.category || ''
  });
  const [newTag, setNewTag] = useState('');
  
  const createContentMutation = useCreateContent();
  const updateContentMutation = useUpdateContent();
  
  const isLoading = createContentMutation.isPending || updateContentMutation.isPending;

  const handleSave = useCallback(async () => {
    try {
      if (initialData?.id) {
        // Update existing content
        await updateContentMutation.mutateAsync({
          id: initialData.id,
          ...formData
        });
      } else {
        // Create new content
        await createContentMutation.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  }, [formData, initialData?.id, createContentMutation, updateContentMutation, onClose]);

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contentType === 'page' && <Type className="h-5 w-5" />}
            {contentType === 'banner' && <Layout className="h-5 w-5" />}
            {contentType === 'media' && <Image className="h-5 w-5" />}
            {initialData?.id ? 'Editar' : 'Crear'} {
              contentType === 'page' ? 'Página' :
              contentType === 'banner' ? 'Banner' : 'Media'
            }
          </DialogTitle>
          <DialogDescription>
            {contentType === 'page' && 'Crea o edita una página web con contenido personalizado'}
            {contentType === 'banner' && 'Diseña un banner promocional para tu sitio'}
            {contentType === 'media' && 'Sube y gestiona archivos multimedia'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Contenido
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Vista Previa
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Título</label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ingresa el título del contenido"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Descripción</label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Breve descripción del contenido"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium">Contenido</label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={
                      contentType === 'page' ? 'Escribe el contenido de la página...' :
                      contentType === 'banner' ? 'Texto del banner promocional...' :
                      'Descripción del archivo multimedia...'
                    }
                    rows={12}
                    className="font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium">Estado</label>
                    <Select value={formData.status} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, status: value as any }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                        <SelectItem value="archived">Archivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium">Categoría</label>
                    <Select value={formData.category} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Principal">Principal</SelectItem>
                        <SelectItem value="Productos">Productos</SelectItem>
                        <SelectItem value="Promociones">Promociones</SelectItem>
                        <SelectItem value="Noticias">Noticias</SelectItem>
                        <SelectItem value="Soporte">Soporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Agregar tag"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vista Previa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{formData.title || 'Título del contenido'}</h2>
                      <p className="text-muted-foreground mt-1">
                        {formData.description || 'Descripción del contenido'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant={formData.status === 'published' ? 'default' : 'secondary'}>
                        {formData.status}
                      </Badge>
                      {formData.category && (
                        <Badge variant="outline">{formData.category}</Badge>
                      )}
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="prose max-w-none">
                        {formData.content ? (
                          <div className="whitespace-pre-wrap">{formData.content}</div>
                        ) : (
                          <p className="text-muted-foreground italic">
                            El contenido aparecerá aquí...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
            >
              Guardar Borrador
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Publicar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}