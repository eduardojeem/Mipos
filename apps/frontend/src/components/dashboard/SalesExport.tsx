'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File,
  Calendar,
  Filter,
  Settings,
  CheckCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Sale {
  id: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: string;
  date: string;
  notes?: string;
}

interface SalesExportProps {
  sales: Sale[];
  onExport: (format: string, options: ExportOptions) => void;
  loading?: boolean;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    from: string;
    to: string;
  };
  includeFields: string[];
  groupBy?: string;
  summary: boolean;
  filters: {
    paymentMethod?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  };
}

const SalesExport: React.FC<SalesExportProps> = ({ sales, onExport, loading = false }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    dateRange: {
      from: '',
      to: ''
    },
    includeFields: ['id', 'customer', 'total', 'paymentMethod', 'status', 'date'],
    groupBy: '',
    summary: true,
    filters: {}
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableFields = [
    { id: 'id', label: 'ID de Venta', required: true },
    { id: 'customer', label: 'Cliente' },
    { id: 'items', label: 'Cantidad de Items' },
    { id: 'total', label: 'Total' },
    { id: 'paymentMethod', label: 'Método de Pago' },
    { id: 'status', label: 'Estado' },
    { id: 'date', label: 'Fecha' },
    { id: 'notes', label: 'Notas' }
  ];

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field?.required) return; // No permitir desmarcar campos requeridos

    setExportOptions(prev => ({
      ...prev,
      includeFields: checked 
        ? [...prev.includeFields, fieldId]
        : prev.includeFields.filter(id => id !== fieldId)
    }));
  };

  const handleExport = () => {
    onExport(exportOptions.format, exportOptions);
  };

  const getExportIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      case 'csv': return <File className="h-4 w-4" />;
      default: return <Download className="h-4 w-4" />;
    }
  };

  const getFilteredSalesCount = () => {
    let filtered = sales;
    
    if (exportOptions.dateRange.from) {
      filtered = filtered.filter(sale => sale.date >= exportOptions.dateRange.from);
    }
    
    if (exportOptions.dateRange.to) {
      filtered = filtered.filter(sale => sale.date <= exportOptions.dateRange.to);
    }
    
    if (exportOptions.filters.paymentMethod) {
      filtered = filtered.filter(sale => sale.paymentMethod === exportOptions.filters.paymentMethod);
    }
    
    if (exportOptions.filters.status) {
      filtered = filtered.filter(sale => sale.status === exportOptions.filters.status);
    }
    
    if (exportOptions.filters.minAmount !== undefined) {
      filtered = filtered.filter(sale => sale.total >= exportOptions.filters.minAmount!);
    }
    
    if (exportOptions.filters.maxAmount !== undefined) {
      filtered = filtered.filter(sale => sale.total <= exportOptions.filters.maxAmount!);
    }
    
    return filtered.length;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar Datos de Ventas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formato de Exportación */}
        <div className="space-y-2">
          <Label>Formato de Exportación</Label>
          <div className="flex gap-2">
            {[
              { value: 'excel', label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4" /> },
              { value: 'pdf', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
              { value: 'csv', label: 'CSV', icon: <File className="h-4 w-4" /> }
            ].map((format) => (
              <Button
                key={format.value}
                variant={exportOptions.format === format.value ? 'default' : 'outline'}
                onClick={() => setExportOptions(prev => ({ ...prev, format: format.value as any }))}
                className="flex items-center gap-2"
              >
                {format.icon}
                {format.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha Desde</Label>
            <Input
              type="date"
              value={exportOptions.dateRange.from}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, from: e.target.value }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha Hasta</Label>
            <Input
              type="date"
              value={exportOptions.dateRange.to}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, to: e.target.value }
              }))}
            />
          </div>
        </div>

        {/* Campos a Incluir */}
        <div className="space-y-2">
          <Label>Campos a Incluir</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableFields.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={exportOptions.includeFields.includes(field.id)}
                  onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                  disabled={field.required}
                />
                <Label htmlFor={field.id} className="text-sm">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Opciones Avanzadas */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 p-0 h-auto"
          >
            <Settings className="h-4 w-4" />
            Opciones Avanzadas
          </Button>
          
          {showAdvanced && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              {/* Agrupar Por */}
              <div className="space-y-2">
                <Label>Agrupar Por</Label>
                <Select
                  value={exportOptions.groupBy}
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, groupBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin agrupación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin agrupación</SelectItem>
                    <SelectItem value="paymentMethod">Método de Pago</SelectItem>
                    <SelectItem value="status">Estado</SelectItem>
                    <SelectItem value="date">Fecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Incluir Resumen */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={exportOptions.summary}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, summary: checked as boolean }))}
                />
                <Label htmlFor="summary">Incluir resumen estadístico</Label>
              </div>

              {/* Filtros Adicionales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Mínimo</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={exportOptions.filters.minAmount || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      filters: { ...prev.filters, minAmount: parseFloat(e.target.value) || undefined }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto Máximo</Label>
                  <Input
                    type="number"
                    placeholder="999999.99"
                    value={exportOptions.filters.maxAmount || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      filters: { ...prev.filters, maxAmount: parseFloat(e.target.value) || undefined }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen de Exportación */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Resumen de Exportación</span>
          </div>
          <div className="text-sm text-blue-800 space-y-1">
            <div>Formato: <Badge variant="secondary">{exportOptions.format.toUpperCase()}</Badge></div>
            <div>Registros a exportar: <Badge variant="secondary">{getFilteredSalesCount()}</Badge></div>
            <div>Campos incluidos: <Badge variant="secondary">{exportOptions.includeFields.length}</Badge></div>
            {exportOptions.groupBy && (
              <div>Agrupado por: <Badge variant="secondary">{exportOptions.groupBy}</Badge></div>
            )}
          </div>
        </div>

        {/* Botón de Exportación */}
        <Button 
          onClick={handleExport}
          disabled={loading || getFilteredSalesCount() === 0}
          className="w-full flex items-center gap-2"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Exportando...
            </>
          ) : (
            <>
              {getExportIcon(exportOptions.format)}
              Exportar {getFilteredSalesCount()} Registros
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SalesExport;