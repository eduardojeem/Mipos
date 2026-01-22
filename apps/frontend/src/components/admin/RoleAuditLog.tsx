'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  History, 
  Search, 
  Filter,
  Eye,
  Calendar,
  User,
  Shield,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AuditLogEntry {
  id: string
  roleId: string
  roleName: string
  action: string
  changes: any
  userId: string
  userEmail: string
  userName: string
  timestamp: string
  ipAddress: string
  userAgent: string
}

interface RoleAuditLogProps {
  className?: string
  roleId?: string
}

const actionLabels: Record<string, { label: string; color: string }> = {
  created: { label: 'Creado', color: 'bg-green-500' },
  updated: { label: 'Actualizado', color: 'bg-blue-500' },
  deleted: { label: 'Eliminado', color: 'bg-red-500' },
  activated: { label: 'Activado', color: 'bg-green-500' },
  deactivated: { label: 'Desactivado', color: 'bg-orange-500' },
  cloned: { label: 'Clonado', color: 'bg-purple-500' },
}

export function RoleAuditLog({ className, roleId }: RoleAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [roleId, page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: '50',
        offset: (page * 50).toString()
      })
      
      if (roleId) {
        params.append('roleId', roleId)
      }

      const response = await fetch(`/api/roles/audit?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar logs de auditoría')
      }

      const data = await response.json()
      
      if (page === 0) {
        setLogs(data)
      } else {
        setLogs(prev => [...prev, ...data])
      }
      
      setHasMore(data.length === 50)
    } catch (err: any) {
      setError(err.message || 'Error al cargar logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    
    return matchesSearch && matchesAction
  })

  const formatChanges = (changes: any) => {
    if (!changes) return 'Sin cambios'
    
    if (changes.old && changes.new) {
      const changedFields = Object.keys(changes.new).filter(key => 
        JSON.stringify(changes.old[key]) !== JSON.stringify(changes.new[key])
      )
      
      return changedFields.map(field => {
        const oldValue = changes.old[field]
        const newValue = changes.new[field]
        return `${field}: "${oldValue}" → "${newValue}"`
      }).join(', ')
    }
    
    return JSON.stringify(changes, null, 2)
  }

  if (loading && page === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Registro de Auditoría
          </CardTitle>
          <CardDescription>
            Historial de cambios en roles y permisos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error en Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => loadLogs()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Registro de Auditoría
              {roleId && <Badge variant="outline">Rol específico</Badge>}
            </CardTitle>
            <CardDescription>
              Historial de cambios en roles y permisos
            </CardDescription>
          </div>
          <Button onClick={() => { setPage(0); loadLogs() }} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por rol, usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {Object.entries(actionLabels).map(([action, config]) => (
                <SelectItem key={action} value={action}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay registros de auditoría</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Cambios</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const actionConfig = actionLabels[log.action] || { label: log.action, color: 'bg-gray-500' }
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">
                              {format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: es })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'HH:mm:ss', { locale: es })}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{log.roleName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${actionConfig.color} text-white`}>
                          {actionConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{log.userName || 'Sin nombre'}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {formatChanges(log.changes)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{log.ipAddress}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {hasMore && (
              <div className="text-center">
                <Button
                  onClick={() => setPage(p => p + 1)}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : 'Cargar más'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal de detalles (simplificado) */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
              <CardHeader>
                <CardTitle>Detalles del Registro</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4"
                  onClick={() => setSelectedLog(null)}
                >
                  ×
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <strong>Rol:</strong> {selectedLog.roleName}
                  </div>
                  <div>
                    <strong>Acción:</strong> {actionLabels[selectedLog.action]?.label || selectedLog.action}
                  </div>
                  <div>
                    <strong>Usuario:</strong> {selectedLog.userName} ({selectedLog.userEmail})
                  </div>
                  <div>
                    <strong>Fecha:</strong> {format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                  </div>
                  <div>
                    <strong>IP:</strong> {selectedLog.ipAddress}
                  </div>
                  <div>
                    <strong>User Agent:</strong> 
                    <div className="text-xs text-muted-foreground mt-1 break-all">
                      {selectedLog.userAgent}
                    </div>
                  </div>
                  <div>
                    <strong>Cambios:</strong>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}