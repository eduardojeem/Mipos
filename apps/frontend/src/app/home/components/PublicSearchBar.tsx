"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBusinessConfig } from "@/contexts/BusinessConfigContext";
import { SearchResults as PublicSearchResults } from "@/components/search/SearchResults";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useTenantPublicRouting } from "@/hooks/useTenantPublicRouting";
import type { SearchResult, SearchResultType } from "@/hooks/use-global-search";

const supabase = createClient();

export default function PublicSearchBar() {
  const router = useRouter();
  const { organizationId } = useBusinessConfig();
  const { tenantHref } = useTenantPublicRouting();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const listboxId = "public-search-listbox";

  useEffect(() => {
    const searchTerm = debouncedQuery.trim();

    if (!organizationId || searchTerm.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setIsLoading(true);

      try {
        const [productsResult, categoriesResult] = await Promise.all([
          supabase
            .from("products")
            .select("id,name,sku,stock_quantity,sale_price")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
            .limit(8),
          supabase
            .from("categories")
            .select("id,name,description")
            .eq("organization_id", organizationId)
            .ilike("name", `%${searchTerm}%`)
            .limit(4),
        ]);

        if (cancelled) {
          return;
        }

        const productResults: SearchResult[] = (productsResult.data || []).map((product: any) => ({
          id: String(product.id),
          type: "product",
          title: String(product.name || "Producto"),
          subtitle: product.sku ? `SKU: ${product.sku}` : "Producto publicado",
          description: `Stock: ${Number(product.stock_quantity || 0)}`,
          href: tenantHref(`/catalog/${product.id}`),
          metadata: product,
        }));

        const categoryResults: SearchResult[] = (categoriesResult.data || []).map((category: any) => ({
          id: String(category.id),
          type: "category",
          title: String(category.name || "Categoria"),
          subtitle: "Categoria",
          description: category.description || "Filtra el catalogo por esta categoria.",
          href: tenantHref(`/catalog?category=${category.id}`),
          metadata: category,
        }));

        setResults([...productResults, ...categoryResults]);
      } catch (error) {
        console.error("Error searching tenant public catalog:", error);
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, organizationId, tenantHref]);

  const groupedResults = useMemo(
    () =>
      results.reduce((acc, result) => {
        const type = result.type as SearchResultType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(result);
        return acc;
      }, {} as Record<SearchResultType, SearchResult[]>),
    [results]
  );

  const isEmpty = !isLoading && debouncedQuery.trim().length >= 2 && results.length === 0;

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = String(query || "").trim();
    if (!q) return;
    router.push(tenantHref(`/catalog?search=${encodeURIComponent(q)}`));
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
        const result = results[selectedIndex];
        router.push(result.href);
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
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />

              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(e.target.value.trim().length >= 2);
                  setSelectedIndex(0);
                }}
                onFocus={() => query.trim().length >= 2 && setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Buscar productos..."
                aria-label="Buscar productos y categorias"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm placeholder:text-slate-500 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:ring-emerald-400"
              />

              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Limpiar busqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </form>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] border-slate-200 p-0 shadow-xl dark:border-slate-700"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div
            role="listbox"
            id={listboxId}
            aria-label="Resultados de busqueda"
            className="max-h-[400px] overflow-auto"
          >
            {query.trim().length >= 2 ? (
              <PublicSearchResults
                results={results}
                groupedResults={groupedResults}
                isLoading={isLoading}
                isEmpty={isEmpty}
                query={query}
                selectedIndex={selectedIndex}
                onSelect={(result) => {
                  router.push(result.href);
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
