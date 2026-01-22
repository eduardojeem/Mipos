import { useCallback } from 'react'

export function useProductsLogic(params: {
  itemsPerPage: number
  updateUrl: (next: any) => void
  setServerFilters: (updater: any) => void
  setCurrentPage: (n: number) => void
  setImageFilter?: (val: 'all'|'with'|'without') => void
}) {
  const { itemsPerPage, updateUrl, setServerFilters, setCurrentPage, setImageFilter } = params

  const handleSearchChange = useCallback((term: string) => {
    const v = term?.trim() || ''
    let changed = false
    setServerFilters((prev: any) => {
      const nextSearch = v || undefined
      if (prev?.search === nextSearch) return prev
      changed = true
      return { ...prev, search: nextSearch }
    })
    if (changed) {
      setCurrentPage(1)
      updateUrl({ search: v || undefined, page: 1, limit: itemsPerPage })
    }
  }, [itemsPerPage, updateUrl, setServerFilters, setCurrentPage])

  const handleCategoryChange = useCallback((categoryId: string | undefined) => {
    setServerFilters((prev: any) => ({ ...prev, categoryId: categoryId || undefined }))
    setCurrentPage(1)
    updateUrl({ categoryId: categoryId || undefined, page: 1, limit: itemsPerPage })
  }, [itemsPerPage, updateUrl, setServerFilters, setCurrentPage])

  const handleSortChange = useCallback((sortBy?: string, sortOrder?: 'asc'|'desc') => {
    setServerFilters((prev: any) => ({ ...prev, sortBy, sortOrder }))
    setCurrentPage(1)
    updateUrl({ sortBy, sortOrder, page: 1, limit: itemsPerPage })
  }, [itemsPerPage, updateUrl, setServerFilters, setCurrentPage])

  const handleImageFilterChange = useCallback((val: 'all'|'with'|'without') => {
    setImageFilter?.(val)
    setCurrentPage(1)
    updateUrl({ img: val === 'all' ? undefined : val, page: 1, limit: itemsPerPage })
  }, [itemsPerPage, updateUrl, setCurrentPage, setImageFilter])

  const applyFilters = useCallback((filters: any) => {
    const sortMap: Record<string, any> = { name: 'name', price: 'sale_price', stock: 'stock_quantity', created: 'created_at', updated: 'updated_at' }
    const mappedSort = sortMap[filters.sortBy] || undefined
    setServerFilters({
      search: filters.searchTerm || undefined,
      categoryId: filters.categoryIds?.length === 1 ? filters.categoryIds[0] : undefined,
      supplierId: filters.supplierId || undefined,
      supplierName: filters.supplierName || undefined,
      sortBy: mappedSort,
      sortOrder: filters.sortOrder,
      minPrice: filters.priceRange?.[0],
      maxPrice: filters.priceRange?.[1],
      minStock: filters.stockRange?.[0],
      maxStock: filters.stockRange?.[1],
      isActive: filters.state === 'active' ? true : filters.state === 'inactive' ? false : undefined,
      dateFrom: filters.dateRange?.from ? new Date(filters.dateRange.from).toISOString() : undefined,
      dateTo: filters.dateRange?.to ? new Date(filters.dateRange.to).toISOString() : undefined,
      stockStatus: filters.stockStatus !== 'all' ? filters.stockStatus : undefined
    })
    setCurrentPage(1)
    updateUrl({
      search: filters.searchTerm || undefined,
      categoryId: filters.categoryIds?.length === 1 ? filters.categoryIds[0] : undefined,
      supplierId: filters.supplierId || undefined,
      supplierName: filters.supplierName || undefined,
      page: 1,
      limit: itemsPerPage,
      sortBy: mappedSort,
      sortOrder: filters.sortOrder,
      stockStatus: filters.stockStatus !== 'all' ? filters.stockStatus : undefined
    })
  }, [itemsPerPage, updateUrl, setServerFilters, setCurrentPage])

  const clearAllFilters = useCallback(() => {
    setServerFilters({})
    setCurrentPage(1)
    updateUrl({ page: 1, limit: itemsPerPage, search: undefined, categoryId: undefined, sortBy: undefined, sortOrder: undefined, stockStatus: undefined })
  }, [itemsPerPage, updateUrl, setServerFilters, setCurrentPage])

  const onPageChange = useCallback((page: number) => {
    setCurrentPage(page)
    updateUrl({ page, limit: itemsPerPage })
  }, [itemsPerPage, updateUrl, setCurrentPage])

  const onItemsPerPageChange = useCallback((next: number) => {
    setCurrentPage(1)
    updateUrl({ page: 1, limit: next })
  }, [updateUrl, setCurrentPage])

  const handleStockStatusChange = useCallback((status: 'all'|'in_stock'|'out_of_stock'|'low_stock'|'critical') => {
    setServerFilters((prev: any) => ({ ...prev, stockStatus: status === 'all' ? undefined : status }))
    setCurrentPage(1)
    updateUrl({ stockStatus: status === 'all' ? undefined : status, page: 1, limit: itemsPerPage })
  }, [itemsPerPage, updateUrl, setServerFilters, setCurrentPage])

  return {
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    handleImageFilterChange,
    handleStockStatusChange,
    applyFilters,
    clearAllFilters,
    onPageChange,
    onItemsPerPageChange
  }
}
