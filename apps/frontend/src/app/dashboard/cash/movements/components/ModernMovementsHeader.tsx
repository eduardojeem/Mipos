"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Download,
  Search,
  Filter,
  Zap,
  Clock,
  TrendingUp,
  ArrowLeftRight,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModernMovementsHeaderProps {
  title: string;
  subtitle: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
  autoRefresh?: boolean;
  onAutoRefreshToggle?: () => void;
  totalMovements: number;
  activeFilters: number;
  onQuickFilter: (type: string) => void;
  lastUpdate?: Date | null;
}

interface QuickFilterPillProps {
  label: string;
  value: string;
  active?: boolean;
  onClick: () => void;
}

const QuickFilterPill = memo<QuickFilterPillProps>(({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`}
  >
    {label}
  </button>
));

QuickFilterPill.displayName = "QuickFilterPill";

export const ModernMovementsHeader = memo<ModernMovementsHeaderProps>(({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onRefresh,
  onExport,
  onBack,
  isLoading = false,
  isExporting = false,
  autoRefresh = false,
  onAutoRefreshToggle,
  totalMovements,
  activeFilters,
  onQuickFilter,
  lastUpdate,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header premium */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Título + back */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20">
              <ArrowLeftRight className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                {totalMovements > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalMovements.toLocaleString()}
                  </Badge>
                )}
                {activeFilters > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Filter className="h-3 w-3" />
                    {activeFilters} filtros
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{subtitle}</span>
                {lastUpdate && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastUpdate.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda + acciones */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar movimientos..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-64 pl-9 text-sm"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting}
            className="h-9"
          >
            <Download className="mr-1.5 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>

          {onAutoRefreshToggle && (
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={onAutoRefreshToggle}
              className="h-9"
            >
              <Zap className="mr-1.5 h-4 w-4" />
              Auto
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <TrendingUp className="mr-1.5 h-4 w-4" />
                Sesión
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por sesión</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onQuickFilter("current-session")}>
                <Clock className="mr-2 h-4 w-4" />
                Sesión actual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickFilter("all-sessions")}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Todas las sesiones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filtros rápidos por tipo — pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
        <QuickFilterPill label="Todos" value="all" onClick={() => onQuickFilter("all")} />
        <QuickFilterPill label="Ventas" value="SALE" onClick={() => onQuickFilter("SALE")} />
        <QuickFilterPill label="Ingresos" value="IN" onClick={() => onQuickFilter("IN")} />
        <QuickFilterPill label="Egresos" value="OUT" onClick={() => onQuickFilter("OUT")} />
        <QuickFilterPill label="Devoluciones" value="RETURN" onClick={() => onQuickFilter("RETURN")} />
        <span className="ml-2 text-xs font-medium text-muted-foreground">Fecha:</span>
        <QuickFilterPill label="Hoy" value="today" onClick={() => onQuickFilter("today")} />
      </div>
    </motion.div>
  );
});

ModernMovementsHeader.displayName = "ModernMovementsHeader";