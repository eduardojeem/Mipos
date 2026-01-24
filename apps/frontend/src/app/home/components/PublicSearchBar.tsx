"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGlobalSearch, type SearchResultType } from "@/hooks/use-global-search";
import { SearchResults as PublicSearchResults } from "@/components/search/SearchResults";

export default function PublicSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "public-search-listbox";

  // ✅ FIX: Memoizar options para evitar recrear en cada render y causar loop infinito
  const searchOptions = useMemo(() => ({
    debounceMs: 300,
    minSearchLength: 2,
    maxResults: 10,
    enabledTypes: ['product', 'category'] as SearchResultType[],
  }), []); // Array vacío - estas opciones nunca cambian

  // Tipos habilitados fijos - solo productos y categorías para simplicidad
  const { results, groupedResults, isLoading, isEmpty } = useGlobalSearch(query, searchOptions);

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = String(query || "").trim();
    if (!q) return;
    router.push(`/catalog?search=${encodeURIComponent(q)}`);
    setOpen(false);
    setQuery("");
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
        router.push(r.href);
        setOpen(false);
        setQuery("");
      } else {
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <form onSubmit={onSubmit} className="relative w-full">
            <div className="group relative flex items-center">
              {/* Search Icon */}
              <Search
                className="absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none"
                aria-hidden="true"
              />

              {/* Input */}
              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(e.target.value.length >= 2);
                  setSelectedIndex(0);
                }}
                onFocus={() => query.length >= 2 && setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Buscar productos..."
                aria-label="Buscar productos y categorías"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-9 text-sm placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-purple-500 dark:focus-visible:ring-purple-400 transition-all"
              />

              {/* Clear Button */}
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </PopoverTrigger>

        {/* Results Dropdown */}
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-slate-200 dark:border-slate-700"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div
            role="listbox"
            id={listboxId}
            aria-label="Resultados de búsqueda"
            className="max-h-[400px] overflow-auto"
          >
            {query.length >= 2 ? (
              <PublicSearchResults
                results={results}
                groupedResults={groupedResults}
                isLoading={isLoading}
                isEmpty={isEmpty}
                query={query}
                selectedIndex={selectedIndex}
                onSelect={(r) => {
                  router.push(r.href);
                  setOpen(false);
                  setQuery("");
                }}
                onClose={() => setOpen(false)}
              />
            ) : (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
