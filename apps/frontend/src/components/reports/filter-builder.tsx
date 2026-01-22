'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, History, Wand2, X } from 'lucide-react';

export interface SharedFilters {
  productId?: string;
  categoryId?: string;
  customerId?: string;
  supplierId?: string;
  userId?: string;
}

interface FilterBuilderProps {
  title?: string;
  filters: SharedFilters;
  onChange: (next: SharedFilters) => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({ title = 'Filtros avanzados', filters, onChange }) => {
  const update = (key: keyof SharedFilters, value: string) => {
    const next = { ...filters, [key]: value || undefined };
    onChange(next);
  };

  // Presets de filtros (persistencia local)
  type FilterPreset = { id: string; name: string; filters: SharedFilters; createdAt: string };
  const PRESETS_KEY = 'reports.filterBuilder.presets';

  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch {}
  }, []);

  const persistPresets = (next: FilterPreset[]) => {
    setPresets(next);
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); } catch {}
  };

  const saveCurrentAsPreset = () => {
    const name = newPresetName.trim() || `Preset ${presets.length + 1}`;
    const preset: FilterPreset = {
      id: `${Date.now()}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    persistPresets([preset, ...presets]);
    setNewPresetName('');
    setSelectedPresetId(preset.id);
  };

  const applyPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;
    onChange(preset.filters);
    pushHistory(preset.filters);
  };

  const deletePreset = (id: string) => {
    const next = presets.filter(p => p.id !== id);
    persistPresets(next);
    if (selectedPresetId === id) setSelectedPresetId('');
  };

  // Historial de filtros (memoria de sesión)
  type FiltersHistoryItem = { id: string; filters: SharedFilters; appliedAt: string };
  const [history, setHistory] = useState<FiltersHistoryItem[]>([]);
  const pushHistory = (f: SharedFilters) => {
    const item: FiltersHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      filters: f,
      appliedAt: new Date().toISOString(),
    };
    setHistory(prev => [item, ...prev].slice(0, 10));
  };
  const clearHistory = () => setHistory([]);

  useEffect(() => {
    // Primer render: guardar el estado inicial en historial
    pushHistory(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFilterEntries = useMemo(() => Object.entries(filters).filter(([, v]) => !!v), [filters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets / Guardados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Aplicar preset</Label>
            <div className="flex gap-2">
              <Select value={selectedPresetId} onValueChange={(val) => { setSelectedPresetId(val); applyPreset(val); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar preset" />
                </SelectTrigger>
                <SelectContent>
                  {presets.length === 0 && (
                    <SelectItem value="__no_presets__" disabled>
                      No hay presets
                    </SelectItem>
                  )}
                  {presets.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPresetId && (
                <Button variant="outline" size="sm" onClick={() => applyPreset(selectedPresetId)} title="Aplicar">
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Guardar preset</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del preset"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
              <Button variant="default" size="sm" onClick={saveCurrentAsPreset} title="Guardar">
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gestionar presets</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <Badge key={p.id} variant="secondary" className="gap-1">
                  {p.name}
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => applyPreset(p.id)} title="Aplicar">
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => deletePreset(p.id)} title="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              ))}
              {presets.length === 0 && (
                <Badge variant="outline">Sin presets</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Campos de filtros compartidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Producto (ID)</Label>
            <Input
              id="productId"
              placeholder="Ej: prod_123"
              value={filters.productId || ''}
              onChange={(e) => update('productId', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría (ID)</Label>
            <Input
              id="categoryId"
              placeholder="Ej: cat_456"
              value={filters.categoryId || ''}
              onChange={(e) => update('categoryId', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerId">Cliente (ID)</Label>
            <Input
              id="customerId"
              placeholder="Ej: cust_789"
              value={filters.customerId || ''}
              onChange={(e) => update('customerId', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplierId">Proveedor (ID)</Label>
            <Input
              id="supplierId"
              placeholder="Opcional"
              value={filters.supplierId || ''}
              onChange={(e) => update('supplierId', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userId">Usuario (ID)</Label>
            <Input
              id="userId"
              placeholder="Opcional"
              value={filters.userId || ''}
              onChange={(e) => update('userId', e.target.value)}
            />
          </div>
        </div>

        {/* Filtros activos */}
        <div className="space-y-2">
          <Label>Filtros activos</Label>
          <div className="flex flex-wrap gap-2">
            {activeFilterEntries.map(([key, value]) => (
              <Badge key={key} variant="secondary" className="gap-1">
                {key}: {String(value)}
                <X className="h-3 w-3 cursor-pointer" onClick={() => update(key as keyof SharedFilters, '')} />
              </Badge>
            ))}
            {activeFilterEntries.length === 0 && (
              <Badge variant="outline">Sin filtros</Badge>
            )}
          </div>
        </div>

        {/* Historial de filtros */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><History className="h-4 w-4" /> Historial de filtros</Label>
            <Button variant="ghost" size="sm" onClick={clearHistory}>Limpiar</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <Badge key={h.id} variant="secondary" className="gap-2">
                {Object.entries(h.filters).filter(([, v]) => !!v).map(([k, v]) => `${k}:${v}`).join(', ') || 'Vacío'}
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onChange(h.filters)} title="Aplicar">
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
              </Badge>
            ))}
            {history.length === 0 && (
              <Badge variant="outline">Sin historial</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};