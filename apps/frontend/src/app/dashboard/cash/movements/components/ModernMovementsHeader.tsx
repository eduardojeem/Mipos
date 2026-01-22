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
  Settings,
  MoreHorizontal
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
  isLoading?: boolean;
  isExporting?: boolean;
  autoRefresh?: boolean;
  onAutoRefreshToggle?: () => void;
  totalMovements: number;
  activeFilters: number;
  onQuickFilter: (type: string) => void;
  lastUpdate?: Date | null;
}

const QuickActionButton = memo(({ 
  onClick, 
  icon: Icon, 
  label, 
  variant = "outline",
  loading = false,
  badge
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  loading?: boolean;
  badge?: string | number;
}) => (
  <Button
    variant={variant}
    size="sm"
    onClick={onClick}
    disabled={loading}
    className="relative"
  >
    {loading ? (
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
    ) : (
      <Icon className="h-4 w-4 mr-2" />
    )}
    {label}
    {badge && (
      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
        {badge}
      </Badge>
    )}
  </Button>
));

QuickActionButton.displayName = "QuickActionButton";

export const ModernMovementsHeader = memo<ModernMovementsHeaderProps>(({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onRefresh,
  onExport,
  isLoading = false,
  isExporting = false,
  autoRefresh = false,
  onAutoRefreshToggle,
  totalMovements,
  activeFilters,
  onQuickFilter,
  lastUpdate
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>Modernizado</span>
            </Badge>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{subtitle}</span>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>{totalMovements.toLocaleString()} movimientos</span>
            </div>
            {lastUpdate && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Actualizado {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar movimientos..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Quick Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-muted-foreground">Filtros rápidos:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter("SALE")}
            className="h-8"
          >
            Ventas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter("IN")}
            className="h-8"
          >
            Ingresos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter("OUT")}
            className="h-8"
          >
            Egresos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter("today")}
            className="h-8"
          >
            Hoy
          </Button>
          {activeFilters > 0 && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Filter className="h-3 w-3" />
              <span>{activeFilters} activos</span>
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <QuickActionButton
            onClick={onRefresh}
            icon={RefreshCw}
            label="Actualizar"
            loading={isLoading}
          />
          
          <QuickActionButton
            onClick={onExport}
            icon={Download}
            label={isExporting ? "Exportando..." : "Exportar"}
            loading={isExporting}
          />

          {onAutoRefreshToggle && (
            <QuickActionButton
              onClick={onAutoRefreshToggle}
              icon={Zap}
              label="Auto"
              variant={autoRefresh ? "default" : "outline"}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onQuickFilter("current-session")}>
                <Clock className="h-4 w-4 mr-2" />
                Sesión actual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickFilter("all-sessions")}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Todas las sesiones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
});

ModernMovementsHeader.displayName = "ModernMovementsHeader";