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
  BellOff,
  TrendingUp,
  Users,
  Database
} from 'lucide-react';
import { format, subMinutes, subHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditAlertsProps {
  logs: any[];
  theme: 'light' | 'dark';
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
  details: any;
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

export function AuditAlerts({ logs, theme }: AuditAlertsProps) {
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
      case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300';
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
      <Card className={`border-green-200 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-green-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>
              <Shield className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div className="flex-1">
              <p className={`font-medium ${theme === 'dark' ? 'text-green-300' : 'text-green-800'}`}>
                Sistema Seguro
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                No se han detectado alertas de seguridad activas
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
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
        <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <strong>¡Atención!</strong> Se han detectado {criticalAlerts.length} alerta{criticalAlerts.length > 1 ? 's' : ''} crítica{criticalAlerts.length > 1 ? 's' : ''} de seguridad.
          </AlertDescription>
        </Alert>
      )}

      {/* Panel de alertas */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Alertas de Seguridad
              {activeAlerts.length > 0 && (
                <Badge variant="destructive">{activeAlerts.length}</Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
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
              className={`p-4 rounded-lg border ${getSeverityColor(alert.rule.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(alert.rule.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{alert.rule.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {alert.rule.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <p className="text-xs opacity-75">
                      Detectado: {format(alert.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                    </p>
                    
                    {/* Detalles adicionales */}
                    {alert.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium">
                          Ver detalles técnicos
                        </summary>
                        <pre className="mt-1 text-xs opacity-75 whitespace-pre-wrap">
                          {JSON.stringify(alert.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                    title="Marcar como revisado"
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
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
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración de Alertas
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded border ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{rule.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRule(rule.id)}
                      >
                        {rule.enabled ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Umbral: {rule.threshold}{rule.type === 'failure_rate' ? '%' : ''}</p>
                      <p>Ventana: {rule.timeWindow} minutos</p>
                      <Badge variant="outline" className="text-xs">
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