'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  Search, 
  Filter,
  X,
  Hash,
  Users,
  Palette,
  Settings,
  Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { SupplierTag } from '@/types/suppliers';
import { TagCard } from '@/components/suppliers/TagCard';
import { TagForm } from '@/components/suppliers/TagForm';
import { SupplierTagsList } from '@/components/suppliers/SupplierTagsList';
import { TagsStats } from '@/components/suppliers/TagsStats';
import { useSupplierTags } from '@/hooks/use-supplier-tags';

// Enhanced Types
interface TaggedSupplier {
  id: string;
  name: string;
  email: string;
  tags: SupplierTag[];
  category: string;
  status: string;
}

interface TagFormData {
  name: string;
  color: string;
  description: string;
  category: 'performance' | 'location' | 'product' | 'relationship' | 'custom';
}

interface TagsState {
  tags: SupplierTag[];
  suppliers: TaggedSupplier[];
  loading: boolean;
  error: string | null;
}

// Constants
const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
] as const;

const TAG_CATEGORIES = [
  { value: 'performance', label: 'Rendimiento', icon: '�' },
  { value: 'location', label: 'Ubicación', icon: '📍' },
  { value: 'product', label: 'Producto', icon: '📦' },
  { value: 'relationship', label: 'Relación', icon: '🤝' },
  { value: 'custom', label: 'Personalizado', icon: '🏷️' }
] as const;

// Performance optimization: Debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function SupplierTagsPage() {
  const { user } = useAuth();
  const { 
    tags, 
    suppliers, 
    loading, 
    error, 
    loadData, 
    createTag, 
    updateTag, 
    deleteTag, 
    assignTags, 
    removeTagFromSupplier 
  } = useSupplierTags();
  
  // Local state with debounced search for better performance
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<SupplierTag | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: TAG_COLORS[0],
    description: '',
    category: 'custom'
  });
  
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case 'n':
            event.preventDefault();
            setShowCreateDialog(true);
            break;
        }
      }
      
      if (event.key === 'Escape') {
        setShowCreateDialog(false);
        setShowEditDialog(false);
        setShowDeleteDialog(false);
        setShowAssignDialog(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Optimized handlers using the custom hook
  const handleCreateTag = useCallback(async () => {
    const success = await createTag(formData);
    if (success) {
      setShowCreateDialog(false);
      resetForm();
    }
  }, [createTag, formData]);

  const handleEditTag = useCallback(async () => {
    if (!selectedTag) return;
    
    const success = await updateTag(selectedTag.id, formData);
    if (success) {
      setShowEditDialog(false);
      setSelectedTag(null);
      resetForm();
    }
  }, [updateTag, selectedTag, formData]);

  const handleDeleteTag = useCallback(async () => {
    if (!selectedTag) return;
    
    const success = await deleteTag(selectedTag.id);
    if (success) {
      setShowDeleteDialog(false);
      setSelectedTag(null);
    }
  }, [deleteTag, selectedTag]);

  const handleAssignTags = useCallback(async () => {
    if (!selectedTag || selectedSuppliers.length === 0) return;

    const success = await assignTags(selectedSuppliers, selectedTag.id);
    if (success) {
      setShowAssignDialog(false);
      setSelectedSuppliers([]);
      setSelectedTag(null);
    }
  }, [assignTags, selectedTag, selectedSuppliers]);

  const handleRemoveTagFromSupplier = useCallback(async (supplierId: string, tagId: string) => {
    await removeTagFromSupplier(supplierId, tagId);
  }, [removeTagFromSupplier]);

  // Utility functions
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      color: TAG_COLORS[0],
      description: '',
      category: 'custom'
    });
  }, []);

  const openEditDialog = useCallback((tag: SupplierTag) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
      category: tag.category
    });
    setShowEditDialog(true);
  }, []);

  const openDeleteDialog = useCallback((tag: SupplierTag) => {
    setSelectedTag(tag);
    setShowDeleteDialog(true);
  }, []);

  const openAssignDialog = useCallback((tag: SupplierTag) => {
    setSelectedTag(tag);
    setShowAssignDialog(true);
  }, []);

  // Memoized filtered data for performance with debounced search
  const filteredTags = useMemo(() => {
    return tags.filter(tag => {
      const matchesSearch = tag.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           tag.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tags, debouncedSearchQuery, selectedCategory]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      supplier.tags.some(tag => tag.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    );
  }, [suppliers, debouncedSearchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando etiquetas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Etiquetas</h1>
          <p className="text-muted-foreground">
            Gestiona etiquetas personalizables para organizar y categorizar proveedores
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Etiqueta
        </Button>
      </div>

      {/* Stats */}
      <TagsStats tags={tags} totalSuppliers={suppliers.length} />

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar etiquetas o proveedores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {TAG_CATEGORIES.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.icon} {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tags" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tags">Etiquetas ({tags.length})</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores Etiquetados ({suppliers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-4">
          {/* Tags Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onAssign={openAssignDialog}
                categoryLabel={TAG_CATEGORIES.find(cat => cat.value === tag.category)?.label || 'Personalizado'}
              />
            ))}
          </div>

          {filteredTags.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay etiquetas</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery ? 'No se encontraron etiquetas que coincidan con tu búsqueda.' : 'Crea tu primera etiqueta para organizar tus proveedores.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Etiqueta
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <SupplierTagsList 
            suppliers={filteredSuppliers}
            onRemoveTag={handleRemoveTagFromSupplier}
          />
        </TabsContent>
      </Tabs>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent aria-labelledby="create-tag-title">
          <DialogHeader>
            <DialogTitle id="create-tag-title">Crear Nueva Etiqueta</DialogTitle>
            <DialogDescription>
              Crea una etiqueta personalizada para organizar tus proveedores
            </DialogDescription>
          </DialogHeader>
          <TagForm 
            formData={formData}
            onChange={setFormData}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTag} disabled={!formData.name.trim()}>
              Crear Etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent aria-labelledby="edit-tag-title">
          <DialogHeader>
            <DialogTitle id="edit-tag-title">Editar Etiqueta</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la etiqueta
            </DialogDescription>
          </DialogHeader>
          <TagForm 
            formData={formData}
            onChange={setFormData}
            isEdit={true}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTag} disabled={!formData.name.trim()}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent aria-labelledby="delete-tag-title">
          <DialogHeader>
            <DialogTitle id="delete-tag-title">Eliminar Etiqueta</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la etiqueta &quot;{selectedTag?.name}&quot;?
              Esta acción no se puede deshacer y se removerá de todos los proveedores.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTag}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Tag Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl" aria-labelledby="assign-tag-title">
          <DialogHeader>
            <DialogTitle id="assign-tag-title">Asignar Etiqueta: {selectedTag?.name}</DialogTitle>
            <DialogDescription>
              Selecciona los proveedores a los que deseas asignar esta etiqueta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`supplier-${supplier.id}`}
                  checked={selectedSuppliers.includes(supplier.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSuppliers([...selectedSuppliers, supplier.id]);
                    } else {
                      setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id));
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor={`supplier-${supplier.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-sm text-muted-foreground">{supplier.email}</div>
                </label>
                <div className="flex flex-wrap gap-1">
                  {supplier.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignTags} 
              disabled={selectedSuppliers.length === 0}
            >
              Asignar a {selectedSuppliers.length} proveedores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}