"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, History, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGlobalSearch, type SearchResultType } from "@/hooks/use-global-search";

type EnabledMap = Record<SearchResultType, boolean>;

export default function PublicSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "public-search-listbox";

  const [enabledTypes, setEnabledTypes] = useState<EnabledMap>({
    product: true,
    category: true,
    customer: false,
    sale: false,
    supplier: false,
    page: true,
  });

  const activeTypes = useMemo(
    () => (Object.entries(enabledTypes).filter(([, v]) => v).map(([k]) => k) as SearchResultType[]),
    [enabledTypes]
  );

  const { results, groupedResults, isLoading, isEmpty } = useGlobalSearch(query, {
    debounceMs: 250,
    minSearchLength: 2,
    maxResults: 15,
    enabledTypes: activeTypes,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("public-search-history") || "[]";
      const arr = JSON.parse(raw) as string[];
      setRecent(arr.slice(0, 5));
    } catch {}
  }, []);

  const saveRecent = (term: string) => {
    if (!term) return;
    try {
      const raw = localStorage.getItem("public-search-history") || "[]";
      const arr = Array.isArray(JSON.parse(raw)) ? (JSON.parse(raw) as string[]) : [];
      const next = [term, ...arr.filter((t) => t !== term)].slice(0, 8);
      localStorage.setItem("public-search-history", JSON.stringify(next));
      setRecent(next.slice(0, 5));
    } catch {}
  };

  const onSubmit = () => {
    const q = String(query || "").trim();
    if (!q) return;
    saveRecent(q);
    router.push(`/catalog?search=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        const r = results[selectedIndex];
        saveRecent(query);
        router.push(r.href);
        setOpen(false);
      } else {
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const toggleType = (type: SearchResultType) => {
    setEnabledTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="relative w-full max-w-[28rem]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="group flex items-center gap-2 rounded-2xl border bg-white/90 dark:bg-slate-900/70 dark:border-slate-800 px-3 py-2 shadow-sm hover:shadow-md transition-all focus-within:ring-2 focus-within:ring-sky-500/40 backdrop-blur-md">
            <Search className="h-5 w-5 text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300" aria-hidden="true" />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setShowHistory(e.target.value.length === 0);
                setSelectedIndex(0);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Buscar productos y categorías"
              aria-label="Buscar en catálogo"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              className="h-9 w-full border-0 bg-transparent px-0 text-sm placeholder:text-slate-500 focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              onClick={() => setOpen((v) => !v)}
              aria-label="Abrir resultados"
            >
              <Badge variant="secondary" className="mr-2 hidden sm:inline-flex">{results.length}</Badge>
              Buscar
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2 h-8 w-8"
                  aria-label="Filtros de búsqueda"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Tipos</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabledTypes.product} onCheckedChange={() => toggleType("product")} />Productos</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabledTypes.category} onCheckedChange={() => toggleType("category")} />Categorías</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabledTypes.page} onCheckedChange={() => toggleType("page")} />Páginas</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabledTypes.supplier} onCheckedChange={() => toggleType("supplier")} />Proveedores</label>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Aplicar</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div role="listbox" id={listboxId} aria-label="Sugerencias" className="max-h-[420px] overflow-auto">
            {showHistory && recent.length > 0 && query.length === 0 ? (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><History className="h-4 w-4" />Recientes</div>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => { localStorage.setItem("public-search-history", "[]"); setRecent([]); }} aria-label="Limpiar historial"><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-1">
                  {recent.map((term) => (
                    <button key={term} className="text-left px-3 py-2 rounded hover:bg-accent" onClick={() => { setQuery(term); setShowHistory(false); setOpen(true); inputRef.current?.focus(); }}>
                      <span className="text-sm">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-0">
                <PublicSearchResults
                  results={results}
                  groupedResults={groupedResults}
                  isLoading={isLoading}
                  isEmpty={isEmpty}
                  query={query}
                  selectedIndex={selectedIndex}
                  onSelect={(r) => { saveRecent(query); router.push(r.href); setOpen(false); }}
                  onClose={() => setOpen(false)}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { SearchResults as PublicSearchResults } from "@/components/search/SearchResults";

