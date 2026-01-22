"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Filter, SlidersHorizontal, ChevronDown, X, Save, RotateCcw, Check } from 'lucide-react';
import type { Product, Category } from '@/types';
import { formatPrice } from '@/utils/formatters';

export interface AdvancedCatalogFilters {
  mode: 'and' | 'or';
  categories: string[];
  minRating?: number;
  stockRange?: [number, number];
  includeTokens?: string[]; // terms to match in name/description
  features?: {
    vegan?: boolean;
    cruelty_free?: boolean;
    waterproof?: boolean;
  };
  spfMin?: number;
}

interface CatalogFilterBarProps {
  products: Product[];
  categories: Category[];
  activeFilters: AdvancedCatalogFilters;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  priceRange: [number, number];
  onApplyFilters: (next: {
    advanced: AdvancedCatalogFilters;
    inStockOnly: boolean;
    onSaleOnly: boolean;
    priceRange: [number, number];
  }) => void;
  onClear: () => void;
  resultsCount: number;
  totalCount: number;
  config: any;
}

export default function CatalogFilterBar({
  products,
  categories,
  activeFilters,
  inStockOnly,
  onSaleOnly,
  priceRange,
  onApplyFilters,
  onClear,
  resultsCount,
  totalCount,
  config
}: CatalogFilterBarProps) {
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [local, setLocal] = useState<AdvancedCatalogFilters>(activeFilters);
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; filters: AdvancedCatalogFilters; priceRange: [number, number]; inStockOnly: boolean; onSaleOnly: boolean }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('savedCatalogFilters');
      if (raw) setSavedPresets(JSON.parse(raw));
    } catch {}
  }, []);

  const allTokens = useMemo(() => {
    const names = products.map(p => p.name);
    const cats = categories.map(c => c.name);
    const brands = products.map(p => p.brand || '').filter(Boolean);
    const ingredients = products.map(p => p.ingredients || '').filter(Boolean);
    const tokens = new Set<string>();
    [...names, ...cats, ...brands, ...ingredients].forEach(t => {
      t.split(/\s+/).forEach(word => {
        const w = word.trim();
        if (w.length >= 3) tokens.add(w);
      });
    });
    return Array.from(tokens).sort((a, b) => a.localeCompare(b));
  }, [products, categories]);

  const filteredTokenSuggestions = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return allTokens.filter(t => t.toLowerCase().includes(q)).slice(0, 8);
  }, [query, allTokens]);

  const apply = () => {
    onApplyFilters({ advanced: local, inStockOnly, onSaleOnly, priceRange });
    setSuggestionsOpen(false);
  };

  const clear = () => {
    setQuery('');
    onClear();
    setSuggestionsOpen(false);
  };

  const savePreset = () => {
    const name = prompt('Nombre del preset de filtros');
    if (!name) return;
    const next = [...savedPresets, { name, filters: local, priceRange, inStockOnly, onSaleOnly }];
    setSavedPresets(next);
    try {
      localStorage.setItem('savedCatalogFilters', JSON.stringify(next));
    } catch {}
  };

  const loadPreset = (presetName: string) => {
    const p = savedPresets.find(s => s.name === presetName);
    if (!p) return;
    setLocal(p.filters);
    onApplyFilters({ advanced: p.filters, inStockOnly: p.inStockOnly, onSaleOnly: p.onSaleOnly, priceRange: p.priceRange });
  };

  const toggleCategory = (id: string) => {
    setLocal(prev => {
      const exists = prev.categories.includes(id);
      const categories = exists ? prev.categories.filter(c => c !== id) : [...prev.categories, id];
      return { ...prev, categories };
    });
  };

  const addToken = (token: string) => {
    setLocal(prev => ({ ...prev, includeTokens: Array.from(new Set([...(prev.includeTokens || []), token])) }));
    setQuery('');
  };

  const removeToken = (token: string) => {
    setLocal(prev => ({ ...prev, includeTokens: (prev.includeTokens || []).filter(t => t !== token) }));
  };

  return (
    <Card className="sticky top-16 z-30 border bg-card/90 backdrop-blur rounded-xl readable-section no-hard-shadows">
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Top Row: Search with suggestions and quick actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Popover open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSuggestionsOpen(true); }}
                      onFocus={() => setSuggestionsOpen(true)}
                      placeholder="Filtra por nombre, categoría o términos..."
                      aria-label="Filtro inteligente del catálogo"
                      className="flex-1 readable-text bg-background/80 border focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[320px] bg-popover backdrop-blur border" align="start">
                  <Command>
                    <CommandInput placeholder="Escribe para ver sugerencias..." />
                    <CommandEmpty>Sin sugerencias</CommandEmpty>
                    <CommandGroup>
                      {filteredTokenSuggestions.map(token => (
                        <CommandItem key={token} onSelect={() => addToken(token)}>
                          <Check className="mr-2 h-4 w-4" /> {token}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button variant="default" size="sm" onClick={apply} aria-label="Aplicar filtros" className="min-w-[90px]">
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Aplicar
            </Button>
            <Button variant="outline" size="sm" onClick={clear} aria-label="Limpiar filtros">
              <RotateCcw className="h-4 w-4 mr-1" /> Limpiar
            </Button>
            <Button variant="outline" size="sm" onClick={savePreset} aria-label="Guardar configuración de filtros">
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </div>

          {/* Second Row: Category multi-select, mode, sliders */}
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1" aria-label="Seleccionar categorías">
                  Categorías <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-2 bg-popover backdrop-blur border" align="start">
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={cn('w-full text-left px-2 py-1 rounded-md transition-colors',
                          local.categories.includes(cat.id) ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}
                        aria-pressed={local.categories.includes(cat.id)}
                        aria-label={`Categoría ${cat.name}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Lógica</Label>
                  <div className="flex gap-1" role="group" aria-label="Modo de combinación de filtros">
                    <Button
                      variant={local.mode === 'and' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLocal(prev => ({ ...prev, mode: 'and' }))}
                    >AND</Button>
                    <Button
                      variant={local.mode === 'or' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLocal(prev => ({ ...prev, mode: 'or' }))}
                    >OR</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Precio</Label>
              <div className="w-40">
                <Slider
                  value={priceRange}
                  onValueChange={(val: number[]) => onApplyFilters({ advanced: local, inStockOnly, onSaleOnly, priceRange: val as [number, number] })}
                  min={0}
                  max={Math.max(...products.map(p => p.sale_price), 1000)}
                  step={10}
                  aria-label="Rango de precio"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatPrice(priceRange[0], config)} - {formatPrice(priceRange[1], config)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Rating</Label>
              <div className="w-32">
                <Slider value={[local.minRating || 0]} onValueChange={(val) => setLocal(prev => ({ ...prev, minRating: (val as number[])[0] }))} min={0} max={5} step={0.5} aria-label="Rating mínimo" />
              </div>
              <span className="text-xs text-muted-foreground">{(local.minRating || 0)}+</span>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="in-stock-switch" className="text-xs text-muted-foreground">En stock</Label>
              <Switch id="in-stock-switch" checked={inStockOnly} onCheckedChange={(checked) => onApplyFilters({ advanced: local, inStockOnly: checked, onSaleOnly, priceRange })} aria-label="Mostrar solo productos en stock" />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="on-sale-switch" className="text-xs text-muted-foreground">En oferta</Label>
              <Switch id="on-sale-switch" checked={onSaleOnly} onCheckedChange={(checked) => onApplyFilters({ advanced: local, inStockOnly, onSaleOnly: checked, priceRange })} aria-label="Mostrar solo productos en oferta" />
            </div>

            {/* Beneficios y características: se removió el switch ‘Vegano’ para simplificar el catálogo */}
          </div>

          {/* Active filters tokens */}
          {(local.includeTokens && local.includeTokens.length > 0) || local.categories.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {local.includeTokens?.map(token => (
                <Badge key={token} variant="outline" className="gap-1">
                  {token}
                  <button aria-label={`Quitar ${token}`} onClick={() => removeToken(token)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {local.categories.map(catId => {
                const name = categories.find(c => c.id === catId)?.name || catId;
                return (
                  <Badge key={catId} variant="outline" className="gap-1">
                    {name}
                    <button aria-label={`Quitar ${name}`} onClick={() => toggleCategory(catId)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : null}

          {/* Footer: stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando {resultsCount} de {totalCount} productos
            </span>
            {savedPresets.length > 0 && (
              <div className="flex items-center gap-1">
                <span>Presets:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">Seleccionar <ChevronDown className="h-3 w-3" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-2 bg-popover backdrop-blur border">
                    <div className="space-y-1">
                      {savedPresets.map(p => (
                        <Button key={p.name} variant="ghost" size="sm" className="w-full justify-start" onClick={() => loadPreset(p.name)}>
                          {p.name}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}