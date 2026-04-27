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
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-primary" /> : 
      <ArrowDown className="h-4 w-4 text-primary" />;
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
        return <Badge className={`${baseClasses} bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200/50`}>Exitoso</Badge>;
      case 'FAILURE': 
        return <Badge className={`${baseClasses} bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground border-destructive/20`}>Fallido</Badge>;
      default: 
        return <Badge variant="secondary" className={baseClasses}>Pendiente</Badge>;
    }
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (action.startsWith('UPDATE')) return 'bg-primary/10 text-primary';
    if (action.startsWith('DELETE')) return 'bg-destructive/10 text-destructive';
    if (action.startsWith('VIEW')) return 'bg-muted text-muted-foreground';
    return 'bg-secondary text-secondary-foreground';
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
      <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm animate-pulse">
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Cargando registros...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="h-5 w-5 text-primary" />
            Tabla de Registros de Auditoría
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {pagination.total.toLocaleString()} registros encontrados
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No se encontraron registros de auditoría</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabla */}
            <div className="rounded-2xl border border-border/50 overflow-hidden bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-border/50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Fecha/Hora
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors text-foreground font-semibold"
                      onClick={() => handleSort('action')}
                    >
                      <div className="flex items-center gap-2">
                        Acción
                        {getSortIcon('action')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors text-foreground font-semibold"
                      onClick={() => handleSort('resource')}
                    >
                      <div className="flex items-center gap-2">
                        Recurso
                        {getSortIcon('resource')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors text-foreground font-semibold"
                      onClick={() => handleSort('userEmail')}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Usuario
                        {getSortIcon('userEmail')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors text-foreground font-semibold"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Estado
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.map((log) => (
                    <>
                      <TableRow 
                        key={log.id}
                        className="hover:bg-muted/20 transition-colors border-border/40"
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleRowExpansion(log.id)}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {format(parseISO(log.createdAt), 'dd/MM/yyyy', { locale: es })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(log.createdAt), 'HH:mm:ss', { locale: es })}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <Badge variant="outline" className={getActionColor(log.action)}>
                              {formatActionLabel(log.action)}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {log.resource}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground truncate max-w-[200px]">
                              {log.userEmail || 'N/A'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {log.userRole}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.ipAddress}
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Fila expandida con detalles */}
                      {expandedRows.has(log.id) && (
                        <TableRow className="bg-muted/10 border-border/40">
                          <TableCell colSpan={7}>
                            <div className="p-6 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                <div>
                                  <span className="font-semibold text-foreground block mb-1">ID del Registro:</span>
                                  <p className="text-muted-foreground font-mono text-xs break-all opacity-80">
                                    {log.id}
                                  </p>
                                </div>
                                
                                <div>
                                  <span className="font-semibold text-foreground block mb-1">ID del Recurso:</span>
                                  <p className="text-muted-foreground font-mono text-xs break-all opacity-80">
                                    {log.resourceId || 'N/A'}
                                  </p>
                                </div>
                                
                                <div>
                                  <span className="font-semibold text-foreground block mb-1">ID del Usuario:</span>
                                  <p className="text-muted-foreground font-mono text-xs break-all opacity-80">
                                    {log.userId}
                                  </p>
                                </div>
                                
                                <div>
                                  <span className="font-semibold text-foreground block mb-1">Timestamp Completo:</span>
                                  <p className="text-muted-foreground font-mono text-xs opacity-80">
                                    {format(parseISO(log.createdAt), 'dd/MM/yyyy HH:mm:ss.SSS', { locale: es })}
                                  </p>
                                </div>
                              </div>

                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="pt-2">
                                  <span className="font-semibold text-foreground mb-2 block">Detalles Adicionales:</span>
                                  <div className="p-4 bg-muted/40 border border-border/30 rounded-xl text-xs overflow-x-auto">
                                    <pre className="text-muted-foreground whitespace-pre-wrap font-mono">
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Mostrando</span>
                  <span className="font-semibold text-foreground">
                    {((pagination.page - 1) * pagination.limit) + 1}
                  </span>
                  <span>-</span>
                  <span className="font-semibold text-foreground">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  <span>de</span>
                  <span className="font-semibold text-foreground">{pagination.total.toLocaleString()}</span>
                  <span>registros</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={pagination.page === 1}
                    onClick={() => goToPage(1)}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={pagination.page === 1}
                    onClick={() => goToPage(pagination.page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">Página</span>
                    <Input
                      className="h-7 w-12 text-center text-xs p-0 border-none bg-transparent focus-visible:ring-0"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pagination.page}
                      onChange={(e) => {
                        const page = parseInt(e.target.value) || 1;
                        goToPage(page);
                      }}
                    />
                    <span className="text-xs font-medium text-muted-foreground">de {totalPages}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={pagination.page >= totalPages}
                    onClick={() => goToPage(pagination.page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
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