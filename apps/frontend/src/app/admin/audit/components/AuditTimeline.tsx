'use client'

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  Activity, 
  Database,
  ZoomIn,
  ZoomOut,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditTimelineProps {
  logs: any[];
  loading: boolean;
  theme: 'light' | 'dark';
  fullView?: boolean;
}

interface TimelineGroup {
  date: string;
  displayDate: string;
  logs: any[];
  count: number;
}

export function AuditTimeline({ logs, loading, theme, fullView = false }: AuditTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<'hour' | 'day' | 'week'>('day');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  // Agrupar logs por fecha
  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: TimelineGroup } = {};

    logs.forEach(log => {
      const date = parseISO(log.createdAt);
      let groupKey: string;
      let displayDate: string;

      switch (zoomLevel) {
        case 'hour':
          groupKey = format(date, 'yyyy-MM-dd-HH');
          displayDate = format(date, 'dd/MM/yyyy HH:00', { locale: es });
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = format(weekStart, 'yyyy-MM-dd');
          displayDate = `Semana del ${format(weekStart, 'dd/MM/yyyy', { locale: es })}`;
          break;
        default: // day
          groupKey = format(date, 'yyyy-MM-dd');
          if (isToday(date)) {
            displayDate = 'Hoy';
          } else if (isYesterday(date)) {
            displayDate = 'Ayer';
          } else {
            displayDate = format(date, 'dd/MM/yyyy', { locale: es });
          }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          date: groupKey,
          displayDate,
          logs: [],
          count: 0
        };
      }

      groups[groupKey].logs.push(log);
      groups[groupKey].count++;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, zoomLevel]);

  // Tipos de eventos únicos
  const eventTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.action));
    return Array.from(types);
  }, [logs]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleEventType = (type: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILURE': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
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

  // Filtrar logs por tipos seleccionados
  const filteredGroupedLogs = useMemo(() => {
    if (selectedTypes.size === 0) return groupedLogs;
    
    return groupedLogs.map(group => ({
      ...group,
      logs: group.logs.filter(log => selectedTypes.has(log.action)),
      count: group.logs.filter(log => selectedTypes.has(log.action)).length
    })).filter(group => group.count > 0);
  }, [groupedLogs, selectedTypes]);

  if (loading) {
    return (
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles del timeline */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline de Eventos
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={zoomLevel === 'hour' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel('hour')}
                >
                  Hora
                </Button>
                <Button
                  variant={zoomLevel === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel('day')}
                >
                  Día
                </Button>
                <Button
                  variant={zoomLevel === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel('week')}
                >
                  Semana
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros de tipo de evento */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Filter className="h-4 w-4" />
              Filtrar por tipo de evento
            </label>
            <div className="flex gap-2 flex-wrap">
              {eventTypes.map(type => (
                <Button
                  key={type}
                  variant={selectedTypes.has(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleEventType(type)}
                  className="text-xs"
                >
                  {formatActionLabel(type)}
                </Button>
              ))}
              {selectedTypes.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes(new Set())}
                  className="text-xs"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredGroupedLogs.map((group, groupIndex) => (
          <Card key={group.date} className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => toggleGroup(group.date)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedGroups.has(group.date) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">{group.displayDate}</h3>
                    <p className="text-sm text-gray-500">
                      {group.count} evento{group.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Resumen de estados */}
                  <div className="flex gap-1">
                    {['SUCCESS', 'FAILURE', 'PENDING'].map(status => {
                      const count = group.logs.filter(log => log.status === status).length;
                      if (count === 0) return null;
                      
                      return (
                        <Badge 
                          key={status}
                          variant="outline"
                          className={`text-xs ${
                            status === 'SUCCESS' ? 'border-green-500 text-green-600' :
                            status === 'FAILURE' ? 'border-red-500 text-red-600' :
                            'border-yellow-500 text-yellow-600'
                          }`}
                        >
                          {count}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardHeader>

            {expandedGroups.has(group.date) && (
              <CardContent>
                <div className="space-y-3">
                  {group.logs.map((log, logIndex) => (
                    <div 
                      key={log.id}
                      className={`flex items-start gap-4 p-3 rounded-lg border-l-4 ${
                        log.status === 'SUCCESS' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                        log.status === 'FAILURE' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
                        'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      }`}
                    >
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        {getStatusIcon(log.status)}
                        {logIndex < group.logs.length - 1 && (
                          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mt-2"></div>
                        )}
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getActionColor(log.action)}>
                            {formatActionLabel(log.action)}
                          </Badge>
                          <Badge variant="outline">
                            {log.resource}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(parseISO(log.createdAt), 'HH:mm:ss', { locale: es })}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" /> Usuario:
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 truncate">
                              {log.userEmail || 'N/A'}
                            </p>
                          </div>
                          
                          <div>
                            <span className="font-medium flex items-center gap-1">
                              <Database className="h-3 w-3" /> Recurso ID:
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 font-mono text-xs truncate">
                              {log.resourceId || 'N/A'}
                            </p>
                          </div>
                          
                          <div>
                            <span className="font-medium">IP:</span>
                            <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {log.ipAddress}
                            </p>
                          </div>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">
                              Ver detalles adicionales
                            </summary>
                            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                              <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {filteredGroupedLogs.length === 0 && (
          <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron eventos para mostrar en el timeline</p>
                {selectedTypes.size > 0 && (
                  <p className="text-sm mt-2">
                    Intenta ajustar los filtros de tipo de evento
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}