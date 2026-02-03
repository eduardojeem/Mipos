'use client';

import { useState } from 'react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Code,
  Save,
  X,
  Eye,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useEmailTemplates, EmailTemplate } from '../hooks/useEmailTemplates';
import { useDebounce } from 'use-debounce';

const CATEGORIES = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'auth', label: 'Autenticación' },
  { value: 'billing', label: 'Facturación' },
  { value: 'system', label: 'Sistema' },
  { value: 'marketing', label: 'Marketing' },
];

export default function EmailTemplatesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [category, setCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    subject: string;
    html_content: string;
    text_content: string;
    category: 'auth' | 'billing' | 'system' | 'marketing';
    description: string;
    is_active: boolean;
  }>({
    name: '',
    slug: '',
    subject: '',
    html_content: '',
    text_content: '',
    category: 'auth',
    description: '',
    is_active: true,
  });

  const {
    templates,
    total,
    loading,
    error,
    refresh,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreating,
    isUpdating,
    isDeleting,
  } = useEmailTemplates({
    category: category !== 'all' ? category : undefined,
    search: debouncedSearch,
  });

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      slug: template.slug,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      category: template.category,
      description: template.description || '',
      is_active: template.is_active,
    });
    setIsCreateMode(false);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      slug: '',
      subject: '',
      html_content: '',
      text_content: '',
      category: 'auth',
      description: '',
      is_active: true,
    });
    setIsCreateMode(true);
    setIsEditorOpen(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isCreateMode) {
        await createTemplate(formData);
      } else if (selectedTemplate) {
        await updateTemplate({
          id: selectedTemplate.id,
          updates: formData,
        });
      }
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${template.name}"?`)) {
      return;
    }
    
    try {
      await deleteTemplate(template.id);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'auth':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">Autenticación</Badge>;
      case 'billing':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300">Facturación</Badge>;
      case 'system':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300">Sistema</Badge>;
      case 'marketing':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300">Marketing</Badge>;
      default:
        return <Badge variant="outline">{cat}</Badge>;
    }
  };

  if (loading && templates.length === 0) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          <p className="text-slate-500 font-medium">Cargando plantillas de email...</p>
        </div>
      </SuperAdminGuard>
    );
  }

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Error al cargar</h2>
            <p className="text-slate-500 mt-2">{error}</p>
          </div>
          <Button onClick={() => refresh()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-pink-500/50">
                <Mail className="h-7 w-7 text-white" />
              </div>
              Plantillas de Email
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Gestiona los correos transaccionales y notificaciones del sistema
            </p>
          </div>

          <Button onClick={handleCreate} className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>

        {/* Filters */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar plantillas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Mostrando {templates.length} de {total} plantillas
              </p>
              <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">{template.subject}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30">Activo</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Inactivo</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  {getCategoryBadge(template.category)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePreview(template)} className="flex-1 gap-2">
                    <Eye className="h-4 w-4" />
                    Vista Previa
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(template)} 
                    disabled={isDeleting}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <Mail className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {search || category !== 'all' ? 'No se encontraron plantillas' : 'No hay plantillas'}
                  </h3>
                  <p className="text-slate-500 mt-2">
                    {search || category !== 'all' 
                      ? 'Intenta con otros términos de búsqueda' 
                      : 'Crea tu primera plantilla de email'}
                  </p>
                </div>
                {!search && category === 'all' && (
                  <Button onClick={handleCreate} className="gap-2 mt-2">
                    <Plus className="h-4 w-4" />
                    Crear Plantilla
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-purple-600" />
                {isCreateMode ? 'Crear Nueva Plantilla' : `Editar: ${selectedTemplate?.name}`}
              </DialogTitle>
              <DialogDescription>
                Configura el contenido HTML y texto plano de la plantilla
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Plantilla *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Bienvenida a Nueva Organización"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (Identificador) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Ej: welcome-organization"
                    disabled={!isCreateMode}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Asunto del Email *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ej: Bienvenido a MiPOS"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: 'auth' | 'billing' | 'system' | 'marketing') => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_active">Estado</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
                  >
                    <SelectTrigger id="is_active">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción breve de la plantilla"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="html_content">Contenido HTML *</Label>
                <Textarea
                  id="html_content"
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  placeholder="<html>...</html>"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_content">Contenido de Texto Plano</Label>
                <Textarea
                  id="text_content"
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  placeholder="Versión en texto plano del email..."
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isCreating || isUpdating || !formData.name || !formData.slug || !formData.subject || !formData.html_content}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {(isCreating || isUpdating) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isCreateMode ? 'Crear Plantilla' : 'Guardar Cambios'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                Vista Previa: {selectedTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Asunto: {selectedTemplate?.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <iframe
                srcDoc={selectedTemplate?.html_content}
                className="w-full h-[500px] bg-white"
                title="Email Preview"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminGuard>
  );
}
