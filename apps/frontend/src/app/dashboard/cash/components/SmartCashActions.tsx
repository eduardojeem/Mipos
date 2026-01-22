"use client";

import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Square, 
  Plus, 
  RefreshCw, 
  Download, 
  Settings, 
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calculator
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

interface SmartCashActionsProps {
  sessionOpen: boolean;
  currentBalance: number;
  onOpenSession: () => void;
  onCloseSession: () => void;
  onNewMovement: () => void;
  onRefresh: () => void;
  onExport?: () => void;
  onQuickCount?: () => void;
  isRefreshing?: boolean;
  lastSyncAt?: Date | null;
  loadingStates?: {
    openingSession?: boolean;
    closingSession?: boolean;
    registeringMovement?: boolean;
  };
  sessionStats?: {
    movementsToday: number;
    lastMovementAt?: Date;
    discrepancy?: number;
  };
}

const ActionButton = memo(({ 
  onClick, 
  disabled, 
  loading, 
  variant = "default",
  size = "default",
  icon: Icon,
  children,
  className = ""
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) => (
  <Button
    onClick={onClick}
    disabled={disabled || loading}
    variant={variant}
    size={size}
    className={`transition-all duration-200 ${className}`}
  >
    {loading ? (
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
    ) : Icon ? (
      <Icon className="h-4 w-4 mr-2" />
    ) : null}
    {children}
  </Button>
));

ActionButton.displayName = "ActionButton";

const QuickStats = memo(({ 
  movementsToday, 
  lastMovementAt, 
  discrepancy 
}: {
  movementsToday: number;
  lastMovementAt?: Date;
  discrepancy?: number;
}) => (
  <div className="grid grid-cols-3 gap-4 text-center">
    <div>
      <div className="text-lg font-semibold">{movementsToday}</div>
      <p className="text-xs text-muted-foreground">Movimientos hoy</p>
    </div>
    <div>
      <div className="text-lg font-semibold">
        {lastMovementAt ? (
          <span className="text-green-600">
            {new Date().getTime() - lastMovementAt.getTime() < 300000 ? "Reciente" : "Hace rato"}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Última actividad</p>
    </div>
    <div>
      <div className={`text-lg font-semibold ${
        discrepancy === 0 ? "text-green-600" : 
        Math.abs(discrepancy || 0) < 1000 ? "text-yellow-600" : "text-red-600"
      }`}>
        {discrepancy !== undefined ? formatCurrency(Math.abs(discrepancy)) : "-"}
      </div>
      <p className="text-xs text-muted-foreground">Discrepancia</p>
    </div>
  </div>
));

QuickStats.displayName = "QuickStats";

export const SmartCashActions = memo<SmartCashActionsProps>(({
  sessionOpen,
  currentBalance,
  onOpenSession,
  onCloseSession,
  onNewMovement,
  onRefresh,
  onExport,
  onQuickCount,
  isRefreshing = false,
  lastSyncAt,
  loadingStates = {},
  sessionStats
}) => {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleQuickAction = (action: string) => {
    toast({
      title: "Acción rápida",
      description: `Ejecutando: ${action}`,
    });
  };

  const getSessionStatus = () => {
    if (sessionOpen) {
      return {
        icon: CheckCircle,
        text: "Sesión Activa",
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800"
      };
    } else {
      return {
        icon: AlertTriangle,
        text: "Sesión Cerrada",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        borderColor: "border-yellow-200 dark:border-yellow-800"
      };
    }
  };

  const status = getSessionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Estado de la sesión */}
      <Card className={`${status.bgColor} ${status.borderColor}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className={`h-6 w-6 ${status.color}`} />
              <div>
                <h3 className="font-semibold">{status.text}</h3>
                <p className="text-sm text-muted-foreground">
                  Balance actual: {formatCurrency(currentBalance)}
                </p>
              </div>
            </div>
            <Badge variant={sessionOpen ? "default" : "secondary"}>
              {sessionOpen ? "ACTIVA" : "INACTIVA"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Acciones principales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Acciones de Caja</span>
            <div className="flex items-center space-x-2">
              {lastSyncAt && (
                <span className="text-xs text-muted-foreground">
                  Sync: {lastSyncAt.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Acciones primarias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!sessionOpen ? (
              <ActionButton
                onClick={onOpenSession}
                loading={loadingStates.openingSession}
                icon={Play}
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Abrir Sesión
              </ActionButton>
            ) : (
              <ActionButton
                onClick={onCloseSession}
                loading={loadingStates.closingSession}
                icon={Square}
                variant="destructive"
              >
                Cerrar Sesión
              </ActionButton>
            )}

            <ActionButton
              onClick={onNewMovement}
              disabled={!sessionOpen}
              loading={loadingStates.registeringMovement}
              icon={Plus}
              variant="outline"
            >
              Nuevo Movimiento
            </ActionButton>
          </div>

          {/* Estadísticas rápidas */}
          {sessionStats && sessionOpen && (
            <>
              <Separator />
              <QuickStats {...sessionStats} />
            </>
          )}

          {/* Acciones secundarias */}
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <ActionButton
              onClick={onRefresh}
              loading={isRefreshing}
              icon={RefreshCw}
              variant="ghost"
              size="sm"
            >
              Actualizar
            </ActionButton>

            {onExport && (
              <ActionButton
                onClick={onExport}
                icon={Download}
                variant="ghost"
                size="sm"
              >
                Exportar
              </ActionButton>
            )}

            {onQuickCount && (
              <ActionButton
                onClick={onQuickCount}
                disabled={!sessionOpen}
                icon={Calculator}
                variant="ghost"
                size="sm"
              >
                Conteo
              </ActionButton>
            )}

            <ActionButton
              onClick={() => handleQuickAction("Reporte rápido")}
              icon={TrendingUp}
              variant="ghost"
              size="sm"
            >
              Reporte
            </ActionButton>
          </div>

          {/* Acciones avanzadas */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Acciones Avanzadas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                      onClick={() => handleQuickAction("Arqueo completo")}
                      disabled={!sessionOpen}
                      variant="outline"
                      size="sm"
                    >
                      Arqueo Completo
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleQuickAction("Conciliación")}
                      disabled={!sessionOpen}
                      variant="outline"
                      size="sm"
                    >
                      Conciliación
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleQuickAction("Backup datos")}
                      variant="outline"
                      size="sm"
                    >
                      Backup Datos
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleQuickAction("Configuración")}
                      variant="outline"
                      size="sm"
                    >
                      Configuración
                    </ActionButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Alertas inteligentes */}
      {sessionOpen && currentBalance < 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Balance Negativo</p>
              <p className="text-sm text-red-600 dark:text-red-300">
                El balance actual es negativo. Considera revisar los movimientos.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {!sessionOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Sesión Cerrada</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Abre una nueva sesión para comenzar a registrar movimientos.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});

SmartCashActions.displayName = "SmartCashActions";