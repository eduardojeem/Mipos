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
  Filter,
  Calendar,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
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
    if (action.startsWith('CREATE')) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (action.startsWith('UPDATE')) return 'bg-primary/10 text-primary';
    if (action.startsWith('DELETE')) return 'bg-destructive/10 text-destructive';
    if (action.startsWith('VIEW')) return 'bg-muted text-muted-foreground';
    return 'bg-secondary text-secondary-foreground';
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
      <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm animate-pulse">
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Cargando timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles del timeline */}
      <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-primary" />
              Timeline de Eventos
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-muted/30 border border-border/50 rounded-2xl p-1">
                <Button
                  variant={zoomLevel === 'hour' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel('hour')}
                  className="rounded-xl h-8 text-xs"
                >
                  Hora
                </Button>
                <Button
                  variant={zoomLevel === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel('day')}
                  className="rounded-xl h-8 text-xs"
                >
                  Día
                </Button>
                <Button
                  variant={zoomLevel === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel('week')}
                  className="rounded-xl h-8 text-xs"
                >
                  Semana
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros de tipo de evento */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filtrar por tipo de evento
            </label>
            <div className="flex gap-2 flex-wrap">
              {eventTypes.map(type => (
                <Button
                  key={type}
                  variant={selectedTypes.has(type) ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => toggleEventType(type)}
                  className="text-[10px] h-7 px-3 rounded-full font-medium"
                >
                  {formatActionLabel(type)}
                </Button>
              ))}
              {selectedTypes.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes(new Set())}
                  className="text-xs h-7 px-2 hover:text-destructive"
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
        {filteredGroupedLogs.map((group) => (
          <Card key={group.date} className="rounded-3xl border-border/60 bg-background/80 shadow-sm overflow-hidden">
            <CardHeader 
              className="p-0 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleGroup(group.date)}
            >
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-2xl transition-transform ${expandedGroups.has(group.date) ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{group.displayDate}</h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {group.count} evento{group.count !== 1 ? 's' : ''} detectados
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Resumen de estados */}
                  <div className="flex gap-1.5">
                    {['SUCCESS', 'FAILURE', 'PENDING'].map(status => {
                      const count = group.logs.filter(log => log.status === status).length;
                      if (count === 0) return null;
                      
                      return (
                        <Badge 
                          key={status}
                          variant="outline"
                          className={`text-[10px] px-2 h-5 font-bold rounded-full ${
                            status === 'SUCCESS' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                            status === 'FAILURE' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                            'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
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
              <CardContent className="px-6 pb-6 pt-0">
                <div className="space-y-4 mt-2">
                  {group.logs.map((log, logIndex) => (
                    <div 
                      key={log.id}
                      className={`relative flex items-start gap-5 p-5 rounded-2xl border transition-all ${
                        log.status === 'SUCCESS' ? 'border-green-500/10 bg-green-50/30 dark:bg-green-500/5' :
                        log.status === 'FAILURE' ? 'border-destructive/10 bg-destructive/5' :
                        'border-yellow-500/10 bg-yellow-50/30 dark:bg-yellow-500/5'
                      }`}
                    >
                      {/* Timeline connector visual (opcional/simplificado) */}
                      <div className="flex flex-col items-center mt-1 z-10">
                        <div className={`rounded-full p-1.5 ${
                          log.status === 'SUCCESS' ? 'bg-green-500/20 text-green-600' :
                          log.status === 'FAILURE' ? 'bg-destructive/10 text-destructive' :
                          'bg-yellow-500/20 text-yellow-600'
                        }`}>
                          {getStatusIcon(log.status)}
                        </div>
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge variant="outline" className={`${getActionColor(log.action)} text-[10px] font-bold border-none`}>
                            {formatActionLabel(log.action)}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-normal opacity-80 h-5">
                            {log.resource}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground ml-auto bg-muted/40 px-2 py-0.5 rounded-lg">
                            <Clock className="h-3 w-3 inline mr-1 opacity-70" />
                            {format(parseISO(log.createdAt), 'HH:mm:ss', { locale: es })}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="p-3 bg-background/40 rounded-xl border border-border/30">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                              Usuario
                            </span>
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-primary opacity-70" />
                              <p className="text-foreground font-semibold truncate">
                                {log.userEmail || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-background/40 rounded-xl border border-border/30">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                              Recurso ID
                            </span>
                            <div className="flex items-center gap-2">
                              <Database className="h-3.5 w-3.5 text-primary opacity-70" />
                              <p className="text-muted-foreground font-mono text-xs truncate">
                                {log.resourceId || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-background/40 rounded-xl border border-border/30">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                              Dirección IP
                            </span>
                            <p className="text-muted-foreground font-mono text-xs mt-0.5">
                              {log.ipAddress}
                            </p>
                          </div>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-4 group/details">
                            <summary className="cursor-pointer text-xs font-bold text-primary hover:opacity-80 transition-opacity list-none flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Ver metadatos adicionales
                            </summary>
                            <div className="mt-3 p-4 bg-muted/30 border border-border/30 rounded-xl text-[11px] font-mono overflow-x-auto shadow-inner">
                              <pre className="text-muted-foreground whitespace-pre-wrap">
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
          <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-foreground">No hay eventos que coincidan</p>
                <p className="text-sm mt-1">
                  {selectedTypes.size > 0 
                    ? 'Intenta ajustar los filtros de tipo de evento seleccionados'
                    : 'No hay eventos de auditoría disponibles en este periodo'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}