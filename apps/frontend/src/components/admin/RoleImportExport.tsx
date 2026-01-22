'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roleService } from '@/lib/services/role-service'
import { 
  Download, 
  Upload, 
  FileText, 
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface RoleImportExportProps {
  className?: string
  onImportComplete?: () => void
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function RoleImportExport({ className, onImportComplete }: RoleImportExportProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      setExportLoading(true)
      const blob = await roleService.exportRoles(exportFormat)
      
      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roles-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Error exporting roles:', error)
      // Aquí podrías mostrar un toast de error
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async (file: File) => {
    try {
      setImportLoading(true)
      setImportResult(null)
      setImportProgress(0)

      // Simular progreso
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await roleService.importRoles(file)
      
      clearInterval(progressInterval)
      setImportProgress(100)
      setImportResult(result)
      
      if (result.success > 0 && onImportComplete) {
        onImportComplete()
      }
    } catch (error: any) {
      console.error('Error importing roles:', error)
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error.message || 'Error al importar archivo']
      })
    } finally {
      setImportLoading(false)
      setTimeout(() => setImportProgress(0), 2000)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImport(file)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar / Importar Roles
        </CardTitle>
        <CardDescription>
          Respalda o restaura la configuración de roles y permisos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sección de Exportación */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Exportar Roles</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Descarga la configuración actual de roles y permisos
            </p>
          </div>

          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">Formato</Label>
              <Select value={exportFormat} onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={exportLoading}
              className="flex items-center gap-2"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportLoading ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>JSON:</strong> Formato completo con todos los datos y metadatos<br />
            <strong>CSV:</strong> Formato simplificado para análisis en hojas de cálculo
          </div>
        </div>

        <div className="border-t pt-6">
          {/* Sección de Importación */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Importar Roles</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Restaura roles desde un archivo de respaldo (solo formato JSON)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={triggerFileSelect}
                  disabled={importLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {importLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {importLoading ? 'Importando...' : 'Seleccionar Archivo'}
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {importLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Procesando archivo...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}

              {importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <Badge variant="default" className="bg-green-600">
                        {importResult.success} Exitosos
                      </Badge>
                    </div>
                    
                    {importResult.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <Badge variant="destructive">
                          {importResult.failed} Fallidos
                        </Badge>
                      </div>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Errores encontrados:
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <ul className="text-sm space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="text-red-700">
                              • {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {importResult.success > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Se importaron {importResult.success} roles exitosamente
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>Importante:</strong></div>
              <div>• Solo se aceptan archivos JSON exportados desde este sistema</div>
              <div>• Los roles existentes con el mismo nombre serán omitidos</div>
              <div>• Los permisos inexistentes serán ignorados</div>
              <div>• La operación no puede deshacerse</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}