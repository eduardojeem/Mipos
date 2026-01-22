/**
 * Export Wizard Component
 * Provides interface for exporting data to CSV/Excel with filtering and formatting options
 */

import React, { useState, useCallback } from 'react';
import { 
  batchOperationsService, 
  ExportConfig, 
  ExportProgress, 
  ExportResult 
} from '@/lib/import-export/batch-operations';
import { cn } from '@/lib/utils';
import { Download, FileText, Settings, Filter, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface ExportWizardProps {
  entityType: 'products' | 'categories' | 'customers' | 'sales' | 'inventory_movements';
  onComplete?: (result: ExportResult) => void;
  onCancel?: () => void;
  className?: string;
}

interface FilterOption {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
}

export function ExportWizard({ 
  entityType, 
  onComplete, 
  onCancel, 
  className 
}: ExportWizardProps) {
  const [config, setConfig] = useState<ExportConfig>({
    entityType,
    format: 'csv',
    includeHeaders: true,
    dateFormat: 'YYYY-MM-DD',
    filters: {},
    fields: getDefaultFields(entityType),
    batchSize: 1000
  });
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'format' | 'filters' | 'fields'>('format');

  const filterOptions = getFilterOptions(entityType);

  const startExport = async () => {
    setIsExporting(true);
    setProgress(null);
    setResult(null);

    try {
      const exportResult = await batchOperationsService.exportData(
        config,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setResult(exportResult);
      
      if (exportResult.success && exportResult.downloadUrl) {
        // Auto-download the file
        const a = document.createElement('a');
        a.href = exportResult.downloadUrl;
        a.download = exportResult.filename || `${entityType}_export.${config.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      if (onComplete) {
        onComplete(exportResult);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setResult({
        success: false,
        filename: '',
        downloadUrl: '',
        summary: {
          totalRecords: 0,
          exportedRecords: 0,
          skippedRecords: 0,
          fileSize: 0
        },
        progress: {
          status: 'error',
          totalRecords: 0,
          processedRecords: 0,
          currentBatch: 0,
          totalBatches: 0,
          startTime: Date.now(),
          endTime: Date.now(),
        }
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updateFilter = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value
      }
    }));
  };

  const toggleField = (field: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields?.includes(field)
        ? prev.fields.filter(f => f !== field)
        : [...(prev.fields || []), field]
    }));
  };

  const renderFormatTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Format
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={config.format === 'csv'}
                onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as 'csv' | 'excel' }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">CSV (.csv)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="excel"
                checked={config.format === 'excel'}
                onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as 'csv' | 'excel' }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Excel (.xlsx)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format
          </label>
          <select
            value={config.dateFormat}
            onChange={(e) => setConfig(prev => ({ ...prev, dateFormat: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeHeaders"
            checked={config.includeHeaders}
            onChange={(e) => setConfig(prev => ({ ...prev, includeHeaders: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="includeHeaders" className="ml-2 text-sm text-gray-700">
            Include column headers
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Batch Size
          </label>
          <input
            type="number"
            value={config.batchSize}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              batchSize: parseInt(e.target.value) || 1000 
            }))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="100"
            max="10000"
            step="100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Records to process per batch
          </p>
        </div>
      </div>
    </div>
  );

  const renderFiltersTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Filters</h3>
        <p className="text-sm text-gray-500 mb-4">
          Apply filters to export only specific data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filterOptions.map((option) => (
          <div key={option.field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {option.label}
            </label>
            
            {option.type === 'text' && (
              <input
                type="text"
                value={config.filters?.[option.field] || ''}
                onChange={(e) => updateFilter(option.field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Filter by ${option.label.toLowerCase()}`}
              />
            )}

            {option.type === 'number' && (
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={config.filters?.[`${option.field}_min`] || ''}
                  onChange={(e) => updateFilter(`${option.field}_min`, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={config.filters?.[`${option.field}_max`] || ''}
                  onChange={(e) => updateFilter(`${option.field}_max`, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Max"
                />
              </div>
            )}

            {option.type === 'date' && (
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={config.filters?.[`${option.field}_from`] || ''}
                  onChange={(e) => updateFilter(`${option.field}_from`, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={config.filters?.[`${option.field}_to`] || ''}
                  onChange={(e) => updateFilter(`${option.field}_to`, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {option.type === 'select' && option.options && (
              <select
                value={config.filters?.[option.field] || ''}
                onChange={(e) => updateFilter(option.field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All {option.label.toLowerCase()}</option>
                {option.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {Object.keys(config.filters || {}).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Active Filters</h4>
          <div className="space-y-1">
            {Object.entries(config.filters || {}).map(([key, value]) => {
              if (!value) return null;
              return (
                <div key={key} className="text-sm text-blue-700">
                  <span className="font-medium">{key}:</span> {value}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, filters: {} }))}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  const renderFieldsTab = () => {
    const availableFields = getAvailableFields(entityType);
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Fields</h3>
          <p className="text-sm text-gray-500 mb-4">
            Choose which fields to include in the export
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {config.fields?.length || 0} of {availableFields.length} fields selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setConfig(prev => ({ ...prev, fields: availableFields.map(f => f.key) }))}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, fields: [] }))}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableFields.map((field) => (
            <label key={field.key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={config.fields?.includes(field.key) || false}
                onChange={() => toggleField(field.key)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{field.label}</div>
                {field.description && (
                  <div className="text-xs text-gray-500">{field.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderProgress = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Exporting Data
        </h3>
        <p className="text-sm text-gray-500">
          Please wait while we prepare your export...
        </p>
      </div>

      {progress && (
        <div className="space-y-4">
          {/* Status */}
          <div className="text-center">
            <div className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
              progress.status === 'completed' && "bg-green-100 text-green-800",
              progress.status === 'error' && "bg-red-100 text-red-800",
              (progress.status === 'fetching' || progress.status === 'formatting' || progress.status === 'generating') && "bg-blue-100 text-blue-800",
              progress.status === 'preparing' && "bg-yellow-100 text-yellow-800"
            )}>
              {progress.status === 'completed' && <CheckCircle className="w-4 h-4 mr-1" />}
              {progress.status === 'error' && <AlertCircle className="w-4 h-4 mr-1" />}
              {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.processedRecords / progress.totalRecords) * 100}%`
              }}
            />
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {progress.totalRecords}
              </div>
              <div className="text-sm text-gray-500">Total Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.processedRecords}
              </div>
              <div className="text-sm text-gray-500">Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((progress.processedRecords / progress.totalRecords) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>

          {/* Batch Progress */}
          {progress.totalBatches > 1 && (
            <div className="text-center text-sm text-gray-500">
              Batch {progress.currentBatch} of {progress.totalBatches}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderResult = () => (
    <div className="space-y-6">
      <div className="text-center">
        {result?.success ? (
          <div className="space-y-2">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">
              Export Completed Successfully
            </h3>
            <p className="text-sm text-gray-500">
              Your data has been exported and downloaded
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">
              Export Failed
            </h3>
            <p className="text-sm text-gray-500">
              There was an error during the export process
            </p>
          </div>
        )}
      </div>

          {result && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Export Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Records:</span>
                  <span className="ml-2 font-medium">{result?.summary?.totalRecords}</span>
                </div>
                <div>
                  <span className="text-gray-500">Exported:</span>
                  <span className="ml-2 font-medium text-green-600">{result?.summary?.exportedRecords}</span>
                </div>
                <div>
                  <span className="text-gray-500">Skipped:</span>
                  <span className="ml-2 font-medium text-yellow-600">{result?.summary?.skippedRecords}</span>
                </div>
                <div>
                  <span className="text-gray-500">File Size:</span>
                  <span className="ml-2 font-medium">{formatFileSize(result?.summary?.fileSize || 0)}</span>
                </div>
              </div>
              
              {result.filename && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">File:</span>
                    <span className="text-sm font-medium text-gray-900">{result.filename}</span>
                  </div>
                </div>
              )}
            </div>
          )}

      {result?.downloadUrl && (
        <div className="text-center">
          <a
            href={result.downloadUrl}
            download={result.fileName}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Again
          </a>
        </div>
      )}
    </div>
  );

  if (isExporting || result) {
    return (
      <div className={cn("max-w-2xl mx-auto", className)}>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {isExporting && renderProgress()}
          {result && renderResult()}
        </div>
        
        {result && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setResult(null);
                setProgress(null);
                setIsExporting(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Export Again
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Export {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure and export your data to CSV or Excel format
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'format', label: 'Format', icon: FileText },
            { id: 'filters', label: 'Filters', icon: Filter },
            { id: 'fields', label: 'Fields', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        {activeTab === 'format' && renderFormatTab()}
        {activeTab === 'filters' && renderFiltersTab()}
        {activeTab === 'fields' && renderFieldsTab()}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <div className="text-sm text-gray-500">
          {config.fields?.length || 0} fields selected
          {Object.keys(config.filters || {}).length > 0 && 
            `, ${Object.keys(config.filters || {}).length} filters applied`
          }
        </div>

        <button
          onClick={startExport}
          disabled={!config.fields?.length || isExporting}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Start Export'}
        </button>
      </div>
    </div>
  );
}

// Helper functions
function getFilterOptions(entityType: string): FilterOption[] {
  const commonOptions = [
    { field: 'name', label: 'Name', type: 'text' as const },
    { field: 'created_at', label: 'Created Date', type: 'date' as const }
  ];

  switch (entityType) {
    case 'products':
      return [
        ...commonOptions,
        { field: 'price', label: 'Price', type: 'number' as const },
        { field: 'category_id', label: 'Category', type: 'select' as const, options: [] }
      ];
    case 'sales':
      return [
        { field: 'total', label: 'Total Amount', type: 'number' as const },
        { field: 'created_at', label: 'Sale Date', type: 'date' as const },
        { field: 'customer_id', label: 'Customer', type: 'select' as const, options: [] }
      ];
    default:
      return commonOptions;
  }
}

function getAvailableFields(entityType: string): { key: string; label: string; description?: string }[] {
  const commonFields = [
    { key: 'id', label: 'ID', description: 'Unique identifier' },
    { key: 'created_at', label: 'Created Date', description: 'When the record was created' },
    { key: 'updated_at', label: 'Updated Date', description: 'When the record was last updated' }
  ];

  switch (entityType) {
    case 'products':
      return [
        { key: 'name', label: 'Name', description: 'Product name' },
        { key: 'description', label: 'Description', description: 'Product description' },
        { key: 'price', label: 'Price', description: 'Product price' },
        { key: 'category_id', label: 'Category ID', description: 'Category identifier' },
        { key: 'stock_quantity', label: 'Stock Quantity', description: 'Current stock level' },
        ...commonFields
      ];
    case 'customers':
      return [
        { key: 'name', label: 'Name', description: 'Customer name' },
        { key: 'email', label: 'Email', description: 'Customer email address' },
        { key: 'phone', label: 'Phone', description: 'Customer phone number' },
        { key: 'address', label: 'Address', description: 'Customer address' },
        ...commonFields
      ];
    case 'sales':
      return [
        { key: 'total', label: 'Total Amount', description: 'Sale total amount' },
        { key: 'customer_id', label: 'Customer ID', description: 'Customer identifier' },
        { key: 'payment_method', label: 'Payment Method', description: 'How the sale was paid' },
        { key: 'status', label: 'Status', description: 'Sale status' },
        ...commonFields
      ];
    default:
      return [
        { key: 'name', label: 'Name', description: 'Item name' },
        ...commonFields
      ];
  }
}

function getDefaultFields(entityType: string): string[] {
  const fields = getAvailableFields(entityType);
  // Return all fields except ID by default
  return fields.filter(f => f.key !== 'id').map(f => f.key);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}