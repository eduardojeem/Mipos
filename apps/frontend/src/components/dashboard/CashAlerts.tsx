"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  X, 
  Bell,
  BellOff,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CashAlert = {
  id: string;
  type: 'discrepancy' | 'no_session' | 'large_movement' | 'session_timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sessionId?: string;
  amount?: number;
  createdAt: string;
  acknowledged: boolean;
};

type CashSession = {
  id: string;
  status: string;
  openingAmount: number;
  closingAmount?: number | null;
  systemExpected?: number | null;
  discrepancyAmount?: number | null;
  openedAt: string;
  closedAt?: string | null;
  movements?: Array<{
    id: string;
    type: string;
    amount: number;
    reason?: string | null;
  }>;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function CashAlerts() {
  const [alerts, setAlerts] = useState<CashAlert[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  // React Query: Sessions for alerts
  const {
    data: sessionsRes,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["cashSessionsAll"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/cash/sessions`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
    refetchInterval: 30_000, // Check every 30 seconds
    staleTime: 60_000,
  });

  useEffect(() => {
    if (sessionsRes?.sessions) {
      const sess: CashSession[] = sessionsRes.sessions || [];
      const nextAlerts = generateAlerts(sess);
      setAlerts((prev) => {
        const newCriticalAlerts = nextAlerts.filter(
          (alert) => alert.severity === 'critical' && !prev.some((existing) => existing.id === alert.id)
        );
        if (newCriticalAlerts.length > 0) {
          playAlertSound();
        }
        return nextAlerts;
      });
    }
  }, [sessionsRes, soundEnabled]);

  const generateAlerts = (sessions: CashSession[]): CashAlert[] => {
    const alerts: CashAlert[] = [];
    const now = new Date();

    // Check for open sessions
    const openSessions = sessions.filter(s => s.status === 'OPEN');

    if (openSessions.length === 0) {
      alerts.push({
        id: 'no-open-session',
        type: 'no_session',
        severity: 'high',
        title: 'No hay sesión de caja abierta',
        description: 'Es necesario abrir una sesión de caja para registrar movimientos.',
        createdAt: now.toISOString(),
        acknowledged: false
      });
    } else if (openSessions.length > 1) {
      alerts.push({
        id: 'multiple-open-sessions',
        type: 'no_session',
        severity: 'critical',
        title: 'Múltiples sesiones abiertas',
        description: `Hay ${openSessions.length} sesiones de caja abiertas simultáneamente.`,
        createdAt: now.toISOString(),
        acknowledged: false
      });
    }

    // Check for session timeout (more than 12 hours open)
    openSessions.forEach(session => {
      const openedAt = new Date(session.openedAt);
      const hoursOpen = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);

      if (hoursOpen > 12) {
        alerts.push({
          id: `session-timeout-${session.id}`,
          type: 'session_timeout',
          severity: 'medium',
          title: 'Sesión abierta por mucho tiempo',
          description: `La sesión ha estado abierta por ${Math.round(hoursOpen)} horas.`,
          sessionId: session.id,
          createdAt: now.toISOString(),
          acknowledged: false
        });
      }
    });

    // Check for discrepancies in closed sessions
    const recentClosedSessions = sessions
      .filter(s => s.status === 'CLOSED' && s.discrepancyAmount)
      .filter(s => {
        const closedAt = new Date(s.closedAt!);
        const hoursAgo = (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60);
        return hoursAgo <= 24; // Last 24 hours
      });

    recentClosedSessions.forEach(session => {
      const discrepancy = Math.abs(session.discrepancyAmount!);
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (discrepancy > 10000) severity = 'critical';
      else if (discrepancy > 1000) severity = 'high';
      else if (discrepancy > 100) severity = 'medium';

      alerts.push({
        id: `discrepancy-${session.id}`,
        type: 'discrepancy',
        severity,
        title: 'Discrepancia en sesión cerrada',
        description: `Sesión cerrada con discrepancia de ${formatCurrency(session.discrepancyAmount!)}.`,
        sessionId: session.id,
        amount: session.discrepancyAmount || undefined,
        createdAt: now.toISOString(),
        acknowledged: false
      });
    });

    // Check for large movements in open sessions
    openSessions.forEach(session => {
      if (session.movements) {
        const largeMovements = session.movements.filter(m =>
          Math.abs(m.amount) > 50000 && (m.type === 'OUT' || m.type === 'ADJUSTMENT')
        );

        largeMovements.forEach(movement => {
          alerts.push({
            id: `large-movement-${movement.id}`,
            type: 'large_movement',
            severity: 'medium',
            title: 'Movimiento de alto valor',
            description: `Movimiento ${movement.type} de ${formatCurrency(movement.amount)} registrado.`,
            sessionId: session.id,
            amount: movement.amount,
            createdAt: now.toISOString(),
            acknowledged: false
          });
        });
      }
    });

    return alerts;
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    toast({ 
      description: "Alerta reconocida"
    });
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast({ 
      description: "Alerta descartada"
    });
  };

  const acknowledgeAllAlerts = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })));
    toast({ 
      description: "Todas las alertas han sido reconocidas"
    });
  };

  const playAlertSound = () => {
    if (soundEnabled && typeof window !== 'undefined') {
      // Simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'discrepancy': return <AlertTriangle className="h-4 w-4" />;
      case 'no_session': return <Clock className="h-4 w-4" />;
      case 'large_movement': return <DollarSign className="h-4 w-4" />;
      case 'session_timeout': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'high');
  const mediumAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'medium');
  const lowAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'low');
  
  const displayAlerts = showAcknowledged ? alerts : unacknowledgedAlerts;

  if (unacknowledgedAlerts.length === 0 && acknowledgedAlerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Estado de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-700 font-medium">Todo en orden</p>
            <p className="text-xs text-green-600 mt-1">No hay alertas activas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`transition-all duration-300 ${
        criticalAlerts.length > 0 ? 'border-red-300 shadow-lg' : 
        highAlerts.length > 0 ? 'border-orange-300' : 'border-gray-200'
      }`}>
        <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  {criticalAlerts.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                  ) : (
                    <Bell className="h-5 w-5 text-orange-600" />
                  )}
                  {unacknowledgedAlerts.length > 0 && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
                <CardTitle className="text-lg">
                  Alertas de Caja
                  {unacknowledgedAlerts.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({unacknowledgedAlerts.length} activas)
                    </span>
                  )}
                </CardTitle>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Badges de severidad */}
                <div className="flex gap-1">
                  {criticalAlerts.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {criticalAlerts.length} Críticas
                    </Badge>
                  )}
                  {highAlerts.length > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      {highAlerts.length} Altas
                    </Badge>
                  )}
                  {mediumAlerts.length > 0 && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {mediumAlerts.length} Medias
                    </Badge>
                  )}
                </div>

                {/* Controles */}
                <div className="flex items-center gap-1">
                  {unacknowledgedAlerts.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={acknowledgeAllAlerts}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reconocer todas</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {acknowledgedAlerts.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAcknowledged(!showAcknowledged)}
                          className="h-8 w-8 p-0"
                        >
                          {showAcknowledged ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showAcknowledged ? 'Ocultar reconocidas' : 'Mostrar reconocidas'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="h-8 w-8 p-0"
                      >
                        {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {displayAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay alertas para mostrar</p>
                </div>
              ) : (
                displayAlerts
                  .sort((a, b) => {
                    // Ordenar por severidad y luego por fecha
                    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    const severityDiff = severityOrder[b.severity as keyof typeof severityOrder] - 
                                       severityOrder[a.severity as keyof typeof severityOrder];
                    if (severityDiff !== 0) return severityDiff;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .map((alert) => (
                    <Alert 
                      key={alert.id} 
                      className={`border transition-all duration-200 hover:shadow-md ${
                        getSeverityColor(alert.severity)
                      } ${alert.acknowledged ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-1 rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-100' :
                            alert.severity === 'high' ? 'bg-orange-100' :
                            alert.severity === 'medium' ? 'bg-yellow-100' :
                            'bg-blue-100'
                          }`}>
                            {getSeverityIcon(alert.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertDescription className="font-medium">
                                {alert.title}
                              </AlertDescription>
                              {alert.acknowledged && (
                                <Badge variant="outline" className="text-xs">
                                  Reconocida
                                </Badge>
                              )}
                            </div>
                            <AlertDescription className="text-sm text-muted-foreground">
                              {alert.description}
                            </AlertDescription>
                            {alert.amount && (
                              <AlertDescription className="text-sm font-medium mt-1">
                                Monto: {formatCurrency(alert.amount)}
                              </AlertDescription>
                            )}
                            <AlertDescription className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleString()}
                            </AlertDescription>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!alert.acknowledged && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => acknowledgeAlert(alert.id)}
                                  className="h-8 px-2 text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Reconocer
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marcar como reconocida</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => dismissAlert(alert.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Descartar alerta</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </Alert>
                  ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}
