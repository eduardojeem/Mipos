'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { customerService, type CustomerFilters } from '@/lib/customer-service';
import type { Customer } from '@/types';

interface SuggestionCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (customer: SuggestionCustomer) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  limit?: number;
  autoFocus?: boolean;
}

export default function CustomerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar cliente por nombre, email o teléfono',
  className,
  disabled,
  limit = 10,
  autoFocus,
}: CustomerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SuggestionCustomer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canSearch = useMemo(() => (value?.trim().length ?? 0) >= 1, [value]);

  useEffect(() => {
    let cancelled = false;
    async function fetchSuggestions() {
      if (!canSearch) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const filters: CustomerFilters = {
          search: value.trim(),
          limit,
          status: 'all',
          type: 'all',
        } as any;
        const result = await customerService.getAll(filters);
        if (cancelled) return;
        const list = (result.customers || []).slice(0, limit).map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          customer_type: c.customer_type,
          status: c.status,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));
        setSuggestions(list);
        setOpen(list.length > 0);
        setActiveIndex(-1);
      } catch (e) {
        // Silently fail to keep UX smooth
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = setTimeout(fetchSuggestions, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, canSearch, limit]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = suggestions[activeIndex] || suggestions[0];
      if (selected) {
        onSelect(selected);
        onChange(`${selected.name}${selected.email ? ` (${selected.email})` : ''}`);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
      />
      {open && (
        <Card className="absolute z-20 mt-1 w-full overflow-hidden border shadow-lg">
          <ul className="max-h-64 overflow-auto">
            {suggestions.map((c, idx) => (
              <li
                key={c.id}
                className={cn(
                  'cursor-pointer px-3 py-2 hover:bg-muted/60',
                  activeIndex === idx ? 'bg-muted' : ''
                )}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(c);
                  onChange(`${c.name}${c.email ? ` (${c.email})` : ''}`);
                  setOpen(false);
                }}
              >
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.email || 'Sin email'} • {c.phone || 'Sin teléfono'}
                </div>
              </li>
            ))}
            {loading && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Buscando…</li>
            )}
            {!loading && suggestions.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}