'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Tag, Eye, EyeOff, Filter, Package, ArrowUpDown, ArrowUp, ArrowDown, Grid, List, MoreHorizontal, CheckSquare, Square, X, SlidersHorizontal, Download, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, getErrorMessage } from '@/lib/api';
import type { Category } from '@/types';
import { StatsCards } from './components/StatsCards';
import { CategoryCard } from './components/CategoryCard';

// Lazy load heavy components (optional - not used in optimized version)
// const AdvancedFiltersPanel = lazy(() => import('./components/AdvancedFiltersPanel').catch(() => ({ default: () => null })));
// const ImportExportModal = lazy(() => import('./components/ImportExportModal').catch(() => ({ default: () => null })));

interface CategoryWithCount extends Category {
  _count?: {
    products: number;
  };
}

type SortField = 'name' | 'created_at' | 'products' | 'is_active';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'cards' | 'table';

interface AdvancedFilters {
  dateRange: { from: string; to: string };
  productCountRange: { min: number; max: number };
  hasProducts: 'all' | 'with_products' | 'without_products';
}

export default function CategoriesPageOptimized() {
  const { toast } = useToast();
  
  // Core state
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);
  
  // Advanced features (lazy loaded)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateRange: { from: '', to: '' },
    productCountRange: { min: 0, max: 100 },
    hasProducts: 'all'
  });
  const [maxProductCount, setMaxProductCount] = useState(100);
  
  // Bulk actions
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);
  
  // Load categories - optimized
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/public');
      const cats = response.data.categories || [];
      
      setCategories(cats);
      
      // Calculate max product count
      const maxCount = Math.max(...cats.map((c: CategoryWithCount) => c._count?.products || 0), 100);
      setMaxProductCount(maxCount);
      setAdvancedFilters(prev => ({
        ...prev,
        productCountRange: { min: 0, max: maxCount }
      }));
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  
  // Memoized filtered and sorted categories
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && category.is_active) ||
        (statusFilter === 'inactive' && !category.is_active);
      
      // Advanced filters
      const { dateRange, productCountRange, hasProducts } = advancedFilters;
      
      let matchesDateRange = true;
      if (dateRange.from || dateRange.to) {
        const categoryDate = new Date(category.created_at);
        if (dateRange.from) matchesDateRange = matchesDateRange && categoryDate >= new Date(dateRange.from);
        if (dateRange.to) matchesDateRange = matchesDateRange && categoryDate <= new Date(dateRange.to + 'T23:59:59');
      }
      
      const productCount = category._count?.products || 0;
      const matchesProductCount = productCount >= productCountRange.min && productCount <= productCountRange.max;
      
      let matchesHasProducts = true;
      if (hasProducts === 'with_products') matchesHasProducts = productCount > 0;
      else if (hasProducts === 'without_products') matchesHasProducts = productCount === 0;
      
      return matchesSearch && matchesStatus && matchesDateRange && matchesProductCount && matchesHasProducts;
    });
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'products':
          aValue = a._count?.products || 0;
          bValue = b._count?.products || 0;
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [categories, searchQuery, statusFilter, sortField, sortDirection, advancedFilters]);
  
  // Memoized paginated categories
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedCategories, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredAndSortedCategories.length / itemsPerPage);
  
  // Handlers
  const handleOpenModal = useCallback((category?: CategoryWithCount) => {
    setShowModal(true);
    setEditingCategory(category || null);
    setFormData({
      name: category?.name || '',
      description: category?.description || '',
      is_active: category?.is_active ?? true
    });
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', is_active: true });
  }, []);
  
  const validateCategoryName = useCallback((name: string, excludeId?: string): boolean => {
    const trimmedName = name.trim().toLowerCase();
    return !categories.some(cat => cat.id !== excludeId && cat.name.toLowerCase() === trimmedName);
  }, [categories]);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'El nombre de la categoría es requerido', variant: 'destructive' });
      return;
    }
    
    if (!validateCategoryName(formData.name, editingCategory?.id)) {
      toast({ title: 'Error', description: 'Ya existe una categoría con este nombre', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
        toast({ title: 'Éxito', description: 'Categoría actualizada correctamente' });
      } else {
        await api.post('/categories', formData);
        toast({ title: 'Éxito', description: 'Categoría creada correctamente' });
      }
      
      handleCloseModal();
      loadCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({ title: 'Error', description: getErrorMessage(error) || 'No se pudo guardar la categoría', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingCategory, validateCategoryName, handleCloseModal, loadCategories, toast]);
  
  const handleToggleStatus = useCallback(async (categoryId: string, currentStatus: boolean) => {
    try {
      await api.put(`/categories/${categoryId}`, { is_active: !currentStatus });
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, is_active: !currentStatus } : c));
      toast({ title: 'Éxito', description: `Categoría ${!currentStatus ? 'activada' : 'desactivada'} correctamente` });
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast({ title: 'Error', description: getErrorMessage(error) || 'No se pudo cambiar el estado', variant: 'destructive' });
    }
  }, [toast]);
  
  const handleDelete = useCallback(async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const productCount = category?._count?.products || 0;
    
    if (productCount > 0) {
      toast({ title: 'No se puede eliminar', description: `Esta categoría tiene ${productCount} productos asociados`, variant: 'destructive' });
      return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return;
    
    try {
      await api.delete(`/categories/${categoryId}`);
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      toast({ title: 'Éxito', description: 'Categoría eliminada correctamente' });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({ title: 'Error', description: getErrorMessage(error) || 'No se pudo eliminar la categoría', variant: 'destructive' });
    }
  }, [categories, toast]);
  
  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection(prev => sortField === field && prev === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  }, [sortField]);
  
  const handleSelectCategory = useCallback((categoryId: string, selected: boolean) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (selected) newSet.add(categoryId);
      else newSet.delete(categoryId);
      return newSet;
    });
  }, []);
  
  const handleSelectAll = useCallback((selected: boolean, filtered: CategoryWithCount[]) => {
    setSelectedCategories(selected ? new Set(filtered.map(c => c.id)) : new Set());
  }, []);
  
  const handleBulkAction = useCallback(async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedCategories.size === 0) return;
    
    const selectedArray = Array.from(selectedCategories);
    
    if (action === 'delete') {
      const categoriesWithProducts = selectedArray.filter(id => {
        const category = categories.find(c => c.id === id);
        return (category?._count?.products || 0) > 0;
      });
      
      if (categoriesWithProducts.length > 0) {
        toast({ title: 'No se puede eliminar', description: `${categoriesWithProducts.length} categoría(s) tiene(n) productos asociados`, variant: 'destructive' });
        return;
      }
      
      if (!confirm(`¿Eliminar ${selectedArray.length} categoría(s)?`)) return;
    }
    
    setBulkActionLoading(true);
    
    try {
      const promises = selectedArray.map(categoryId => {
        if (action === 'delete') return api.delete(`/categories/${categoryId}`);
        return api.put(`/categories/${categoryId}`, { is_active: action === 'activate' });
      });
      
      await Promise.all(promises);
      
      if (action === 'delete') {
        setCategories(prev => prev.filter(c => !selectedArray.includes(c.id)));
      } else {
        setCategories(prev => prev.map(c => selectedArray.includes(c.id) ? { ...c, is_active: action === 'activate' } : c));
      }
      
      setSelectedCategories(new Set());
      toast({ title: 'Éxito', description: `${selectedArray.length} categoría(s) procesada(s) correctamente` });
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({ title: 'Error', description: getErrorMessage(error) || 'No se pudo completar la acción', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedCategories, categories, toast]);
  
  const SortButton = useCallback(({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" onClick={() => handleSort(field)} className="h-8 px-2 lg:px-3">
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  ), [sortField, sortDirection, handleSort]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground">Gestiona las categorías de productos</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>
      
      {/* Stats */}
      <StatsCards categories={categories} />
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}>
                {viewMode === 'cards' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bulk Actions */}
      {selectedCategories.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedCategories.size} seleccionada(s)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('activate')} disabled={bulkActionLoading}>
                  <Eye className="h-4 w-4 mr-2" />
                  Activar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('deactivate')} disabled={bulkActionLoading}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Desactivar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')} disabled={bulkActionLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Categories List */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategories.has(category.id)}
              onSelect={(selected) => handleSelectCategory(category.id, selected)}
              onEdit={() => handleOpenModal(category)}
              onDelete={() => handleDelete(category.id)}
              onToggleStatus={() => handleToggleStatus(category.id, category.is_active)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCategories.size === filteredAndSortedCategories.length && filteredAndSortedCategories.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean, filteredAndSortedCategories)}
                  />
                </TableHead>
                <TableHead><SortButton field="name">Nombre</SortButton></TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead><SortButton field="products">Productos</SortButton></TableHead>
                <TableHead><SortButton field="is_active">Estado</SortButton></TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCategories.map(category => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={(checked) => handleSelectCategory(category.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{category._count?.products || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={category.is_active} onCheckedChange={() => handleToggleStatus(category.id, category.is_active)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(category)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(category.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedCategories.length)} de {filteredAndSortedCategories.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
      
      {/* Edit/Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modifica los datos de la categoría' : 'Crea una nueva categoría de productos'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Maquillaje"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Categoría activa</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
