'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isSupabaseActive } from '@/lib/env';
import { CategoryCard } from './components/CategoryCard';
import { CategoryEditModal } from './components/CategoryEditModal';
import { CategoryHeader } from './components/CategoryHeader';
import { CategoryTable } from './components/CategoryTable';
import { CategoryTree } from './components/CategoryTree';
import { StatsCards } from './components/StatsCards';
import { useCategoryManagement, type CategoryWithCount, type SortDirection, type SortField, type StatusFilter } from './hooks/useCategoryManagement';

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
    bulkAction,
  } = useCategoryManagement();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'tree'>('table');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);

  const itemsPerPage = 12;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const filteredAndSorted = useMemo(
    () => getFilteredAndSorted(debouncedSearch, statusFilter, sortField, sortDirection),
    [getFilteredAndSorted, debouncedSearch, statusFilter, sortField, sortDirection]
  );

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));

  useEffect(() => {
    const visibleIds = new Set(filteredAndSorted.map((category) => category.id));
    setSelectedCategories((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredAndSorted]);

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection((prev) => sortField === field && prev === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  }, [sortField]);

  const handleSelectCategory = useCallback((categoryId: string, selected: boolean) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (selected) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    const pageIds = paginatedCategories.map((category) => category.id);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (selected) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [paginatedCategories]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <CategoryHeader
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNewClick={() => openModal()}
      />

      {!isSupabaseActive() ? (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Supabase no está configurado. Los cambios no se sincronizarán en tiempo real.
          </AlertDescription>
        </Alert>
      ) : null}

      <StatsCards categories={categories} />

      {selectedCategories.size > 0 ? (
        <Card className="border-primary/50 shadow-sm bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-sm font-medium text-primary">
                {selectedCategories.size} categoría(s) seleccionada(s)
              </span>
              <div className="flex flex-wrap gap-2">
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
      ) : null}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCategories.length > 0 ? (
            paginatedCategories.map((category) => (
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
            <div className="col-span-full h-32 flex items-center justify-center border border-dashed rounded-md text-muted-foreground">
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

      {viewMode !== 'tree' && filteredAndSorted.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} de {filteredAndSorted.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

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
