'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText, ShoppingCart, Package, Users, BarChart3, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReportType } from '@/hooks/use-reports';
import { cn } from '@/lib/utils';

type ReportTypeItem = {
  key: ReportType;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>; 
};

interface GlobalReportSearchProps {
  types: Array<{ key: ReportType; label?: string; description?: string }>;
  value: string;
  onSelect: (type: ReportType) => void;
  onNavigate?: (href: string) => void;
  className?: string;
}

const DEFAULT_TYPES: ReportTypeItem[] = [
  { key: 'sales', label: 'Ventas', description: 'Órdenes, ingresos, ticket promedio', href: '/dashboard/reports?type=sales', icon: ShoppingCart },
  { key: 'inventory', label: 'Inventario', description: 'Stock, valor y movimientos', href: '/dashboard/reports?type=inventory', icon: Package },
  { key: 'customers', label: 'Clientes', description: 'Actividad, segmentos y retención', href: '/dashboard/reports?type=customers', icon: Users },
  { key: 'financial', label: 'Financiero', description: 'Ingresos, gastos y márgenes', href: '/dashboard/reports?type=financial', icon: BarChart3 },
  { key: 'compare', label: 'Comparar periodos', description: 'Comparación entre rangos', href: '/dashboard/reports?type=compare', icon: FileText },
];

export default function GlobalReportSearch({ types, value, onSelect, onNavigate, className }: GlobalReportSearchProps) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge backend-provided types with defaults (for labels/descriptions)
  const availableTypes: ReportTypeItem[] = useMemo(() => {
    if (!types || types.length === 0) return DEFAULT_TYPES;
    const map = new Map(DEFAULT_TYPES.map(t => [t.key, t] as const));
    return types.map(t => {
      const base = map.get(t.key) || { key: t.key as ReportType, label: t.label || t.key, description: t.description || '', href: `/dashboard/reports?type=${t.key}`, icon: FileText };
      return {
        ...base,
        label: t.label || base.label,
        description: t.description || base.description,
      };
    });
  }, [types]);

  // Filter suggestions by query
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableTypes;
    return availableTypes
      .map(item => {
        const score = (
          (item.label.toLowerCase().startsWith(q) ? 10 : item.label.toLowerCase().includes(q) ? 6 : 0) +
          (item.description.toLowerCase().includes(q) ? 3 : 0) +
          (item.key.toLowerCase().includes(q) ? 2 : 0)
        );
        return { item, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.item);
  }, [query, availableTypes]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          const s = suggestions[highlightedIndex];
          onSelect(s.key);
          onNavigate?.(s.href);
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, suggestions, highlightedIndex, onSelect, onNavigate]);

  useEffect(() => {
    if (query.trim().length > 0) setIsOpen(true);
    else setIsOpen(false);
  }, [query]);

  const handleSelect = (s: ReportTypeItem) => {
    onSelect(s.key);
    onNavigate?.(s.href);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar tipos de reporte (Ventas, Inventario, Clientes...)"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen((o) => !o)}
          className="hidden sm:flex items-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          Sugerencias
        </Button>
      </div>

      {isOpen && (
        <Card className="absolute z-20 mt-2 w-full shadow-lg">
          <ScrollArea className="max-h-64">
            <ul className="p-2">
              {suggestions.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">Sin resultados</li>
              ) : (
                suggestions.map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = idx === highlightedIndex;
                  return (
                    <li
                      key={s.key}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded cursor-pointer',
                        isActive ? 'bg-muted' : 'hover:bg-muted/50'
                      )}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(s)}
                      role="option"
                      aria-selected={isActive}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <div className="flex-1">
                        <div className="font-medium">{s.label}</div>
                        <div className="text-sm text-muted-foreground">{s.description}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}