/**
 * Import Wizard Component
 * Provides a step-by-step interface for importing CSV/Excel files
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  batchOperationsService, 
  ImportConfig, 
  ImportProgress, 
  ImportResult,
  ValidationRule 
} from '@/lib/import-export/batch-operations';
import { cn } from '@/lib/utils';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react';

interface ImportWizardProps {
  entityType: 'products' | 'categories' | 'customers' | 'sales' | 'inventory_movements';
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
  className?: string;
}

interface ImportStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function ImportWizard({ 
  entityType, 
  onComplete, 
  onCancel, 
  className 
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [config, setConfig] = useState<ImportConfig>({
    entityType,
    format: 'csv',
    validationRules: getDefaultValidationRules(entityType),
    batchSize: 100,
    skipDuplicates: true,
    updateExisting: false
  });
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: ImportStep[] = [
    {
      id: 'upload',
      title: 'Upload File',
      description: 'Select your CSV or Excel file',
      completed: !!file
    },
    {
      id: 'configure',
      title: 'Configure Import',
      description: 'Set validation rules and options',
      completed: false
    },
    {
      id: 'preview',
      title: 'Preview & Validate',
      description: 'Review data before importing',
      completed: false
    },
    {
      id: 'import',
      title: 'Import Data',
      description: 'Process and import your data',
      completed: !!result?.success
    }
  ];

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    
    // Auto-detect format
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension === 'xlsx' || extension === 'xls') {
      setConfig(prev => ({ ...prev, format: 'excel' }));
    } else {
      setConfig(prev => ({ ...prev, format: 'csv' }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const startImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setCurrentStep(3);

    try {
      const importResult = await batchOperationsService.importData(
        file,
        config,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setResult(importResult);
      
      if (onComplete) {
        onComplete(importResult);
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = getTemplateData(entityType);
    const csv = convertToCSV(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = () => {
    if (!result?.progress.errors.length) return;

    const errorData = result.progress.errors.map(error => ({
      Row: error.row,
      Field: error.field || 'General',
      Error: error.message,
      Value: error.value || ''
    }));

    const csv = convertToCSV(errorData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload {entityType} Data
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select a CSV or Excel file containing your {entityType} data
        </p>
        
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 mb-6"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </button>
      </div>

      <div
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors",
          file && "border-green-300 bg-green-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {file ? (
          <div className="space-y-2">
            <FileText className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">
              Drag and drop your file here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supports CSV and Excel files up to 10MB
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            handleFileSelect(selectedFile);
          }
        }}
        className="hidden"
      />
    </div>
  );

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Import Configuration
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Batch Size
          </label>
          <input
            type="number"
            value={config.batchSize}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              batchSize: parseInt(e.target.value) || 100 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="1000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of records to process at once
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Format
          </label>
          <select
            value={config.format}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              format: e.target.value as 'csv' | 'excel' 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="skipDuplicates"
            checked={config.skipDuplicates}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              skipDuplicates: e.target.checked 
            }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="skipDuplicates" className="ml-2 text-sm text-gray-700">
            Skip duplicate records
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="updateExisting"
            checked={config.updateExisting}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              updateExisting: e.target.checked 
            }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="updateExisting" className="ml-2 text-sm text-gray-700">
            Update existing records
          </label>
        </div>
      </div>
    </div>
  );

  const renderProgressStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Importing Data
        </h3>
        <p className="text-sm text-gray-500">
          Please wait while we process your data...
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
              progress.status === 'processing' && "bg-blue-100 text-blue-800",
              progress.status === 'validating' && "bg-yellow-100 text-yellow-800"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {progress.totalRecords}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {progress.validRecords}
              </div>
              <div className="text-sm text-gray-500">Valid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {progress.invalidRecords}
              </div>
              <div className="text-sm text-gray-500">Invalid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.createdRecords}
              </div>
              <div className="text-sm text-gray-500">Created</div>
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

  const renderResultStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        {result?.success ? (
          <div className="space-y-2">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">
              Import Completed Successfully
            </h3>
            <p className="text-sm text-gray-500">
              Your data has been imported successfully
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">
              Import Failed
            </h3>
            <p className="text-sm text-gray-500">
              There were errors during the import process
            </p>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Import Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Processed:</span>
              <span className="ml-2 font-medium">{result.summary.totalProcessed}</span>
            </div>
            <div>
              <span className="text-gray-500">Successful:</span>
              <span className="ml-2 font-medium text-green-600">{result.summary.successful}</span>
            </div>
            <div>
              <span className="text-gray-500">Failed:</span>
              <span className="ml-2 font-medium text-red-600">{result.summary.failed}</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 font-medium text-blue-600">{result.summary.created}</span>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <span className="ml-2 font-medium text-yellow-600">{result.summary.updated}</span>
            </div>
            <div>
              <span className="text-gray-500">Duplicates:</span>
              <span className="ml-2 font-medium text-gray-600">{result.summary.duplicates}</span>
            </div>
          </div>
        </div>
      )}

      {result?.progress?.errors?.length && result.progress.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-red-800">
              Errors ({result.progress.errors.length})
            </h4>
            <button
              onClick={downloadErrorReport}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Download Error Report
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {result.progress && result.progress.errors.slice(0, 5).map((error, index) => (
              <div key={index} className="text-sm text-red-700 mb-1">
                Row {error.row}: {error.message}
              </div>
            ))}
            {result.progress && result.progress.errors.length > 5 && (
              <div className="text-sm text-red-600 font-medium">
                ... and {result.progress.errors.length - 5} more errors
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
          </h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li key={step.id} className={cn(
                "relative",
                index !== steps.length - 1 && "pr-8 sm:pr-20"
              )}>
                {index !== steps.length - 1 && (
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="h-0.5 w-full bg-gray-200" />
                  </div>
                )}
                <div className={cn(
                  "relative w-8 h-8 flex items-center justify-center rounded-full border-2",
                  currentStep > index || step.completed
                    ? "bg-blue-600 border-blue-600"
                    : currentStep === index
                    ? "border-blue-600 bg-white"
                    : "border-gray-300 bg-white"
                )}>
                  {currentStep > index || step.completed ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <span className={cn(
                      "text-sm font-medium",
                      currentStep === index ? "text-blue-600" : "text-gray-500"
                    )}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className={cn(
                    "text-sm font-medium",
                    currentStep >= index ? "text-gray-900" : "text-gray-500"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.description}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        {currentStep === 0 && renderUploadStep()}
        {currentStep === 1 && renderConfigureStep()}
        {currentStep === 2 && renderProgressStep()}
        {currentStep === 3 && renderResultStep()}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0 || isProcessing}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="space-x-2">
          {currentStep < 2 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 0 && !file) ||
                (currentStep === 1 && !config.validationRules.length)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}

          {currentStep === 2 && !result && (
            <button
              onClick={startImport}
              disabled={!file || isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Importing...' : 'Start Import'}
            </button>
          )}

          {result && (
            <button
              onClick={() => {
                setCurrentStep(0);
                setFile(null);
                setResult(null);
                setProgress(null);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Import Another File
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultValidationRules(entityType: string): ValidationRule[] {
  const commonRules = [
    { field: 'name', type: 'required' as const, message: 'Name is required' }
  ];

  switch (entityType) {
    case 'products':
      return [
        ...commonRules,
        { field: 'price', type: 'number' as const, message: 'Price must be a valid number' },
        { field: 'category_id', type: 'required' as const, message: 'Category is required' }
      ];
    case 'customers':
      return [
        ...commonRules,
        { field: 'email', type: 'email' as const, message: 'Valid email is required' }
      ];
    default:
      return commonRules;
  }
}

function getTemplateData(entityType: string): any[] {
  switch (entityType) {
    case 'products':
      return [
        { name: 'Sample Product', price: 10.99, category_id: 1, description: 'Sample description' }
      ];
    case 'customers':
      return [
        { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' }
      ];
    default:
      return [{ name: 'Sample Item' }];
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}