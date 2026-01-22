import * as XLSX from 'xlsx';
import { toast } from '@/lib/toast';

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency';
  validation?: (value: any) => string | null;
  transform?: (value: any) => any;
}

export interface ImportMapping {
  [csvColumn: string]: string; // Maps CSV column to product field
}

export interface ImportValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
}

export interface ImportPreview {
  headers: string[];
  data: any[][];
  totalRows: number;
  validRows: number;
  errors: ImportValidationError[];
  mapping: ImportMapping;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportValidationError[];
  duplicates: number;
}

export interface ImportOptions {
  skipFirstRow: boolean;
  updateExisting: boolean;
  validateOnly: boolean;
  batchSize: number;
  duplicateStrategy: 'skip' | 'update' | 'create_new';
}

class ImportService {
  private static readonly SUPPORTED_FORMATS = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  private static readonly PRODUCT_COLUMNS: ImportColumn[] = [
    {
      key: 'name',
      label: 'Nombre del Producto',
      required: true,
      type: 'string',
      validation: (value) => {
        if (!value || value.toString().trim().length < 2) {
          return 'El nombre debe tener al menos 2 caracteres';
        }
        if (value.toString().length > 255) {
          return 'El nombre no puede exceder 255 caracteres';
        }
        return null;
      }
    },
    {
      key: 'sku',
      label: 'SKU',
      required: true,
      type: 'string',
      validation: (value) => {
        if (!value || value.toString().trim().length === 0) {
          return 'SKU es requerido';
        }
        if (!/^[A-Za-z0-9-_]+$/.test(value.toString())) {
          return 'SKU solo puede contener letras, números, guiones y guiones bajos';
        }
        return null;
      }
    },
    {
      key: 'description',
      label: 'Descripción',
      required: false,
      type: 'string'
    },
    {
      key: 'category_id',
      label: 'ID de Categoría',
      required: true,
      type: 'string',
      validation: (value) => {
        if (!value) return 'Categoría es requerida';
        return null;
      }
    },
    {
      key: 'supplier_id',
      label: 'ID de Proveedor',
      required: false,
      type: 'string'
    },
    {
      key: 'cost_price',
      label: 'Precio de Costo',
      required: true,
      type: 'currency',
      validation: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          return 'Precio de costo debe ser un número positivo';
        }
        return null;
      },
      transform: (value) => parseFloat(value)
    },
    {
      key: 'sale_price',
      label: 'Precio de Venta',
      required: true,
      type: 'currency',
      validation: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          return 'Precio de venta debe ser un número positivo';
        }
        return null;
      },
      transform: (value) => parseFloat(value)
    },
    {
      key: 'stock_quantity',
      label: 'Cantidad en Stock',
      required: true,
      type: 'number',
      validation: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) {
          return 'Stock debe ser un número entero positivo';
        }
        return null;
      },
      transform: (value) => parseInt(value)
    },
    {
      key: 'min_stock',
      label: 'Stock Mínimo',
      required: false,
      type: 'number',
      validation: (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const num = parseInt(value);
        if (isNaN(num) || num < 0) {
          return 'Stock mínimo debe ser un número entero positivo';
        }
        return null;
      },
      transform: (value) => value === '' || value === null || value === undefined ? 0 : parseInt(value)
    },
    {
      key: 'is_active',
      label: 'Activo',
      required: false,
      type: 'boolean',
      transform: (value) => {
        if (typeof value === 'boolean') return value;
        const str = value.toString().toLowerCase();
        return ['true', '1', 'yes', 'sí', 'activo', 'active'].includes(str);
      }
    },
    {
      key: 'barcode',
      label: 'Código de Barras',
      required: false,
      type: 'string'
    },
    {
      key: 'weight',
      label: 'Peso (g)',
      required: false,
      type: 'number',
      validation: (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          return 'Peso debe ser un número positivo';
        }
        return null;
      },
      transform: (value) => value === '' || value === null || value === undefined ? null : parseFloat(value)
    },
    {
      key: 'dimensions',
      label: 'Dimensiones',
      required: false,
      type: 'string'
    }
  ];

  static getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  static getProductColumns(): ImportColumn[] {
    return [...this.PRODUCT_COLUMNS];
  }

  static validateFile(file: File): string | null {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return 'El archivo no puede exceder 10MB';
    }

    // Check file type
    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      return 'Formato de archivo no soportado. Use CSV o Excel (.xlsx)';
    }

    return null;
  }

  static async parseFile(file: File): Promise<ImportPreview> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let workbook: XLSX.WorkBook;

          if (file.type === 'text/csv') {
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            reject(new Error('El archivo está vacío'));
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1) as any[][];

          // Generate initial mapping based on column names
          const mapping = this.generateInitialMapping(headers);

          // Validate data
          const { validRows, errors } = this.validateData(dataRows, headers, mapping);

          resolve({
            headers,
            data: dataRows,
            totalRows: dataRows.length,
            validRows,
            errors,
            mapping
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          reject(new Error(`Error al procesar el archivo: ${msg}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      if (file.type === 'text/csv') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  private static generateInitialMapping(headers: string[]): ImportMapping {
    const mapping: ImportMapping = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Try to match common column names
      for (const column of this.PRODUCT_COLUMNS) {
        const columnVariations = [
          column.key,
          column.label.toLowerCase(),
          column.key.replace('_', ' '),
          column.key.replace('_', '')
        ];

        if (columnVariations.some(variation => 
          normalizedHeader.includes(variation.toLowerCase()) ||
          variation.toLowerCase().includes(normalizedHeader)
        )) {
          mapping[header] = column.key;
          break;
        }
      }
    });

    return mapping;
  }

  private static validateData(
    data: any[][],
    headers: string[],
    mapping: ImportMapping
  ): { validRows: number; errors: ImportValidationError[] } {
    const errors: ImportValidationError[] = [];
    let validRows = 0;

    data.forEach((row, rowIndex) => {
      let rowValid = true;
      const rowData: any = {};

      // Map row data to product fields
      headers.forEach((header, colIndex) => {
        const fieldKey = mapping[header];
        if (fieldKey) {
          rowData[fieldKey] = row[colIndex];
        }
      });

      // Validate each mapped field
      this.PRODUCT_COLUMNS.forEach(column => {
        const value = rowData[column.key];

        // Check required fields
        if (column.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: rowIndex + 2, // +2 because we skip header and arrays are 0-indexed
            column: column.label,
            value,
            error: `${column.label} es requerido`
          });
          rowValid = false;
          return;
        }

        // Skip validation for empty optional fields
        if (!column.required && (value === undefined || value === null || value === '')) {
          return;
        }

        // Run custom validation
        if (column.validation) {
          const validationError = column.validation(value);
          if (validationError) {
            errors.push({
              row: rowIndex + 2,
              column: column.label,
              value,
              error: validationError
            });
            rowValid = false;
          }
        }
      });

      if (rowValid) {
        validRows++;
      }
    });

    return { validRows, errors };
  }

  static updateMapping(
    preview: ImportPreview,
    newMapping: ImportMapping
  ): ImportPreview {
    const { validRows, errors } = this.validateData(
      preview.data,
      preview.headers,
      newMapping
    );

    return {
      ...preview,
      mapping: newMapping,
      validRows,
      errors
    };
  }

  static async importProducts(
    preview: ImportPreview,
    options: ImportOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      duplicates: 0
    };

    try {
      const { data, headers, mapping } = preview;
      const startIndex = options.skipFirstRow ? 1 : 0;
      const rowsToProcess = data.slice(startIndex);

      onProgress?.(0, 'Iniciando importación...');

      // Process in batches
      const batchSize = options.batchSize || 50;
      const totalBatches = Math.ceil(rowsToProcess.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, rowsToProcess.length);
        const batch = rowsToProcess.slice(batchStart, batchEnd);

        onProgress?.(
          (batchIndex / totalBatches) * 100,
          `Procesando lote ${batchIndex + 1} de ${totalBatches}...`
        );

        // Process batch
        for (let i = 0; i < batch.length; i++) {
          const rowIndex = batchStart + i + (options.skipFirstRow ? 2 : 1);
          const row = batch[i];

          try {
            const productData = this.transformRowToProduct(row, headers, mapping);
            
            if (options.validateOnly) {
              // Just validate, don't actually import
              result.imported++;
            } else {
              // Here you would call your API to create/update the product
              // const response = await createProduct(productData);
              
              // For now, simulate the API call
              await new Promise(resolve => setTimeout(resolve, 10));
              result.imported++;
            }
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: rowIndex,
              column: 'General',
              value: row,
              error: (error instanceof Error) ? error.message : String(error)
            });
          }
        }

        // Small delay between batches to prevent overwhelming the server
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      onProgress?.(100, 'Importación completada');
      result.success = true;

    } catch (error) {
      result.errors.push({
        row: 0,
        column: 'General',
        value: null,
        error: `Error general: ${(error instanceof Error) ? error.message : String(error)}`
      });
    }

    return result;
  }

  private static transformRowToProduct(
    row: any[],
    headers: string[],
    mapping: ImportMapping
  ): any {
    const product: any = {};

    headers.forEach((header, index) => {
      const fieldKey = mapping[header];
      if (fieldKey) {
        const column = this.PRODUCT_COLUMNS.find(c => c.key === fieldKey);
        let value = row[index];

        // Apply transformation if defined
        if (column?.transform) {
          value = column.transform(value);
        }

        product[fieldKey] = value;
      }
    });

    // Set default values for optional fields
    if (product.is_active === undefined) {
      product.is_active = true;
    }
    if (product.min_stock === undefined) {
      product.min_stock = 0;
    }

    return product;
  }

  static generateTemplate(): void {
    const headers = this.PRODUCT_COLUMNS.map(col => col.label);
    const sampleData = [
      [
        'Labial Rojo Intenso',
        'LAB-001',
        'Labial de larga duración color rojo intenso',
        'cat-makeup',
        'sup-001',
        '15000',
        '25000',
        '50',
        '5',
        'true',
        '7891234567890',
        '15',
        '10x2x2 cm'
      ],
      [
        'Base Líquida Natural',
        'BASE-002',
        'Base líquida cobertura natural tono medio',
        'cat-makeup',
        'sup-002',
        '35000',
        '55000',
        '25',
        '3',
        'true',
        '7891234567891',
        '120',
        '15x5x5 cm'
      ]
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // Set column widths
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    // Download file
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
  }

  static exportValidationErrors(errors: ImportValidationError[]): void {
    if (errors.length === 0) {
      toast.info('No hay errores para exportar');
      return;
    }

    const headers = ['Fila', 'Columna', 'Valor', 'Error'];
    const data = errors.map(error => [
      error.row,
      error.column,
      error.value?.toString() || '',
      error.error
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Fila
      { wch: 20 }, // Columna
      { wch: 30 }, // Valor
      { wch: 50 }  // Error
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Errores');
    XLSX.writeFile(wb, `errores_importacion_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

export default ImportService;
