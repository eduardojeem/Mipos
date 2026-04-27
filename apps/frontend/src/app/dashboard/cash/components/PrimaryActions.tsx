"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissionsContext } from "@/hooks/use-unified-permissions";
import { FileText, Play, Plus, Square } from "lucide-react";
import { motion } from "framer-motion";

interface PrimaryActionsProps {
  sessionOpen: boolean;
  canOperate?: boolean;
  onOpenSession: () => void;
  onCloseSession: () => void;
  onNewMovement: () => void;
  onViewReports: () => void;
  loadingStates?: {
    openingSession?: boolean;
    closingSession?: boolean;
    registeringMovement?: boolean;
  };
}

interface ActionCardButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  disabledTooltip?: string;
}

const ActionCardButton = memo<ActionCardButtonProps>(
  ({ onClick, disabled, className = "", icon: Icon, label, sublabel, disabledTooltip }) => {
    const btn = (
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className={`h-auto w-full flex-col gap-1 py-4 ${className}`}
      >
        <Icon className="h-6 w-6" />
        <span className="text-base font-semibold leading-tight">{label}</span>
        <span className="text-xs font-normal opacity-80 leading-snug">{sublabel}</span>
      </Button>
    );

    if (disabled && disabledTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* wrapper para tooltip en botón disabled */}
              <span className="w-full">{btn}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{disabledTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return btn;
  },
);

ActionCardButton.displayName = "ActionCardButton";

export const PrimaryActions = memo<PrimaryActionsProps>(({
  sessionOpen,
  canOperate = true,
  onOpenSession,
  onCloseSession,
  onNewMovement,
  onViewReports,
  loadingStates = {},
}) => {
  const { hasPermission, loading } = usePermissionsContext();
  const canOpen = hasPermission("cash", "open");
  const canClose = hasPermission("cash", "close");
  const canMove = hasPermission("cash", "move");

  const orgTooltip = "Selecciona una organización primero en el encabezado";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {!sessionOpen ? (
              <ActionCardButton
                onClick={onOpenSession}
                disabled={loading || !canOperate || !canOpen || loadingStates.openingSession}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600"
                icon={Play}
                label={loadingStates.openingSession ? "Abriendo..." : "Abrir sesión"}
                sublabel="Inicia el turno de caja"
                disabledTooltip={!canOperate ? orgTooltip : !canOpen ? "Sin permiso para abrir sesión" : undefined}
              />
            ) : (
              <ActionCardButton
                onClick={onCloseSession}
                disabled={loading || !canOperate || !canClose || loadingStates.closingSession}
                className="bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/30 hover:from-rose-700 hover:to-red-700 dark:from-rose-500 dark:to-red-500 dark:hover:from-rose-600 dark:hover:to-red-600"
                icon={Square}
                label={loadingStates.closingSession ? "Cerrando..." : "Cerrar sesión"}
                sublabel="Finaliza y arquea el turno"
                disabledTooltip={!canOperate ? orgTooltip : !canClose ? "Sin permiso para cerrar sesión" : undefined}
              />
            )}

            <ActionCardButton
              onClick={onNewMovement}
              disabled={loading || !canOperate || !sessionOpen || !canMove || loadingStates.registeringMovement}
              className="border-2 hover:bg-accent dark:border-slate-600 dark:hover:bg-slate-800/50"
              icon={Plus}
              label={loadingStates.registeringMovement ? "Registrando..." : "Nuevo movimiento"}
              sublabel="Registra ingresos y egresos de caja"
              disabledTooltip={
                !canOperate
                  ? orgTooltip
                  : !sessionOpen
                    ? "Abre una sesión primero"
                    : !canMove
                      ? "Sin permiso para registrar movimientos"
                      : undefined
              }
            />

            <ActionCardButton
              onClick={onViewReports}
              disabled={!canOperate}
              className="border-2 hover:bg-accent dark:border-slate-600 dark:hover:bg-slate-800/50"
              icon={FileText}
              label="Ver reportes"
              sublabel="Consulta estadísticas y exporta"
              disabledTooltip={!canOperate ? orgTooltip : undefined}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PrimaryActions.displayName = "PrimaryActions";
