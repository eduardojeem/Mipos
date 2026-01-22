'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  User,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditTableProps {
  logs: any[];
  loading: boolean;
  pagination: any;
  onPaginationChange: (pagination: any) => void;
  theme: 'light' | 'dark';
}

type SortField = 'createdAt' | 'action' | 'resource' | 'userEmail' | 'status';
type SortDirection = 'asc' | 'desc';

export function AuditTable({ 
  logs, 
  loading, 
  pagination, 
  onPaginationChange, 
  theme 
}: AuditTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-blue-500" /> : 
      <ArrowDown className="h-4 w-4 text-blue-500" />;
  };

  const sortedLogs = [...logs].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILURE': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-xs font-medium";
    switch (status) {
      case 'SUCCESS': 
        return <Badge className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>Exitoso</Badge>;
      case 'FAILURE': 
        return <Badge className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`}>Fallido</Badge>;
      default: 
        return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>Pendiente</Badge>;
    }
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (action.startsWith('UPDATE')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (action.startsWith('VIEW')) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  };

  const formatActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const goToPage = (page: number) => {
    onPaginationChange({ ...pagination, page: Math.max(1, Math.min(totalPages, page)) });
  };

  if (loading) {
    return (
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando registros...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Tabla de Registros de Auditoría
          </CardTitle>
          <span className="text-sm text-gray-500">
            {pagination.total.toLocaleString()} registros encontrados
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No se encontraron registros de auditoría</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabla */}
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'border-gray-700' : ''}>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fecha/Hora
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort('action')}
                    >
                      <div className="flex items-center gap-2">
                        Acción
                        {getSortIcon('action')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort('resource')}
                    >
                      <div className="flex items-center gap-2">
                        Recurso
                        {getSortIcon('resource')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort('userEmail')}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Usuario
                        {getSortIcon('userEmail')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Estado
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.map((log) => (
                    <>
                      <TableRow 
                        key={log.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          theme === 'dark' ? 'border-gray-700' : ''
                        }`}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(log.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(parseISO(log.createdAt), 'dd/MM/yyyy', { locale: es })}
                            </span>
                            <span className="text-sm text-gray-500">
                              {format(parseISO(log.createdAt), 'HH:mm:ss', { locale: es })}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <Badge className={getActionColor(log.action)}>
                              {formatActionLabel(log.action)}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline">
                            {log.resource}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">
                              {log.userEmail || 'N/A'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {log.userRole}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        
                        <TableCell>
                          <span className="font-mono text-xs">
                            {log.ipAddress}
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Fila expandida con detalles */}
                      {expandedRows.has(log.id) && (
                        <TableRow className={theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'bg-gray-50'}>
                          <TableCell colSpan={7}>
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">ID del Registro:</span>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                                    {log.id}
                                  </p>
                                </div>
                                
                                <div>
                                  <span className="font-medium">ID del Recurso:</span>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                                    {log.resourceId || 'N/A'}
                                  </p>
                                </div>
                                
                                <div>
                                  <span className="font-medium">ID del Usuario:</span>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                                    {log.userId}
                                  </p>
                                </div>
                                
                                <div>
                                  <span className="font-medium">Timestamp Completo:</span>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                                    {format(parseISO(log.createdAt), 'dd/MM/yyyy HH:mm:ss.SSS', { locale: es })}
                                  </p>
                                </div>
                              </div>

                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <span className="font-medium mb-2 block">Detalles Adicionales:</span>
                                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                                    <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {pagination.total > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Mostrando</span>
                  <span className="font-medium">
                    {((pagination.page - 1) * pagination.limit) + 1}
                  </span>
                  <span>-</span>
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  <span>de</span>
                  <span className="font-medium">{pagination.total.toLocaleString()}</span>
                  <span>registros</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => goToPage(1)}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => goToPage(pagination.page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Página</span>
                    <Input
                      className="w-16 text-center"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pagination.page}
                      onChange={(e) => {
                        const page = parseInt(e.target.value) || 1;
                        goToPage(page);
                      }}
                    />
                    <span className="text-sm">de {totalPages}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= totalPages}
                    onClick={() => goToPage(pagination.page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= totalPages}
                    onClick={() => goToPage(totalPages)}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}