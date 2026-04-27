'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isSupabaseActive } from '@/lib/env';

import { useCategoryManagement, type CategoryWithCount, type SortField, type SortDirection, type StatusFilter } from './hooks/useCategoryManagement';
import { StatsCards } from './components/StatsCards';
import { CategoryCard } from './components/CategoryCard';
import { CategoryHeader } from './components/CategoryHeader';
import { CategoryTable } from './components/CategoryTable';
import { CategoryEditModal } from './components/CategoryEditModal';
import { CategoryTree } from './components/CategoryTree';

export default function CategoriesPage() {
  const {
    categories,
    loading,
    bulkActionLoading,
    getOrgId,
    loadCategories,
    getFilteredAndSorted,
    toggleStatus,
    deleteCategory,
    bulkAction
  } = useCategoryManagement();

  // Local UI State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'tree'>('cards');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Derived state
  const filteredAndSorted = useMemo(() => 
    getFilteredAndSorted(debouncedSearch, statusFilter, sortField, sortDirection),
  [getFilteredAndSorted, debouncedSearch, statusFilter, sortField, sortDirection]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  // Handlers
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

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedCategories(selected ? new Set(filteredAndSorted.map(c => c.id)) : new Set());
  }, [filteredAndSorted]);

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const success = await bulkAction(selectedCategories, action);
    if (success) {
      setSelectedCategories(new Set());
    }
  };

  const openModal = (category?: CategoryWithCount) => {
    setEditingCategory(category || null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <CategoryHeader 
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNewClick={() => openModal()}
      />

      {!isSupabaseActive() && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Supabase no está configurado. Los cambios no se sincronizarán en tiempo real.
          </AlertDescription>
        </Alert>
      )}

      <StatsCards categories={categories} />

      {/* Bulk Actions Bar */}
      {selectedCategories.size > 0 && (
        <Card className="border-primary/50 shadow-sm animate-in slide-in-from-bottom-2 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {selectedCategories.size} categoría(s) seleccionada(s)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('activate')} disabled={bulkActionLoading}>
                  <Eye className="h-4 w-4 mr-2" /> Activar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('deactivate')} disabled={bulkActionLoading}>
                  <EyeOff className="h-4 w-4 mr-2" /> Desactivar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')} disabled={bulkActionLoading}>
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <div className="animate-in fade-in-50 duration-500">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCategories.length > 0 ? (
              paginatedCategories.map(category => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isSelected={selectedCategories.has(category.id)}
                  onSelect={(selected) => handleSelectCategory(category.id, selected)}
                  onEdit={() => openModal(category)}
                  onDelete={() => deleteCategory(category.id)}
                  onToggleStatus={() => toggleStatus(category.id, category.is_active)}
                />
              ))
            ) : (
              <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
                No se encontraron categorías.
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <CategoryTable 
            categories={paginatedCategories}
            selectedCategories={selectedCategories}
            onSelectAll={handleSelectAll}
            onSelectCategory={handleSelectCategory}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={openModal}
            onDelete={deleteCategory}
            onToggleStatus={toggleStatus}
          />
        ) : (
          <CategoryTree
            categories={filteredAndSorted}
            search={debouncedSearch}
            statusFilter={statusFilter}
            selectedCategories={selectedCategories}
            onSelectCategory={handleSelectCategory}
            onEdit={openModal}
            onDelete={deleteCategory}
            onToggleStatus={toggleStatus}
          />
        )}
      </div>

      {/* Pagination */}
      {viewMode !== 'tree' && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} de {filteredAndSorted.length}
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
      <CategoryEditModal 
        open={showModal} 
        onOpenChange={setShowModal}
        category={editingCategory}
        allCategories={categories}
        onSuccess={loadCategories}
        getOrgId={getOrgId}
      />
    </div>
  );
}
