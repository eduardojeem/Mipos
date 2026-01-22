'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Tag, Eye, EyeOff, Filter, Package, ArrowUpDown, ArrowUp, ArrowDown, Grid, List, MoreHorizontal, CheckSquare, Square, Calendar, X, SlidersHorizontal, Download, Upload, FileText, AlertCircle } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { api, getErrorMessage } from '@/lib/api';
import * as XLSX from 'xlsx';
import type { Category } from '@/types';
import { StatsCards } from './components/StatsCards';
import { CategoryCard } from './components/CategoryCard';

interface CategoryWithCount extends Category {
  _count?: {
    products: number;
  };
}

type SortField = 'name' | 'created_at' | 'products' | 'is_active';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'cards' | 'table';

interface AdvancedFilters {
  dateRange: {
    from: string;
    to: string;
  };
  productCountRange: {
    min: number;
    max: number;
  };
  hasProducts: 'all' | 'with_products' | 'without_products';
}

interface CategoriesPageState {
  categories: CategoryWithCount[];
  loading: boolean;
  searchQuery: string;
  searchInput: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  selectedCategories: Set<string>;
  currentPage: number;
  itemsPerPage: number;
  showModal: boolean;
  editingCategory: CategoryWithCount | null;
  formData: {
    name: string;
    description: string;
    is_active: boolean;
  };
  submitting: boolean;
  bulkActionLoading: boolean;
  advancedFilters: AdvancedFilters;
  showAdvancedFilters: boolean;
  maxProductCount: number;
  // Import/Export states
  showImportModal: boolean;
  importFile: File | null;
  importProgress: number;
  importResults: {
    total: number;
    success: number;
    errors: string[];
  } | null;
  exporting: boolean;
  // Reassign & delete flow
  showReassignModal: boolean;
  reassignSourceId: string | null;
  reassignTargetId: string | null;
  reassignProductCount: number;
  reassignTargetCount: number;
  reassignLoading: boolean;
  categoryCounts: Record<string, number>;
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<CategoriesPageState>({
    categories: [],
    loading: true,
    searchQuery: '',
    searchInput: '',
    statusFilter: 'all',
    sortField: 'name',
    sortDirection: 'asc',
    viewMode: 'cards',
    selectedCategories: new Set(),
    currentPage: 1,
    itemsPerPage: 12,
    showModal: false,
    editingCategory: null,
    formData: {
      name: '',
      description: '',
      is_active: true
    },
    submitting: false,
    bulkActionLoading: false,
    advancedFilters: {
      dateRange: {
        from: '',
        to: ''
      },
      productCountRange: {
        min: 0,
        max: 100
      },
      hasProducts: 'all'
    },
    showAdvancedFilters: false,
    maxProductCount: 100,
    // Import/Export states
    showImportModal: false,
    importFile: null,
    importProgress: 0,
    importResults: null,
    exporting: false,
    // Reassign & delete flow
    showReassignModal: false,
    reassignSourceId: null,
    reassignTargetId: null,
    reassignProductCount: 0,
    reassignTargetCount: 0,
    reassignLoading: false,
    categoryCounts: {}
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setState(prev => ({ ...prev, searchQuery: prev.searchInput, currentPage: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [state.searchInput]);

  const loadCategories = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await api.get('/categories/public');
      const categories = response.data.categories || [];

      // Calculate max product count for slider
      const maxCount = Math.max(...categories.map((c: CategoryWithCount) => c._count?.products || 0), 100);

      setState(prev => ({
        ...prev,
        categories,
        loading: false,
        maxProductCount: maxCount,
        advancedFilters: {
          ...prev.advancedFilters,
          productCountRange: {
            min: 0,
            max: maxCount
          }
        }
      }));
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive'
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenModal = (category?: CategoryWithCount) => {
    setState(prev => ({
      ...prev,
      showModal: true,
      editingCategory: category || null,
      formData: {
        name: category?.name || '',
        description: category?.description || '',
        is_active: category?.is_active ?? true
      }
    }));
  };

  const handleCloseModal = () => {
    setState(prev => ({
      ...prev,
      showModal: false,
      editingCategory: null,
      formData: {
        name: '',
        description: '',
        is_active: true
      }
    }));
  };

  const validateCategoryName = (name: string, excludeId?: string): boolean => {
    const trimmedName = name.trim().toLowerCase();
    return !state.categories.some(cat =>
      cat.id !== excludeId && cat.name.toLowerCase() === trimmedName
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la categoría es requerido',
        variant: 'destructive'
      });
      return;
    }

    if (!validateCategoryName(state.formData.name, state.editingCategory?.id)) {
      toast({
        title: 'Error',
        description: 'Ya existe una categoría con este nombre',
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({ ...prev, submitting: true }));

    try {
      if (state.editingCategory) {
        await api.put(`/categories/${state.editingCategory.id}`, state.formData);
        toast({
          title: 'Éxito',
          description: 'Categoría actualizada correctamente'
        });
      } else {
        await api.post('/categories', state.formData);
        toast({
          title: 'Éxito',
          description: 'Categoría creada correctamente'
        });
      }

      handleCloseModal();
      loadCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      const errorMessage = getErrorMessage(error) || 'No se pudo guardar la categoría';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      await api.put(`/categories/${categoryId}`, { is_active: !currentStatus });
      setState(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === categoryId ? { ...c, is_active: !currentStatus } : c
        )
      }));
      toast({
        title: 'Éxito',
        description: `Categoría ${!currentStatus ? 'activada' : 'desactivada'} correctamente`
      });
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'No se pudo cambiar el estado de la categoría',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (categoryId: string) => {
    const category = state.categories.find(c => c.id === categoryId);
    const productCount = category?._count?.products || 0;

    if (productCount > 0) {
      const firstTarget = state.categories.find(c => c.id !== categoryId)?.id || null;
      setState(prev => ({
        ...prev,
        showReassignModal: true,
        reassignSourceId: categoryId,
        reassignTargetId: firstTarget,
        reassignProductCount: productCount,
      }));
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);
      setState(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== categoryId)
      }));
      toast({
        title: 'Éxito',
        description: 'Categoría eliminada correctamente'
      });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      const errorMessage = getErrorMessage(error) || 'No se pudo eliminar la categoría';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleSort = (field: SortField) => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
      currentPage: 1
    }));
  };

  const handleSelectCategory = (categoryId: string, selected: boolean) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedCategories);
      if (selected) {
        newSelected.add(categoryId);
      } else {
        newSelected.delete(categoryId);
      }
      return { ...prev, selectedCategories: newSelected };
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedCategories: selected ? new Set(filteredAndSortedCategories.map(c => c.id)) : new Set()
    }));
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (state.selectedCategories.size === 0) return;

    const selectedCategoriesArray = Array.from(state.selectedCategories);

    if (action === 'delete') {
      const categoriesWithProducts = selectedCategoriesArray.filter(id => {
        const category = state.categories.find(c => c.id === id);
        return (category?._count?.products || 0) > 0;
      });

      if (categoriesWithProducts.length > 0) {
        if (selectedCategoriesArray.length === 1) {
          const id = selectedCategoriesArray[0];
          const cat = state.categories.find(c => c.id === id);
          const count = cat?._count?.products || 0;
          const firstTarget = state.categories.find(c => c.id !== id)?.id || null;
          setState(prev => ({
            ...prev,
            showReassignModal: true,
            reassignSourceId: id,
            reassignTargetId: firstTarget,
            reassignProductCount: count,
          }));
        } else {
          toast({
            title: 'No se puede eliminar',
            description: `${categoriesWithProducts.length} categoría${categoriesWithProducts.length > 1 ? 's' : ''} tiene${categoriesWithProducts.length === 1 ? '' : 'n'} productos asociados. Reasigna productos y elimina una por una.`,
            variant: 'destructive'
          });
        }
        return;
      }

      if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedCategoriesArray.length} categoría${selectedCategoriesArray.length > 1 ? 's' : ''}?`)) {
        return;
      }
    }

    setState(prev => ({ ...prev, bulkActionLoading: true }));

    try {
      const promises = selectedCategoriesArray.map(async (categoryId) => {
        if (action === 'delete') {
          return api.delete(`/categories/${categoryId}`);
        } else {
          return api.put(`/categories/${categoryId}`, {
            is_active: action === 'activate'
          });
        }
      });

      await Promise.all(promises);

      if (action === 'delete') {
        setState(prev => ({
          ...prev,
          categories: prev.categories.filter(c => !selectedCategoriesArray.includes(c.id)),
          selectedCategories: new Set()
        }));
      } else {
        setState(prev => ({
          ...prev,
          categories: prev.categories.map(c =>
            selectedCategoriesArray.includes(c.id)
              ? { ...c, is_active: action === 'activate' }
              : c
          ),
          selectedCategories: new Set()
        }));
      }

      toast({
        title: 'Éxito',
        description: `${selectedCategoriesArray.length} categoría${selectedCategoriesArray.length > 1 ? 's' : ''} ${action === 'delete' ? 'eliminada' + (selectedCategoriesArray.length > 1 ? 's' : '') :
          action === 'activate' ? 'activada' + (selectedCategoriesArray.length > 1 ? 's' : '') :
            'desactivada' + (selectedCategoriesArray.length > 1 ? 's' : '')
          } correctamente`
      });
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'No se pudo completar la acción en lote',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, bulkActionLoading: false }));
    }
  };

  const handleCloseReassignModal = () => {
    setState(prev => ({
      ...prev,
      showReassignModal: false,
      reassignSourceId: null,
      reassignTargetId: null,
      reassignProductCount: 0,
      reassignTargetCount: 0,
      reassignLoading: false,
    }));
  };

  const handleConfirmReassignAndDelete = async () => {
    if (!state.reassignSourceId || !state.reassignTargetId) {
      toast({
        title: 'Error',
        description: 'Selecciona una categoría destino para reasignar los productos',
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({ ...prev, reassignLoading: true }));

    try {
      await api.put('/products', {
        updates: { category_id: state.reassignTargetId },
        filters: { category: state.reassignSourceId }
      });

      await api.delete(`/categories/${state.reassignSourceId}`);

      setState(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== state.reassignSourceId),
        selectedCategories: new Set(Array.from(prev.selectedCategories).filter(id => id !== state.reassignSourceId)),
      }));

      toast({
        title: 'Éxito',
        description: `Productos reasignados y categoría eliminada correctamente`,
      });

      handleCloseReassignModal();
    } catch (error) {
      console.error('Error reassigning products and deleting category:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'No se pudo completar la reasignación/eliminación',
        variant: 'destructive'
      });
      setState(prev => ({ ...prev, reassignLoading: false }));
    }
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (state.showReassignModal && state.reassignSourceId) {
          const resp = await api.get(`/categories/${state.reassignSourceId}`)
          const count = resp?.data?.data?._count?.products ?? 0
          setState(prev => ({ ...prev, reassignProductCount: count }))
        }
        if (state.showReassignModal && state.reassignTargetId) {
          const resp = await api.get(`/categories/${state.reassignTargetId}`)
          const count = resp?.data?.data?._count?.products ?? 0
          setState(prev => ({ ...prev, reassignTargetCount: count }))
        }
      } catch (error) {
        /* noop */
      }
    }
    fetchCounts()
  }, [state.showReassignModal, state.reassignSourceId, state.reassignTargetId])

  useEffect(() => {
    if (!state.showReassignModal) return;
    const baseline: Record<string, number> = {};
    state.categories.forEach(c => { baseline[c.id] = c._count?.products || 0 });
    const fetchAllCounts = async () => {
      try {
        const results = await Promise.all(state.categories.map(async c => {
          try {
            const resp = await api.get(`/categories/${c.id}`);
            const count = resp?.data?.data?._count?.products ?? baseline[c.id];
            return { id: c.id, count };
          } catch {
            return { id: c.id, count: baseline[c.id] };
          }
        }));
        const map: Record<string, number> = {};
        results.forEach(r => { map[r.id] = r.count });
        setState(prev => ({ ...prev, categoryCounts: map }));
      } catch {
        setState(prev => ({ ...prev, categoryCounts: baseline }));
      }
    };
    fetchAllCounts();
  }, [state.showReassignModal, state.categories])

  const clearAdvancedFilters = () => {
    setState(prev => ({
      ...prev,
      advancedFilters: {
        dateRange: { from: '', to: '' },
        productCountRange: { min: 0, max: prev.maxProductCount },
        hasProducts: 'all'
      },
      currentPage: 1
    }));
  };

  const hasActiveAdvancedFilters = () => {
    const { dateRange, productCountRange, hasProducts } = state.advancedFilters;
    return dateRange.from || dateRange.to ||
      productCountRange.min > 0 || productCountRange.max < state.maxProductCount ||
      hasProducts !== 'all';
  };

  // Export functionality
  const handleExportCSV = () => {
    setState(prev => ({ ...prev, exporting: true }));

    try {
      const csvData = filteredAndSortedCategories.map(category => ({
        'Nombre': category.name,
        'Descripción': category.description || '',
        'Estado': category.is_active ? 'Activa' : 'Inactiva',
        'Productos': category._count?.products || 0,
        'Fecha de Creación': new Date(category.created_at).toLocaleDateString('es-ES'),
        'Fecha de Actualización': new Date(category.updated_at).toLocaleDateString('es-ES')
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `categorias_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Éxito',
        description: `Se exportaron ${csvData.length} categorías correctamente`
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Error',
        description: 'No se pudo exportar el archivo CSV',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, exporting: false }));
    }
  };

  const handleExportTemplate = () => {
    const templateData = [
      {
        'Nombre': 'Ejemplo Categoría',
        'Descripción': 'Descripción de ejemplo',
        'Estado': 'Activa'
      }
    ];

    const headers = Object.keys(templateData[0]);
    const csvContent = [
      headers.join(','),
      ...templateData.map(row =>
        headers.map(header => row[header as keyof typeof row]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_categorias.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Éxito',
      description: 'Plantilla descargada correctamente'
    });
  };

  // Import functionality
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona un archivo CSV válido',
          variant: 'destructive'
        });
        return;
      }
      setState(prev => ({ ...prev, importFile: file, importResults: null }));
    }
  };

  const parseCSVFile = async (file: File): Promise<any[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows as any[];
  };

  const getField = (row: any, keys: string[]): string => {
    for (const key of keys) {
      const v = row[key];
      if (v !== undefined && String(v).trim() !== '') return String(v);
    }
    return '';
  };

  const handleImportCSV = async () => {
    if (!state.importFile) return;

    setState(prev => ({ ...prev, importProgress: 0, importResults: null }));

    try {
      const importData = await parseCSVFile(state.importFile);

      if (importData.length === 0) {
        toast({
          title: 'Error',
          description: 'El archivo CSV está vacío o no tiene el formato correcto',
          variant: 'destructive'
        });
        return;
      }

      const results = {
        total: importData.length,
        success: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        setState(prev => ({ ...prev, importProgress: ((i + 1) / importData.length) * 100 }));

        try {
          // Validate required fields
          const nombre = getField(row, ['Nombre', 'nombre', 'Name']);
          const descripcion = getField(row, ['Descripción', 'descripcion', 'Description']);
          const estado = getField(row, ['Estado', 'estado', 'Status']);

          if (!nombre || !nombre.trim()) {
            results.errors.push(`Fila ${i + 2}: El nombre es requerido`);
            continue;
          }

          // Check for duplicates in existing categories
          const existingCategory = state.categories.find(c =>
            c.name.toLowerCase() === nombre.trim().toLowerCase()
          );

          if (existingCategory) {
            results.errors.push(`Fila ${i + 2}: Ya existe una categoría con el nombre "${nombre}"`);
            continue;
          }

          // Prepare category data
          const categoryData = {
            name: nombre.trim(),
            description: descripcion?.trim() || '',
            is_active: String(estado || '').toLowerCase() === 'activa' || String(estado || '').toLowerCase() === 'active' || String(estado || '') === '1'
          };

          // Create category
          await api.post('/categories', categoryData);
          results.success++;

        } catch (error: any) {
          console.error(`Error importing row ${i + 2}:`, error);
          results.errors.push(`Fila ${i + 2}: ${getErrorMessage(error) || 'Error al crear la categoría'}`);
        }
      }

      setState(prev => ({
        ...prev,
        importResults: results,
        importProgress: 100
      }));

      if (results.success > 0) {
        loadCategories(); // Reload categories
        toast({
          title: 'Importación completada',
          description: `Se importaron ${results.success} de ${results.total} categorías correctamente`
        });
      }

    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'No se pudo procesar el archivo CSV',
        variant: 'destructive'
      });
    }
  };

  const handleCloseImportModal = () => {
    setState(prev => ({
      ...prev,
      showImportModal: false,
      importFile: null,
      importProgress: 0,
      importResults: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = state.categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(state.searchQuery.toLowerCase());

      const matchesStatus = state.statusFilter === 'all' ||
        (state.statusFilter === 'active' && category.is_active) ||
        (state.statusFilter === 'inactive' && !category.is_active);

      // Advanced filters
      const { dateRange, productCountRange, hasProducts } = state.advancedFilters;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.from || dateRange.to) {
        const categoryDate = new Date(category.created_at);
        if (dateRange.from) {
          matchesDateRange = matchesDateRange && categoryDate >= new Date(dateRange.from);
        }
        if (dateRange.to) {
          matchesDateRange = matchesDateRange && categoryDate <= new Date(dateRange.to + 'T23:59:59');
        }
      }

      // Product count range filter
      const productCount = category._count?.products || 0;
      const matchesProductCount = productCount >= productCountRange.min && productCount <= productCountRange.max;

      // Has products filter
      let matchesHasProducts = true;
      if (hasProducts === 'with_products') {
        matchesHasProducts = productCount > 0;
      } else if (hasProducts === 'without_products') {
        matchesHasProducts = productCount === 0;
      }

      return matchesSearch && matchesStatus && matchesDateRange && matchesProductCount && matchesHasProducts;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (state.sortField) {
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

      if (aValue < bValue) return state.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [state.categories, state.searchQuery, state.statusFilter, state.sortField, state.sortDirection, state.advancedFilters]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    return filteredAndSortedCategories.slice(startIndex, startIndex + state.itemsPerPage);
  }, [filteredAndSortedCategories, state.currentPage, state.itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedCategories.length / state.itemsPerPage);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 lg:px-3"
    >
      {children}
      {state.sortField === field ? (
        state.sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );

  if (state.loading) {
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Categorías de Productos
          </h1>
          <p className="text-muted-foreground">Organiza y gestiona las categorías de tu inventario</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export/Import Buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={state.exporting}>
                <Download className="h-4 w-4 mr-2" />
                {state.exporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => setState(prev => ({ ...prev, showImportModal: true }))}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>

          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <StatsCards categories={state.categories} />

      {/* Import Modal */}
      <Dialog open={state.showImportModal} onOpenChange={handleCloseImportModal}>
        <DialogContent className="sm:max-w-md" aria-labelledby="category-import-title">
          <DialogHeader>
            <DialogTitle id="category-import-title">Importar Categorías</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV para importar categorías en lote.
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-sm"
                onClick={handleExportTemplate}
              >
                Descargar plantilla de ejemplo
              </Button>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Archivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="mt-1"
              />
              {state.importFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Archivo seleccionado: {state.importFile.name}
                </p>
              )}
            </div>

            {state.importProgress > 0 && state.importProgress < 100 && (
              <div className="space-y-2">
                <Label>Progreso de importación</Label>
                <Progress value={state.importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(state.importProgress)}% completado
                </p>
              </div>
            )}

            {state.importResults && (
              <div className="space-y-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Resultados de la importación:</strong>
                    <br />
                    • Total de filas: {state.importResults.total}
                    <br />
                    • Importadas exitosamente: {state.importResults.success}
                    <br />
                    • Errores: {state.importResults.errors.length}
                  </AlertDescription>
                </Alert>

                {state.importResults.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    <Label className="text-sm font-medium text-destructive">Errores encontrados:</Label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {state.importResults.errors.map((error, index) => (
                        <li key={index} className="text-destructive">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Formato requerido:</strong> El archivo CSV debe tener las columnas:
                "Nombre", "Descripción", "Estado" (Activa/Inactiva)
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImportModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={!state.importFile || state.importProgress > 0}
            >
              {state.importProgress > 0 ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign & Delete Modal */}
      <Dialog open={state.showReassignModal} onOpenChange={(open) => !open && handleCloseReassignModal()}>
        <DialogContent className="sm:max-w-md" aria-labelledby="reassign-delete-title">
          <DialogHeader>
            <DialogTitle id="reassign-delete-title">
              {(() => {
                const src = state.categories.find(c => c.id === state.reassignSourceId)
                const sName = src?.name || 'Categoría origen'
                return `Reasignar productos de "${sName}" y eliminar`
              })()}
            </DialogTitle>
            <DialogDescription>
              {state.reassignProductCount > 0
                ? `La categoría seleccionada tiene ${state.reassignProductCount} producto${state.reassignProductCount > 1 ? 's' : ''}. Selecciona la categoría destino para moverlos y luego eliminar.`
                : 'Selecciona la categoría destino para eliminar.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="target-category">Categoría destino</Label>
              <Select
                value={state.reassignTargetId || ''}
                onValueChange={(value) => setState(prev => ({ ...prev, reassignTargetId: value }))}
              >
                <SelectTrigger id="target-category" className="mt-1 w-full">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {state.categories.filter(c => c.id !== state.reassignSourceId).map(c => {
                    const count = state.categoryCounts[c.id] ?? c._count?.products ?? 0
                    return (
                      <SelectItem key={c.id} value={c.id}>{`${c.name} (${count})`}</SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {state.reassignTargetId && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {(() => {
                    const source = state.categories.find(c => c.id === state.reassignSourceId)
                    const target = state.categories.find(c => c.id === state.reassignTargetId)
                    const sName = source?.name || 'Origen'
                    const tName = target?.name || 'Destino'
                    const sCount = state.reassignProductCount || source?._count?.products || 0
                    const tCount = state.reassignTargetCount || target?._count?.products || 0
                    return `Origen: "${sName}" (${sCount} productos) → Destino: "${tName}" (${tCount} productos)`
                  })()}
                  <br />Luego se eliminará la categoría original.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseReassignModal} disabled={state.reassignLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmReassignAndDelete} disabled={!state.reassignTargetId || state.reassignLoading}>
              {state.reassignLoading ? 'Procesando...' : `Reasignar ${state.reassignProductCount} y eliminar`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rest of the existing component remains the same */}
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search and Basic Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
                  value={state.searchInput}
                  onChange={(e) => setState(prev => ({ ...prev, searchInput: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={state.statusFilter}
                  onValueChange={(value: 'all' | 'active' | 'inactive') =>
                    setState(prev => ({ ...prev, statusFilter: value, currentPage: 1 }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced Filters Toggle */}
                <Popover open={state.showAdvancedFilters} onOpenChange={(open) => setState(prev => ({ ...prev, showAdvancedFilters: open }))}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={hasActiveAdvancedFilters() ? "default" : "outline"}
                      size="sm"
                      className="relative"
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filtros
                      {hasActiveAdvancedFilters() && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          !
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filtros Avanzados</h4>
                        {hasActiveAdvancedFilters() && (
                          <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
                            <X className="h-4 w-4 mr-1" />
                            Limpiar
                          </Button>
                        )}
                      </div>

                      {/* Date Range Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Rango de Fechas</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Desde</Label>
                            <Input
                              type="date"
                              value={state.advancedFilters.dateRange.from}
                              onChange={(e) => setState(prev => ({
                                ...prev,
                                advancedFilters: {
                                  ...prev.advancedFilters,
                                  dateRange: { ...prev.advancedFilters.dateRange, from: e.target.value }
                                },
                                currentPage: 1
                              }))}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Hasta</Label>
                            <Input
                              type="date"
                              value={state.advancedFilters.dateRange.to}
                              onChange={(e) => setState(prev => ({
                                ...prev,
                                advancedFilters: {
                                  ...prev.advancedFilters,
                                  dateRange: { ...prev.advancedFilters.dateRange, to: e.target.value }
                                },
                                currentPage: 1
                              }))}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Product Count Range Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Cantidad de Productos</Label>
                        <div className="px-2">
                          <Slider
                            value={[state.advancedFilters.productCountRange.min, state.advancedFilters.productCountRange.max]}
                            onValueChange={([min, max]) => setState(prev => ({
                              ...prev,
                              advancedFilters: {
                                ...prev.advancedFilters,
                                productCountRange: { min, max }
                              },
                              currentPage: 1
                            }))}
                            max={state.maxProductCount}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{state.advancedFilters.productCountRange.min}</span>
                            <span>{state.advancedFilters.productCountRange.max}</span>
                          </div>
                        </div>
                      </div>

                      {/* Has Products Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Estado de Productos</Label>
                        <Select
                          value={state.advancedFilters.hasProducts}
                          onValueChange={(value: 'all' | 'with_products' | 'without_products') =>
                            setState(prev => ({
                              ...prev,
                              advancedFilters: { ...prev.advancedFilters, hasProducts: value },
                              currentPage: 1
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            <SelectItem value="with_products">Con productos</SelectItem>
                            <SelectItem value="without_products">Sin productos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Sort and View Controls */}
              <div className="flex items-center gap-2">
                <SortButton field="name">Nombre</SortButton>
                <SortButton field="created_at">Fecha</SortButton>
                <SortButton field="products">Productos</SortButton>
                <SortButton field="is_active">Estado</SortButton>

                <div className="h-6 w-px bg-border mx-2" />

                <Button
                  variant={state.viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, viewMode: 'cards' }))}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={state.viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, viewMode: 'table' }))}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Bulk Actions */}
              {state.selectedCategories.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {state.selectedCategories.size} seleccionada{state.selectedCategories.size > 1 ? 's' : ''}
                  </span>
                  {state.selectedCategories.size === 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const id = Array.from(state.selectedCategories)[0];
                        const cat = state.categories.find(c => c.id === id);
                        if (cat) handleOpenModal(cat);
                      }}
                      disabled={state.bulkActionLoading}
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                    disabled={state.bulkActionLoading}
                  >
                    Activar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={state.bulkActionLoading}
                  >
                    Desactivar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                    disabled={state.bulkActionLoading}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </div>

            {/* Active Filters Summary */}
            {(state.searchQuery || state.statusFilter !== 'all' || hasActiveAdvancedFilters()) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Filtros activos:</span>
                {state.searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Búsqueda: "{state.searchQuery}"
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setState(prev => ({ ...prev, searchQuery: '', currentPage: 1 }))}
                    />
                  </Badge>
                )}
                {state.statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Estado: {state.statusFilter === 'active' ? 'Activas' : 'Inactivas'}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setState(prev => ({ ...prev, statusFilter: 'all', currentPage: 1 }))}
                    />
                  </Badge>
                )}
                {state.advancedFilters.dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    Desde: {new Date(state.advancedFilters.dateRange.from).toLocaleDateString()}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setState(prev => ({
                        ...prev,
                        advancedFilters: { ...prev.advancedFilters, dateRange: { ...prev.advancedFilters.dateRange, from: '' } },
                        currentPage: 1
                      }))}
                    />
                  </Badge>
                )}
                {state.advancedFilters.dateRange.to && (
                  <Badge variant="secondary" className="gap-1">
                    Hasta: {new Date(state.advancedFilters.dateRange.to).toLocaleDateString()}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setState(prev => ({
                        ...prev,
                        advancedFilters: { ...prev.advancedFilters, dateRange: { ...prev.advancedFilters.dateRange, to: '' } },
                        currentPage: 1
                      }))}
                    />
                  </Badge>
                )}
                {(state.advancedFilters.productCountRange.min > 0 || state.advancedFilters.productCountRange.max < state.maxProductCount) && (
                  <Badge variant="secondary" className="gap-1">
                    Productos: {state.advancedFilters.productCountRange.min}-{state.advancedFilters.productCountRange.max}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setState(prev => ({
                        ...prev,
                        advancedFilters: { ...prev.advancedFilters, productCountRange: { min: 0, max: prev.maxProductCount } },
                        currentPage: 1
                      }))}
                    />
                  </Badge>
                )}
                {state.advancedFilters.hasProducts !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {state.advancedFilters.hasProducts === 'with_products' ? 'Con productos' : 'Sin productos'}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setState(prev => ({
                        ...prev,
                        advancedFilters: { ...prev.advancedFilters, hasProducts: 'all' },
                        currentPage: 1
                      }))}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredAndSortedCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay categorías</h3>
            <p className="text-muted-foreground text-center mb-4">
              {state.searchQuery || state.statusFilter !== 'all'
                ? 'No se encontraron categorías con los filtros aplicados'
                : 'Comienza creando tu primera categoría'}
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </CardContent>
        </Card>
      ) : state.viewMode === 'cards' ? (
        // Cards View
        <div className="space-y-4">
          {/* Select All for Cards */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={state.selectedCategories.size === paginatedCategories.length && paginatedCategories.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">Seleccionar todas en esta página</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCategories.map(category => {
              const productCount = category._count?.products || 0;
              const canDelete = productCount === 0;
              const isSelected = state.selectedCategories.has(category.id);

              return (
                <Card key={category.id} className={`group hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectCategory(category.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            <Tag className="h-5 w-5" />
                            <span className="break-words">{category.name}</span>
                            <Badge
                              variant={category.is_active ? "default" : "secondary"}
                              className={category.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                            >
                              {category.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </CardTitle>
                          {category.description && (
                            <CardDescription className="mt-2 break-words">
                              {category.description}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {productCount} producto{productCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleStatus(category.id, category.is_active)}
                          title={category.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {category.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenModal(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 ${canDelete ? 'text-destructive hover:text-destructive' : 'text-muted-foreground cursor-not-allowed'}`}
                          onClick={() => canDelete && handleDelete(category.id)}
                          disabled={!canDelete}
                          title={canDelete ? 'Eliminar categoría' : `No se puede eliminar: tiene ${productCount} producto${productCount !== 1 ? 's' : ''}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Creada: {new Date(category.created_at).toLocaleDateString()}</span>
                      <span>ID: {category.id.slice(-8)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        // Table View
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={state.selectedCategories.size === paginatedCategories.length && paginatedCategories.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map(category => {
                  const productCount = category._count?.products || 0;
                  const canDelete = productCount === 0;
                  const isSelected = state.selectedCategories.has(category.id);

                  return (
                    <TableRow key={category.id} className={isSelected ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectCategory(category.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={category.is_active ? "default" : "secondary"}
                          className={category.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {category.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {productCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(category.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenModal(category)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(category.id, category.is_active)}>
                              {category.is_active ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                              {category.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => canDelete && handleDelete(category.id)}
                              disabled={!canDelete}
                              className={canDelete ? 'text-destructive' : 'text-muted-foreground'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((state.currentPage - 1) * state.itemsPerPage) + 1} a {Math.min(state.currentPage * state.itemsPerPage, filteredAndSortedCategories.length)} de {filteredAndSortedCategories.length} categorías
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={state.currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={state.currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, currentPage: page }))}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={state.currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {state.showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {state.editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </CardTitle>
              <CardDescription>
                {state.editingCategory
                  ? 'Modifica los datos de la categoría'
                  : 'Crea una nueva categoría para organizar tus productos'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={state.formData.name}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      formData: { ...prev.formData, name: e.target.value }
                    }))}
                    placeholder="Nombre de la categoría"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <textarea
                    id="description"
                    value={state.formData.description}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      formData: { ...prev.formData, description: e.target.value }
                    }))}
                    placeholder="Descripción de la categoría (opcional)"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={state.formData.is_active}
                    onCheckedChange={(checked) => setState(prev => ({
                      ...prev,
                      formData: { ...prev.formData, is_active: checked }
                    }))}
                  />
                  <Label htmlFor="is_active">Categoría activa</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                    disabled={state.submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={state.submitting}
                  >
                    {state.submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {state.editingCategory ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Modal */}
      <Dialog open={state.showImportModal} onOpenChange={(open) => !open && handleCloseImportModal()}>
        <DialogContent className="sm:max-w-md" aria-labelledby="category-import-title">
          <DialogHeader>
            <DialogTitle id="category-import-title">Importar Categorías</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV para importar categorías en lote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Archivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setState(prev => ({ ...prev, importFile: file }));
                }}
              />
            </div>

            {state.importProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso de importación</span>
                  <span>{state.importProgress}%</span>
                </div>
                <Progress value={state.importProgress} />
              </div>
            )}

            {state.importResults && (
              <div className="space-y-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Resultados de la importación:</strong>
                    <br />
                    • Total de filas: {state.importResults.total}
                    <br />
                    • Importadas exitosamente: {state.importResults.success}
                    <br />
                    • Errores: {state.importResults.errors.length}
                  </AlertDescription>
                </Alert>

                {state.importResults.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    <Label className="text-sm font-medium text-destructive">Errores encontrados:</Label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {state.importResults.errors.map((error, index) => (
                        <li key={index} className="text-destructive">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Formato requerido:</strong> El archivo CSV debe tener las columnas:
                "Nombre", "Descripción", "Estado" (Activa/Inactiva)
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImportModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={!state.importFile || state.importProgress > 0}
            >
              {state.importProgress > 0 ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
