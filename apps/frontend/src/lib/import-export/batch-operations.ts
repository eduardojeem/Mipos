/**
 * Batch Operations System
 * Handles CSV/Excel import/export with validation, error handling, and progress tracking
 */

// Lazy import - XLSX se carga solo cuando se necesite
import { api } from '@/lib/api';

export interface ImportConfig {
  /** Entity type to import */
  entityType: 'products' | 'categories' | 'customers' | 'sales' | 'inventory_movements';
  /** File format */
  format: 'csv' | 'excel';
  /** Validation rules */
  validationRules: ValidationRule[];
  /** Batch size for processing */
  batchSize: number;
  /** Skip duplicate records */
  skipDuplicates: boolean;
  /** Update existing records */
  updateExisting: boolean;
  /** Custom field mappings */
  fieldMappings?: Record<string, string>;
}

export interface ExportConfig {
  /** Entity type to export */
  entityType: 'products' | 'categories' | 'customers' | 'sales' | 'inventory_movements';
  /** File format */
  format: 'csv' | 'excel';
  /** Fields to include */
  fields: string[];
  /** Filters to apply */
  filters?: Record<string, any>;
  /** Date range */
  dateRange?: {
    from: Date;
    to: Date;
    field: string;
  };
  /** Include related data */
  includeRelated?: string[];
  /** Optional date format for export */
  dateFormat?: string;
  /** Optional batch size for export processing */
  batchSize?: number;
  /** Include column headers when exporting */
  includeHeaders?: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'number' | 'date' | 'enum' | 'regex' | 'custom';
  message: string;
  options?: {
    min?: number;
    max?: number;
    pattern?: string;
    values?: string[];
    customValidator?: (value: any) => boolean;
  };
}

export interface ImportProgress {
  status: 'preparing' | 'validating' | 'processing' | 'completed' | 'error';
  totalRecords: number;
  processedRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  updatedRecords: number;
  createdRecords: number;
  currentBatch: number;
  totalBatches: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  startTime: number;
  endTime?: number;
}

export interface ExportProgress {
  status: 'preparing' | 'fetching' | 'formatting' | 'generating' | 'completed' | 'error';
  totalRecords: number;
  processedRecords: number;
  currentBatch: number;
  totalBatches: number;
  startTime: number;
  endTime?: number;
  downloadUrl?: string;
  fileName?: string;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
  severity: 'error' | 'warning';
}

export interface ImportWarning {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface ImportResult {
  success: boolean;
  progress: ImportProgress;
  data?: any[];
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duplicates: number;
    updated: number;
    created: number;
  };
}

export interface ExportResult {
  success: boolean;
  progress: ExportProgress;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  filename?: string;
  summary?: {
    totalRecords: number;
    exportedRecords: number;
    skippedRecords: number;
    fileSize: number;
  };
}

export class BatchOperationsService {
  private importProgress: Map<string, ImportProgress> = new Map();
  private exportProgress: Map<string, ExportProgress> = new Map();
  private progressListeners: Map<string, Set<(progress: any) => void>> = new Map();

  /**
   * Import data from CSV/Excel file
   */
  public async importData(
    file: File,
    config: ImportConfig,
    progressCallback?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const operationId = this.generateOperationId();
    
    const progress: ImportProgress = {
      status: 'preparing',
      totalRecords: 0,
      processedRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      updatedRecords: 0,
      createdRecords: 0,
      currentBatch: 0,
      totalBatches: 0,
      errors: [],
      warnings: [],
      startTime: Date.now()
    };

    this.importProgress.set(operationId, progress);
    
    if (progressCallback) {
      this.subscribeToProgress(operationId, progressCallback);
    }

    try {
      // Parse file
      const rawData = await this.parseFile(file, config.format);
      progress.totalRecords = rawData.length;
      progress.totalBatches = Math.ceil(rawData.length / config.batchSize);
      progress.status = 'validating';
      this.updateProgress(operationId, progress);

      // Validate data
      const validationResult = await this.validateData(rawData, config, operationId);
      progress.validRecords = validationResult.validRecords.length;
      progress.invalidRecords = validationResult.errors.length;
      progress.errors = validationResult.errors;
      progress.warnings = validationResult.warnings;

      if (progress.invalidRecords > 0 && progress.validRecords === 0) {
        progress.status = 'error';
        progress.endTime = Date.now();
        this.updateProgress(operationId, progress);
        
        return {
          success: false,
          progress,
          summary: {
            totalProcessed: progress.totalRecords,
            successful: 0,
            failed: progress.invalidRecords,
            duplicates: 0,
            updated: 0,
            created: 0
          }
        };
      }

      // Process data in batches
      progress.status = 'processing';
      this.updateProgress(operationId, progress);

      const processResult = await this.processDataBatches(
        validationResult.validRecords,
        config,
        operationId
      );

      progress.createdRecords = processResult.created;
      progress.updatedRecords = processResult.updated;
      progress.duplicateRecords = processResult.duplicates;
      progress.processedRecords = progress.validRecords;
      progress.status = 'completed';
      progress.endTime = Date.now();
      this.updateProgress(operationId, progress);

      return {
        success: true,
        progress,
        data: processResult.data,
        summary: {
          totalProcessed: progress.totalRecords,
          successful: progress.validRecords,
          failed: progress.invalidRecords,
          duplicates: progress.duplicateRecords,
          updated: progress.updatedRecords,
          created: progress.createdRecords
        }
      };

    } catch (error) {
      progress.status = 'error';
      progress.endTime = Date.now();
      progress.errors.push({
        row: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      });
      this.updateProgress(operationId, progress);

      return {
        success: false,
        progress,
        summary: {
          totalProcessed: progress.totalRecords,
          successful: 0,
          failed: progress.totalRecords,
          duplicates: 0,
          updated: 0,
          created: 0
        }
      };
    }
  }

  /**
   * Export data to CSV/Excel file
   */
  public async exportData(
    config: ExportConfig,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const operationId = this.generateOperationId();
    
    const progress: ExportProgress = {
      status: 'preparing',
      totalRecords: 0,
      processedRecords: 0,
      currentBatch: 0,
      totalBatches: 0,
      startTime: Date.now()
    };

    this.exportProgress.set(operationId, progress);
    
    if (progressCallback) {
      this.subscribeToProgress(operationId, progressCallback);
    }

    try {
      // Fetch data count
      progress.status = 'fetching';
      this.updateProgress(operationId, progress);

      const totalCount = await this.getDataCount(config);
      progress.totalRecords = totalCount;
      progress.totalBatches = Math.ceil(totalCount / 1000); // 1000 records per batch
      this.updateProgress(operationId, progress);

      // Fetch data in batches
      const allData = await this.fetchDataBatches(config, operationId);

      // Format data
      progress.status = 'formatting';
      this.updateProgress(operationId, progress);

      const formattedData = await this.formatExportData(allData, config);

      // Generate file
      progress.status = 'generating';
      this.updateProgress(operationId, progress);

      const fileResult = await this.generateExportFile(formattedData, config);

      progress.status = 'completed';
      progress.endTime = Date.now();
      progress.downloadUrl = fileResult.downloadUrl;
      progress.fileName = fileResult.fileName;
      this.updateProgress(operationId, progress);

      return {
        success: true,
        progress,
        downloadUrl: fileResult.downloadUrl,
        fileName: fileResult.fileName,
        fileSize: fileResult.fileSize,
        filename: fileResult.fileName,
        summary: {
          totalRecords: progress.totalRecords,
          exportedRecords: progress.totalRecords,
          skippedRecords: 0,
          fileSize: fileResult.fileSize
        }
      };

    } catch (error) {
      progress.status = 'error';
      progress.endTime = Date.now();
      this.updateProgress(operationId, progress);

      return {
        success: false,
        progress
      };
    }
  }

  /**
   * Get import progress
   */
  public getImportProgress(operationId: string): ImportProgress | undefined {
    return this.importProgress.get(operationId);
  }

  /**
   * Get export progress
   */
  public getExportProgress(operationId: string): ExportProgress | undefined {
    return this.exportProgress.get(operationId);
  }

  /**
   * Subscribe to progress updates
   */
  public subscribeToProgress(
    operationId: string,
    callback: (progress: any) => void
  ): () => void {
    if (!this.progressListeners.has(operationId)) {
      this.progressListeners.set(operationId, new Set());
    }
    
    this.progressListeners.get(operationId)!.add(callback);
    
    return () => {
      const listeners = this.progressListeners.get(operationId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.progressListeners.delete(operationId);
        }
      }
    };
  }

  /**
   * Parse file (CSV or Excel)
   */
  private async parseFile(file: File, format: 'csv' | 'excel'): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          // Lazy load XLSX solo cuando se necesite
          const XLSX = await import('xlsx');
          
          const data = e.target?.result;
          let workbook: any;

          if (format === 'csv') {
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Convert to objects with headers
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          const result = rows.map((row, index) => {
            const obj: any = { _rowIndex: index + 2 }; // +2 because we skip header and 0-based
            headers.forEach((header, colIndex) => {
              obj[header] = row[colIndex];
            });
            return obj;
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      if (format === 'csv') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  /**
   * Validate data against rules
   */
  private async validateData(
    data: any[],
    config: ImportConfig,
    operationId: string
  ): Promise<{
    validRecords: any[];
    errors: ImportError[];
    warnings: ImportWarning[];
  }> {
    const validRecords: any[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const rowErrors: ImportError[] = [];
      const rowWarnings: ImportWarning[] = [];

      // Apply field mappings
      if (config.fieldMappings) {
        Object.entries(config.fieldMappings).forEach(([from, to]) => {
          if (record[from] !== undefined) {
            record[to] = record[from];
            delete record[from];
          }
        });
      }

      // Validate against rules
      for (const rule of config.validationRules) {
        const value = record[rule.field];
        const validationResult = this.validateField(value, rule);

        if (!validationResult.isValid) {
          rowErrors.push({
            row: record._rowIndex || i + 1,
            field: rule.field,
            message: validationResult.message || rule.message,
            value,
            severity: 'error'
          });
        }

        if (validationResult.warnings) {
          validationResult.warnings.forEach(warning => {
            rowWarnings.push({
              row: record._rowIndex || i + 1,
              field: rule.field,
              message: warning,
              value
            });
          });
        }
      }

      if (rowErrors.length === 0) {
        validRecords.push(record);
      }

      errors.push(...rowErrors);
      warnings.push(...rowWarnings);

      // Update progress periodically
      if (i % 100 === 0) {
        const progress = this.importProgress.get(operationId);
        if (progress) {
          progress.processedRecords = i + 1;
          this.updateProgress(operationId, progress);
        }
      }
    }

    return { validRecords, errors, warnings };
  }

  /**
   * Validate individual field
   */
  private validateField(value: any, rule: ValidationRule): {
    isValid: boolean;
    message?: string;
    warnings?: string[];
  } {
    const warnings: string[] = [];

    // Handle empty values
    if (value === undefined || value === null || value === '') {
      if (rule.type === 'required') {
        return { isValid: false, message: rule.message };
      }
      return { isValid: true, warnings };
    }

    switch (rule.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return { isValid: false, message: rule.message };
        }
        if (rule.options?.min !== undefined && num < rule.options.min) {
          return { isValid: false, message: `Value must be at least ${rule.options.min}` };
        }
        if (rule.options?.max !== undefined && num > rule.options.max) {
          return { isValid: false, message: `Value must be at most ${rule.options.max}` };
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'enum':
        if (rule.options?.values && !rule.options.values.includes(value)) {
          return { 
            isValid: false, 
            message: `Value must be one of: ${rule.options.values.join(', ')}` 
          };
        }
        break;

      case 'regex':
        if (rule.options?.pattern) {
          const regex = new RegExp(rule.options.pattern);
          if (!regex.test(value)) {
            return { isValid: false, message: rule.message };
          }
        }
        break;

      case 'custom':
        if (rule.options?.customValidator) {
          if (!rule.options.customValidator(value)) {
            return { isValid: false, message: rule.message };
          }
        }
        break;
    }

    return { isValid: true, warnings };
  }

  /**
   * Process data in batches
   */
  private async processDataBatches(
    data: any[],
    config: ImportConfig,
    operationId: string
  ): Promise<{
    created: number;
    updated: number;
    duplicates: number;
    data: any[];
  }> {
    let created = 0;
    let updated = 0;
    let duplicates = 0;
    const processedData: any[] = [];

    const batches = this.chunkArray(data, config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const progress = this.importProgress.get(operationId);
      
      if (progress) {
        progress.currentBatch = i + 1;
        this.updateProgress(operationId, progress);
      }

      try {
        const batchResult = await this.processBatch(batch, config);
        created += batchResult.created;
        updated += batchResult.updated;
        duplicates += batchResult.duplicates;
        processedData.push(...batchResult.data);

        // Update progress
        if (progress) {
          progress.processedRecords += batch.length;
          progress.createdRecords = created;
          progress.updatedRecords = updated;
          progress.duplicateRecords = duplicates;
          this.updateProgress(operationId, progress);
        }

      } catch (error) {
        console.error(`Error processing batch ${i + 1}:`, error);
        // Continue with next batch
      }
    }

    return { created, updated, duplicates, data: processedData };
  }

  /**
   * Process a single batch
   */
  private async processBatch(
    batch: any[],
    config: ImportConfig
  ): Promise<{
    created: number;
    updated: number;
    duplicates: number;
    data: any[];
  }> {
    const endpoint = this.getEntityEndpoint(config.entityType);
    
    try {
      const response = await api.post(`${endpoint}/batch`, {
        data: batch,
        options: {
          skipDuplicates: config.skipDuplicates,
          updateExisting: config.updateExisting
        }
      });

      return response.data;
    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    }
  }

  /**
   * Get data count for export
   */
  private async getDataCount(config: ExportConfig): Promise<number> {
    const endpoint = this.getEntityEndpoint(config.entityType);
    
    try {
      const response = await api.get(`${endpoint}/count`, {
        params: {
          filters: config.filters,
          dateRange: config.dateRange
        }
      });

      return response.data.count;
    } catch (error) {
      console.error('Error getting data count:', error);
      return 0;
    }
  }

  /**
   * Fetch data in batches for export
   */
  private async fetchDataBatches(
    config: ExportConfig,
    operationId: string
  ): Promise<any[]> {
    const endpoint = this.getEntityEndpoint(config.entityType);
    const allData: any[] = [];
    const batchSize = 1000;
    let offset = 0;

    while (true) {
      try {
        const response = await api.get(endpoint, {
          params: {
            limit: batchSize,
            offset,
            fields: config.fields,
            filters: config.filters,
            dateRange: config.dateRange,
            include: config.includeRelated
          }
        });

        const batchData = response.data.data || response.data;
        if (!batchData || batchData.length === 0) {
          break;
        }

        allData.push(...batchData);
        offset += batchSize;

        // Update progress
        const progress = this.exportProgress.get(operationId);
        if (progress) {
          progress.processedRecords = allData.length;
          progress.currentBatch = Math.floor(offset / batchSize);
          this.updateProgress(operationId, progress);
        }

        // Break if we got less than batch size (last batch)
        if (batchData.length < batchSize) {
          break;
        }

      } catch (error) {
        console.error('Error fetching batch:', error);
        break;
      }
    }

    return allData;
  }

  /**
   * Format data for export
   */
  private async formatExportData(data: any[], config: ExportConfig): Promise<any[]> {
    return data.map(record => {
      const formatted: any = {};
      
      config.fields.forEach(field => {
        formatted[field] = this.formatFieldValue(record[field], field);
      });

      return formatted;
    });
  }

  /**
   * Format field value for export
   */
  private formatFieldValue(value: any, field: string): any {
    if (value === null || value === undefined) {
      return '';
    }

    // Format dates
    if (field.includes('date') || field.includes('time') || field.includes('created') || field.includes('updated')) {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return new Date(value).toISOString();
      }
    }

    // Format numbers
    if (typeof value === 'number') {
      return value;
    }

    // Format booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return value;
  }

  /**
   * Generate export file
   */
  private async generateExportFile(
    data: any[],
    config: ExportConfig
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    fileSize: number;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${config.entityType}_export_${timestamp}.${config.format === 'excel' ? 'xlsx' : 'csv'}`;

    let fileBlob: Blob;

    if (config.format === 'csv') {
      const csv = this.convertToCSV(data);
      // Prepend BOM for Excel UTF-8 compatibility
      fileBlob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    } else {
      // Lazy load XLSX solo cuando se necesite
      const XLSX = await import('xlsx');
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, config.entityType);
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      fileBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
    }

    const downloadUrl = URL.createObjectURL(fileBlob);

    return {
      downloadUrl,
      fileName,
      fileSize: fileBlob.size
    };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Get entity endpoint
   */
  private getEntityEndpoint(entityType: string): string {
    const endpoints = {
      products: '/api/products',
      categories: '/api/categories',
      customers: '/api/customers',
      sales: '/api/sales',
      inventory_movements: '/api/inventory/movements'
    };

    return endpoints[entityType as keyof typeof endpoints] || `/api/${entityType}`;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress(operationId: string, progress: ImportProgress | ExportProgress): void {
    const listeners = this.progressListeners.get(operationId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(progress);
        } catch (error) {
          console.error('Error notifying progress listener:', error);
        }
      });
    }
  }
}

// Global instance
export const batchOperationsService = new BatchOperationsService();