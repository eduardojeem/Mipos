'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  Clock,
  X,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';
import { format, subMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AuditLogEntry } from '../hooks/useAuditData';

interface AuditAlertsProps {
  logs: AuditLogEntry[];
  _theme?: 'light' | 'dark';
}

interface AlertRule {
  id: string;
  name: string;
  type: 'failure_rate' | 'suspicious_activity' | 'high_volume' | 'unauthorized_access';
  threshold: number;
  timeWindow: number; // minutos
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface GeneratedAlert {
  id: string;
  rule: AlertRule;
  message: string;
  count: number;
  timestamp: Date;
  acknowledged: boolean;
  details: Record<string, unknown>;
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_failure_rate',
    name: 'Alta tasa de fallos',
    type: 'failure_rate',
    threshold: 10, // % de fallos
    timeWindow: 15,
    enabled: true,
    severity: 'high'
  },
  {
    id: 'suspicious_login_attempts',
    name: 'Intentos de acceso sospechosos',
    type: 'suspicious_activity',
    threshold: 5, // intentos fallidos por IP
    timeWindow: 10,
    enabled: true,
    severity: 'critical'
  },
  {
    id: 'high_volume_activity',
    name: 'Volumen alto de actividad',
    type: 'high_volume',
    threshold: 100, // eventos por minuto
    timeWindow: 5,
    enabled: true,
    severity: 'medium'
  },
  {
    id: 'unauthorized_admin_access',
    name: 'Acceso administrativo no autorizado',
    type: 'unauthorized_access',
    threshold: 1, // cualquier acceso fuera de horario
    timeWindow: 60,
    enabled: true,
    severity: 'critical'
  }
];

export function AuditAlerts({ logs, _theme }: AuditAlertsProps) {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES);
  const [alerts, setAlerts] = useState<GeneratedAlert[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Generar alertas basadas en los logs y reglas
  const generatedAlerts = useMemo(() => {
    const now = new Date();
    const newAlerts: GeneratedAlert[] = [];

    alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const windowStart = subMinutes(now, rule.timeWindow);
      const recentLogs = logs.filter(log => 
        new Date(log.createdAt) >= windowStart
      );

      switch (rule.type) {
        case 'failure_rate':
          const totalEvents = recentLogs.length;
          const failedEvents = recentLogs.filter(log => log.status === 'FAILURE').length;
          const failureRate = totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;

          if (failureRate >= rule.threshold && totalEvents >= 10) {
            newAlerts.push({
              id: `${rule.id}_${Date.now()}`,
              rule,
              message: `Tasa de fallos del ${failureRate.toFixed(1)}% en los últimos ${rule.timeWindow} minutos`,
              count: failedEvents,
              timestamp: now,
              acknowledged: false,
              details: { failureRate, totalEvents, failedEvents }
            });
          }
          break;

        case 'suspicious_activity':
          const ipFailures: { [ip: string]: number } = {};
          recentLogs
            .filter(log => log.status === 'FAILURE' && log.action.includes('LOGIN'))
            .forEach(log => {
              ipFailures[log.ipAddress] = (ipFailures[log.ipAddress] || 0) + 1;
            });

          Object.entries(ipFailures).forEach(([ip, count]) => {
            if (count >= rule.threshold) {
              newAlerts.push({
                id: `${rule.id}_${ip}_${Date.now()}`,
                rule,
                message: `${count} intentos de login fallidos desde ${ip} en ${rule.timeWindow} minutos`,
                count,
                timestamp: now,
                acknowledged: false,
                details: { ip, attempts: count }
              });
            }
          });
          break;

        case 'high_volume':
          const eventsPerMinute = recentLogs.length / rule.timeWindow;
          if (eventsPerMinute >= rule.threshold) {
            newAlerts.push({
              id: `${rule.id}_${Date.now()}`,
              rule,
              message: `Volumen alto: ${Math.round(eventsPerMinute)} eventos/min (límite: ${rule.threshold})`,
              count: recentLogs.length,
              timestamp: now,
              acknowledged: false,
              details: { eventsPerMinute: Math.round(eventsPerMinute), totalEvents: recentLogs.length }
            });
          }
          break;

        case 'unauthorized_access':
          const adminActions = recentLogs.filter(log => 
            log.action.includes('ADMIN') || 
            log.resource.includes('admin') ||
            log.userRole === 'admin'
          );

          // Detectar acceso fuera de horario laboral (ejemplo: 22:00 - 06:00)
          const suspiciousAccess = adminActions.filter(log => {
            const hour = new Date(log.createdAt).getHours();
            return hour >= 22 || hour <= 6;
          });

          if (suspiciousAccess.length >= rule.threshold) {
            newAlerts.push({
              id: `${rule.id}_${Date.now()}`,
              rule,
              message: `${suspiciousAccess.length} accesos administrativos fuera de horario laboral`,
              count: suspiciousAccess.length,
              timestamp: now,
              acknowledged: false,
              details: { 
                suspiciousAccess: suspiciousAccess.map(log => ({
                  user: log.userEmail,
                  time: log.createdAt,
                  action: log.action
                }))
              }
            });
          }
          break;
      }
    });

    return newAlerts;
  }, [logs, alertRules]);

  // Actualizar alertas cuando se generen nuevas
  useEffect(() => {
    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const newAlerts = generatedAlerts.filter(a => !existingIds.has(a.id));
      return [...prev, ...newAlerts];
    });
  }, [generatedAlerts]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const toggleRule = (ruleId: string) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-200/50 dark:text-orange-400';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:text-yellow-400';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <Shield className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = activeAlerts.filter(alert => alert.rule.severity === 'critical');

  if (activeAlerts.length === 0) {
    return (
      <Card className="rounded-3xl border-green-500/20 bg-background/80 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                Sistema Seguro
              </p>
              <p className="text-sm text-muted-foreground">
                No se han detectado alertas de seguridad activas
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertas críticas */}
      {criticalAlerts.length > 0 && (
        <Alert className="rounded-2xl border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            <strong>¡Atención!</strong> Se han detectado {criticalAlerts.length} alerta{criticalAlerts.length > 1 ? 's' : ''} crítica{criticalAlerts.length > 1 ? 's' : ''} de seguridad.
          </AlertDescription>
        </Alert>
      )}

      {/* Panel de alertas */}
      <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="h-5 w-5 text-orange-500" />
              Alertas de Seguridad
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeAlerts.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-xl"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Lista de alertas activas */}
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border ${getSeverityColor(alert.rule.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{getSeverityIcon(alert.rule.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{alert.rule.name}</h4>
                      <Badge variant="outline" className="text-[10px] h-4 py-0 uppercase">
                        {alert.rule.severity}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90">{alert.message}</p>
                    <p className="text-[10px] mt-2 opacity-60 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Detectado: {format(alert.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                    </p>
                    
                    {/* Detalles adicionales */}
                    {alert.details && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-[10px] font-semibold hover:opacity-100 opacity-70 transition-opacity">
                          Ver detalles técnicos
                        </summary>
                        <pre className="mt-2 p-3 rounded-lg bg-background/50 border border-border/20 text-[10px] font-mono whitespace-pre-wrap">
                          {JSON.stringify(alert.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-background/20"
                    onClick={() => acknowledgeAlert(alert.id)}
                    title="Marcar como revisado"
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-background/20"
                    onClick={() => dismissAlert(alert.id)}
                    title="Descartar alerta"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Configuración de reglas */}
          {showSettings && (
            <div className="border-t border-border/50 pt-6 space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Configuración de Alertas
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-2xl border border-border bg-muted/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm text-foreground">{rule.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => toggleRule(rule.id)}
                      >
                        {rule.enabled ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <div className="flex justify-between">
                        <span>Umbral:</span>
                        <span className="font-medium text-foreground">{rule.threshold}{rule.type === 'failure_rate' ? '%' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ventana:</span>
                        <span className="font-medium text-foreground">{rule.timeWindow} min</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-4 p-0 px-2 uppercase font-semibold">
                        {rule.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}