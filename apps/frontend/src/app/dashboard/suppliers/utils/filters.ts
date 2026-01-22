import type { Supplier, SupplierFilters } from '@/types/suppliers';

/**
 * Filtra proveedores basado en criterios
 */
export function filterSuppliers(
  suppliers: Supplier[],
  filters: SupplierFilters
): Supplier[] {
  let filtered = [...suppliers];

  // Búsqueda por texto
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.contactInfo.email?.toLowerCase().includes(searchLower) ||
        supplier.contactInfo.phone?.includes(searchLower) ||
        supplier.category?.toLowerCase().includes(searchLower)
    );
  }

  // Filtro por estado
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'active') {
      filtered = filtered.filter(
        (supplier) => supplier._count?.purchases && supplier._count.purchases > 0
      );
    } else if (filters.status === 'inactive') {
      filtered = filtered.filter(
        (supplier) => !supplier._count?.purchases || supplier._count.purchases === 0
      );
    }
  }

  // Filtro por categoría
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter((supplier) => supplier.category === filters.category);
  }

  return filtered;
}

/**
 * Ordena proveedores
 */
export function sortSuppliers(
  suppliers: Supplier[],
  sortBy: SupplierFilters['sortBy'] = 'name',
  sortOrder: SupplierFilters['sortOrder'] = 'asc'
): Supplier[] {
  const sorted = [...suppliers];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'totalPurchases':
        aValue = a.totalPurchases || 0;
        bValue = b.totalPurchases || 0;
        break;
      case 'totalOrders':
        aValue = a._count?.purchases || 0;
        bValue = b._count?.purchases || 0;
        break;
      case 'lastPurchase':
        aValue = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
        bValue = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return sorted;
}

/**
 * Calcula estadísticas de proveedores
 */
export function calculateSupplierStats(suppliers: Supplier[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return {
    totalSuppliers: suppliers.length,
    newThisMonth: suppliers.filter((s) => {
      const createdDate = new Date(s.createdAt);
      return (
        createdDate.getMonth() === currentMonth &&
        createdDate.getFullYear() === currentYear
      );
    }).length,
    activeSuppliers: suppliers.filter(
      (s) => s._count?.purchases && s._count.purchases > 0
    ).length,
    totalPurchases: suppliers.reduce(
      (sum, s) => sum + (s.totalPurchases || 0),
      0
    ),
    totalOrders: suppliers.reduce(
      (sum, s) => sum + (s._count?.purchases || 0),
      0
    ),
  };
}

/**
 * Obtiene categorías únicas de proveedores
 */
export function getUniqueCategories(suppliers: Supplier[]): string[] {
  const categories = new Set(
    suppliers.map((s) => s.category).filter(Boolean)
  );
  return Array.from(categories).sort();
}
