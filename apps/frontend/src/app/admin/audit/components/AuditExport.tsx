'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson,
  Settings,
  Calendar,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditExportProps {
  onExport: (options: ExportOptions) => Promise<void>;
  loading: boolean;
  theme: 'light' | 'dark';
}

interface ExportOptions {
  format: 'csv' | 'pdf' | 'json' | 'xlsx';
  dateRange?: {
    start: string;
    end: string;
  };
  fields: string[];
  filters?: any;
  includeDetails: boolean;
  maxRecords?: number;
}

const AVAILABLE_FIELDS = [
  { id: 'createdAt', label: 'Fecha/Hora', required: true },
  { id: 'action', label: 'Acción', required: true },
  { id: 'resource', label: 'Recurso', required: true },
  { id: 'userEmail', label: 'Usuario', required: false },
  { id: 'userRole', label: 'Rol', required: false },
  { id: 'status', label: 'Estado', required: false },
  { id: 'ipAddress', label: 'Dirección IP', required: false },
  { id: 'resourceId', label: 'ID del Recurso', required: false },
  { id: 'userId', label: 'ID del Usuario', required: false },
  { id: 'details', label: 'Detalles Adicionales', required: false },
];

export function AuditExport({ onExport, loading, theme }: AuditExportProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    fields: AVAILABLE_FIELDS.filter(f => f.required).map(f => f.id),
    includeDetails: false,
    maxRecords: 1000
  });

  const handleQuickExport = async (format: 'csv' | 'pdf' | 'json' | 'xlsx') => {
    const options: ExportOptions = {
      format,
      fields: ['createdAt', 'action', 'resource', 'userEmail', 'status', 'ipAddress'],
      includeDetails: false,
      maxRecords: 1000
    };

    try {
      await onExport(options);
    } catch (error) {
      console.error('Error en exportación rápida:', error);
    }
  };

  const handleCustomExport = async () => {
    try {
      await onExport(exportOptions);
      setShowDialog(false);
    } catch (error) {
      console.error('Error en exportación personalizada:', error);
    }
  };

  const toggleField = (fieldId: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
    if (field?.required) return; // No permitir desmarcar campos requeridos

    setExportOptions(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldId)
        ? prev.fields.filter(id => id !== fieldId)
        : [...prev.fields, fieldId]
    }));
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setExportOptions(prev => ({
      ...prev,
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      }
    }));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Exportación Rápida</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar como CSV
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleQuickExport('xlsx')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar como Excel
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleQuickExport('json')}>
            <FileJson className="h-4 w-4 mr-2" />
            Exportar como JSON
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar como PDF
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Exportación Personalizada
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para exportación personalizada */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className={`max-w-2xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Exportación Personalizada
            </DialogTitle>
            <DialogDescription>
              Personaliza los datos y formato de exportación según tus necesidades
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formato de exportación */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Formato de Archivo</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
                  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
                  { value: 'json', label: 'JSON', icon: FileJson },
                  { value: 'pdf', label: 'PDF', icon: FileText },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={exportOptions.format === value ? 'default' : 'outline'}
                    onClick={() => setExportOptions(prev => ({ ...prev, format: value as any }))}
                    className="justify-start"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rango de fechas */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Rango de Fechas
              </Label>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(7)}
                >
                  Últimos 7 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(30)}
                >
                  Últimos 30 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(90)}
                >
                  Últimos 90 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportOptions(prev => ({ ...prev, dateRange: undefined }))}
                >
                  Todos los registros
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha de inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={exportOptions.dateRange?.start || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: {
                        start: e.target.value,
                        end: prev.dateRange?.end || format(new Date(), 'yyyy-MM-dd')
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha de fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={exportOptions.dateRange?.end || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: {
                        start: prev.dateRange?.start || format(new Date(), 'yyyy-MM-dd'),
                        end: e.target.value
                      }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Campos a incluir */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Campos a Incluir
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_FIELDS.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={exportOptions.fields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                      disabled={field.required}
                    />
                    <Label 
                      htmlFor={field.id} 
                      className={`text-sm ${field.required ? 'font-medium' : ''}`}
                    >
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones adicionales */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Opciones Adicionales</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDetails"
                    checked={exportOptions.includeDetails}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeDetails: !!checked }))
                    }
                  />
                  <Label htmlFor="includeDetails" className="text-sm">
                    Incluir detalles adicionales (JSON)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRecords">Límite de registros</Label>
                  <Input
                    id="maxRecords"
                    type="number"
                    min={1}
                    max={50000}
                    value={exportOptions.maxRecords || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      maxRecords: parseInt(e.target.value) || undefined
                    }))}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-gray-500">
                    Máximo recomendado: 10,000 registros para mejor rendimiento
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCustomExport} disabled={loading}>
              {loading ? 'Exportando...' : 'Exportar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}