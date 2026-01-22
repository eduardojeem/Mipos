"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import React from "react";
import { usePathname } from "next/navigation";

export type CashFilterConfig = {
  key: string
  label: string
  type: "select" | "date" | "text" | "number"
  value: string
  onChange: (v: string) => void
  options?: Array<{ value: string; label: string }>
  hidden?: boolean
  colSpan?: number
}

export default function CashFilters({
  title = "Filtros",
  filters,
  headerRight,
  onClear,
  columns = 4,
  collapsibleKey,
  defaultExpanded = true,
}: {
  title?: string
  filters: CashFilterConfig[]
  headerRight?: React.ReactNode
  onClear?: () => void
  columns?: number
  collapsibleKey?: string
  defaultExpanded?: boolean
}) {
  const pathname = usePathname();
  const storageKey = React.useMemo(() => {
    const base = collapsibleKey || title || "filters";
    return `cash-filters:${pathname}:${base}`;
  }, [pathname, collapsibleKey, title]);

  const [expanded, setExpanded] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return defaultExpanded;
    const v = sessionStorage.getItem(storageKey);
    return v === null ? defaultExpanded : v === "1";
  });

  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = React.useState<number>(0);

  React.useEffect(() => {
    if (!contentRef.current) return;
    const h = contentRef.current.scrollHeight;
    setMaxH(h);
  }, [filters, columns]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(storageKey, expanded ? "1" : "0");
  }, [expanded, storageKey]);
  const colsClass = (n: number) => {
    switch (n) {
      case 1: return "grid grid-cols-1 md:grid-cols-1 gap-3";
      case 2: return "grid grid-cols-1 md:grid-cols-2 gap-3";
      case 3: return "grid grid-cols-1 md:grid-cols-3 gap-3";
      default: return "grid grid-cols-1 md:grid-cols-4 gap-3";
    }
  };

  const spanClass = (n?: number) => {
    switch (n) {
      case 2: return "md:col-span-2";
      case 3: return "md:col-span-3";
      case 4: return "md:col-span-4";
      default: return undefined;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={storageKey}
              className="inline-flex items-center justify-center w-6 h-6 rounded-sm border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          id={storageKey}
          ref={contentRef}
          className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${expanded ? 'opacity-100' : 'opacity-0'}`}
          style={{ maxHeight: expanded ? (maxH || undefined) : 0 }}
          aria-hidden={!expanded}
        >
        <div className={colsClass(columns)}>
          {filters.map((f) => (
            <div key={f.key} className={spanClass(f.colSpan)} hidden={!!f.hidden}>
              <Label className="text-sm">{f.label}</Label>
              {f.type === "select" ? (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options || []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input type={f.type} value={f.value} onChange={(e) => f.onChange(e.target.value)} />
              )}
            </div>
          ))}
        </div>
        </div>
        {onClear && (
          <div className="flex justify-end mt-4">
            <Button variant="ghost" size="sm" onClick={onClear}>Limpiar filtros</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
