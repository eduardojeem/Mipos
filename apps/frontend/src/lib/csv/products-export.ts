import type { Product } from '@/types';

interface ColumnConfig {
  sku: boolean;
  name: boolean;
  category: boolean;
  salePrice: boolean;
  costPrice: boolean;
  margin: boolean;
  stock: boolean;
  visibility: boolean;
  status: boolean;
  description: boolean;
  brand: boolean;
  minStock?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
}

interface ExportOptions {
  columns?: ColumnConfig;
  includeHeader?: boolean;
  delimiter?: string;
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? '').trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportProductsToCSV(
  products: Product[],
  options: ExportOptions = {}
) {
  const {
    columns = {
      sku: true,
      name: true,
      category: true,
      salePrice: true,
      costPrice: true,
      margin: true,
      stock: true,
      visibility: true,
      status: true,
      description: false,
      brand: false,
      minStock: false,
      createdAt: false,
      updatedAt: false,
    },
    includeHeader = true,
    delimiter = ',',
  } = options;

  if (products.length === 0) {
    throw new Error('No hay productos para exportar');
  }

  // Construir headers
  const headers: string[] = [];

  if (columns.sku) headers.push('SKU');
  if (columns.name) headers.push('Nombre Producto');
  if (columns.brand) headers.push('Marca');
  if (columns.category) headers.push('Categoría');
  if (columns.salePrice) headers.push('Precio Venta (Gs)');
  if (columns.costPrice) headers.push('Precio Costo (Gs)');
  if (columns.margin) headers.push('Margen (%)');
  if (columns.stock) headers.push('Stock Actual');
  if (columns.minStock) headers.push('Stock Mínimo');
  if (columns.visibility) headers.push('Visibilidad');
  if (columns.status) headers.push('Estado');
  if (columns.description) headers.push('Descripción');
  if (columns.createdAt) headers.push('Fecha Creación');
  if (columns.updatedAt) headers.push('Última Actualización');

  // Construir filas
  const rows: string[][] = [];

  products.forEach((product) => {
    const row: string[] = [];
    const salePrice = product.sale_price || 0;
    const costPrice = product.cost_price || 0;
    const margin = costPrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0;

    if (columns.sku) row.push(escapeCSV(product.sku || ''));
    if (columns.name) row.push(escapeCSV(product.name || ''));
    if (columns.brand) row.push(escapeCSV(product.brand || ''));
    if (columns.category) {
      const categoryName = typeof product.category === 'object' ? product.category?.name : '';
      row.push(escapeCSV(categoryName || ''));
    }
    if (columns.salePrice) row.push(escapeCSV(salePrice.toLocaleString('es-PY')));
    if (columns.costPrice) row.push(escapeCSV(costPrice.toLocaleString('es-PY')));
    if (columns.margin) row.push(escapeCSV(`${margin}%`));
    if (columns.stock) row.push(escapeCSV(product.stock_quantity || 0));
    if (columns.minStock) row.push(escapeCSV(product.min_stock || 0));
    if (columns.visibility) row.push(escapeCSV(product.is_public ? 'Público' : 'Privado'));
    if (columns.status) row.push(escapeCSV(product.is_active ? 'Activo' : 'Inactivo'));
    if (columns.description) row.push(escapeCSV(product.description || ''));
    if (columns.createdAt) {
      const date = product.created_at ? new Date(product.created_at).toLocaleDateString('es-PY') : '';
      row.push(escapeCSV(date));
    }
    if (columns.updatedAt) {
      const date = product.updated_at ? new Date(product.updated_at).toLocaleDateString('es-PY') : '';
      row.push(escapeCSV(date));
    }

    rows.push(row);
  });

  // Construir CSV
  const csvLines: string[] = [];
  if (includeHeader) {
    csvLines.push(headers.map(escapeCSV).join(delimiter));
  }
  csvLines.push(...rows.map((row) => row.join(delimiter)));

  // Crear blob con BOM para UTF-8 (Excel compatible)
  const csvContent = csvLines.join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Descargar
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `productos-${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
