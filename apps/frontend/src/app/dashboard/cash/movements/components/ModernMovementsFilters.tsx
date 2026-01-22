"use client";

import React, { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  DollarSign,
  User,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface FilterOption {
  value: string;
  label: string;
}

interface ModernMovementsFiltersProps {
  // Filter values
  type: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  referenceType: string;
  userId: string;
  sessionId: string;

  // Filter options
  typeOptions: FilterOption[];
  referenceTypeOptions: FilterOption[];
  userOptions: FilterOption[];
  sessionOptions: FilterOption[];

  // Handlers
  onTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onAmountMinChange: (value: string) => void;
  onAmountMaxChange: (value: string) => void;
  onReferenceTypeChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onSessionIdChange: (value: string) => void;
  onClearAll: () => void;

  // State
  activeFiltersCount: number;
  isLoading?: boolean;
}

const FilterSection = memo(({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-center space-x-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <Label className="text-sm font-medium">{title}</Label>
    </div>
    {children}
  </div>
));

FilterSection.displayName = "FilterSection";

const DateRangePicker = memo(({ 
  fromValue, 
  toValue, 
  onFromChange, 
  onToChange 
}: {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) => {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fromDate = fromValue ? new Date(fromValue) : undefined;
  const toDate = toValue ? new Date(toValue) : undefined;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start text-left font-normal"
            size="sm"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fromDate ? format(fromDate, "dd/MM/yyyy", { locale: es }) : "Desde"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={(date) => {
              onFromChange(date ? date.toISOString().split('T')[0] : '');
              setFromOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start text-left font-normal"
            size="sm"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {toDate ? format(toDate, "dd/MM/yyyy", { locale: es }) : "Hasta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={(date) => {
              onToChange(date ? date.toISOString().split('T')[0] : '');
              setToOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

DateRangePicker.displayName = "DateRangePicker";

const QuickDateFilters = memo(({ 
  onDateFromChange, 
  onDateToChange 
}: {
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) => {
  const setToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    onDateFromChange(todayStr);
    onDateToChange(todayStr);
  };

  const setThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    onDateFromChange(startOfWeek.toISOString().split('T')[0]);
    onDateToChange(endOfWeek.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    onDateFromChange(startOfMonth.toISOString().split('T')[0]);
    onDateToChange(endOfMonth.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="ghost" size="sm" onClick={setToday} className="h-7 text-xs">
        Hoy
      </Button>
      <Button variant="ghost" size="sm" onClick={setThisWeek} className="h-7 text-xs">
        Esta semana
      </Button>
      <Button variant="ghost" size="sm" onClick={setThisMonth} className="h-7 text-xs">
        Este mes
      </Button>
    </div>
  );
});

QuickDateFilters.displayName = "QuickDateFilters";

export const ModernMovementsFilters = memo<ModernMovementsFiltersProps>(({
  type,
  search,
  dateFrom,
  dateTo,
  amountMin,
  amountMax,
  referenceType,
  userId,
  sessionId,
  typeOptions,
  referenceTypeOptions,
  userOptions,
  sessionOptions,
  onTypeChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onAmountMinChange,
  onAmountMaxChange,
  onReferenceTypeChange,
  onUserIdChange,
  onSessionIdChange,
  onClearAll,
  activeFiltersCount,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros Avanzados</span>
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>{activeFiltersCount} activos</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-6">
              {/* Basic Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FilterSection title="Tipo de Movimiento" icon={Tag}>
                  <Select value={type} onValueChange={onTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection title="Sesión" icon={Clock}>
                  <Select value={sessionId} onValueChange={onSessionIdChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sesión" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection title="Usuario" icon={User}>
                  <Select value={userId} onValueChange={onUserIdChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {userOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>
              </div>

              {/* Date Range */}
              <FilterSection title="Rango de Fechas" icon={CalendarIcon}>
                <div className="space-y-3">
                  <DateRangePicker
                    fromValue={dateFrom}
                    toValue={dateTo}
                    onFromChange={onDateFromChange}
                    onToChange={onDateToChange}
                  />
                  <QuickDateFilters
                    onDateFromChange={onDateFromChange}
                    onDateToChange={onDateToChange}
                  />
                </div>
              </FilterSection>

              {/* Amount Range */}
              <FilterSection title="Rango de Montos" icon={DollarSign}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mínimo</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amountMin}
                      onChange={(e) => onAmountMinChange(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Máximo</Label>
                    <Input
                      type="number"
                      placeholder="Sin límite"
                      value={amountMax}
                      onChange={(e) => onAmountMaxChange(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </FilterSection>

              {/* Reference Type */}
              <FilterSection title="Tipo de Referencia" icon={Tag}>
                <Select value={referenceType} onValueChange={onReferenceTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar referencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterSection>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
});

ModernMovementsFilters.displayName = "ModernMovementsFilters";