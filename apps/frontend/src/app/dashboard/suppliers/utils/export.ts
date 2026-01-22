import type { Supplier } from '@/types/suppliers';

/**
 * Exporta proveedores a CSV con formato mejorado
 */
export function exportSuppliersToCSV(suppliers: Supplier[], filename = 'proveedores') {
  // Headers
  const headers = [
    'ID',
    'Nombre',
    'Categoría',
    'Email',
    'Teléfono',
    'Dirección',
    'Persona de Contacto',
    'Total Compras',
    'Total Órdenes',
    'Última Compra',
    'Fecha de Registro',
    'Estado',
  ];

  // Formatear datos
  const rows = suppliers.map((supplier) => [
    supplier.id,
    supplier.name,
    supplier.category || '',
    supplier.contactInfo.email || '',
    supplier.contactInfo.phone || '',
    supplier.contactInfo.address || '',
    supplier.contactInfo.contactPerson || '',
    supplier.totalPurchases?.toFixed(2) || '0.00',
    supplier._count?.purchases?.toString() || '0',
    supplier.lastPurchase
      ? new Date(supplier.lastPurchase).toLocaleDateString('es-ES')
      : '',
    new Date(supplier.createdAt).toLocaleDateString('es-ES'),
    supplier._count?.purchases && supplier._count.purchases > 0
      ? 'Activo'
      : 'Inactivo',
  ]);

  // Crear contenido CSV
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escapar comillas y comas
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  // Agregar BOM para Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // Descargar archivo
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta proveedores a JSON
 */
export function exportSuppliersToJSON(suppliers: Supplier[], filename = 'proveedores') {
  const jsonContent = JSON.stringify(suppliers, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Prepara datos para exportación a Excel (requiere librería externa)
 */
export function prepareExcelData(suppliers: Supplier[]) {
  return suppliers.map((supplier) => ({
    ID: supplier.id,
    Nombre: supplier.name,
    Categoría: supplier.category || '',
    Email: supplier.contactInfo.email || '',
    Teléfono: supplier.contactInfo.phone || '',
    Dirección: supplier.contactInfo.address || '',
    'Persona de Contacto': supplier.contactInfo.contactPerson || '',
    'Total Compras': supplier.totalPurchases || 0,
    'Total Órdenes': supplier._count?.purchases || 0,
    'Última Compra': supplier.lastPurchase || '',
    'Fecha de Registro': supplier.createdAt,
    Estado:
      supplier._count?.purchases && supplier._count.purchases > 0
        ? 'Activo'
        : 'Inactivo',
  }));
}
