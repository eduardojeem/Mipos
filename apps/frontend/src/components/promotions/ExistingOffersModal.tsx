"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Search, Percent, Calendar } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";

export interface ExistingOffersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PromotionItem {
  id: string;
  name: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  applicableProducts: { id: string; category?: string }[];
}

function formatDiscount(p: PromotionItem) {
  return p.discountType === "PERCENTAGE" ? `${p.discountValue}%` : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(p.discountValue);
}

export default function ExistingOffersModal({ open, onOpenChange }: ExistingOffersModalProps) {
  const [items, setItems] = useState<PromotionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const { pagination, controls, setTotal, setLoading: setPagLoading } = usePagination({ initialLimit: 10 });
  const [sortBy, setSortBy] = useState<'name'|'startDate'|'endDate'|'isActive'>('name')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const { toast } = useToast();
  const isActiveRef = useRef(false);

  // Debounce search
  const debounceRef = useRef<number | undefined>(undefined);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(p => p.applicableProducts?.forEach(ap => { if (ap.category) set.add(ap.category); }));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const fetchData = async (opts?: { page?: number; limit?: number }) => {
    if (!open) return;
    try {
      setLoading(true);
      setPagLoading(true);
      const page = opts?.page ?? pagination.page;
      const limit = opts?.limit ?? pagination.limit;
      const res = await api.get("/promotions", {
        params: {
          page,
          limit,
          search: search || undefined,
          status,
          category: category === 'all' ? undefined : category,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      const raw = (res.data?.data || []) as any[];
      const total = res.data?.count || 0;
      const normalized = raw.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        discountType: (r.discountType ?? r.type) as 'PERCENTAGE' | 'FIXED_AMOUNT',
        discountValue: r.discountValue ?? r.value,
        startDate: r.startDate ?? r.start_date,
        endDate: r.endDate ?? r.end_date,
        isActive: typeof r.isActive !== 'undefined' ? r.isActive : r.is_active,
        applicableProducts: Array.isArray(r.applicableProducts) ? r.applicableProducts : []
      })) as PromotionItem[];
      if (isActiveRef.current) {
        setItems(normalized);
        setTotal(total);
      }
    } catch (err: any) {
      console.error("Error cargando promociones", err);
      const msg = String(err?.response?.data?.error || err?.message || 'Error desconocido');
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      setPagLoading(false);
    }
  };

  // Lazy load when opened
  useEffect(() => {
    isActiveRef.current = open;
    if (open) {
      fetchData();
    }
  }, [open]);

  // Refetch on filter changes with debounce for search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      controls.goToPage(1);
      fetchData({ page: 1 });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, category, dateFrom, dateTo]);

  // Sync on page or limit change
  useEffect(() => {
    if (!open) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  // Sorting and exports
  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let av: any = (a as any)[sortBy];
      let bv: any = (b as any)[sortBy];
      if (sortBy === 'startDate' || sortBy === 'endDate') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [items, sortBy, sortDir]);

  const toggleSort = (key: 'name'|'startDate'|'endDate'|'isActive') => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const exportToCSV = async () => {
    try {
      // Lazy load XLSX - Ahorro: ~800KB en bundle inicial
      const mod = await import('xlsx');
      const data = sortedItems.map(p => ({
        ID: p.id,
        Nombre: p.name,
        Estado: p.isActive ? 'Activa' : 'Inactiva',
        Descuento: formatDiscount(p),
        Inicio: new Date(p.startDate).toLocaleDateString('es-ES'),
        Fin: new Date(p.endDate).toLocaleDateString('es-ES'),
        Descripción: p.description,
      }));
      const ws = mod.utils.json_to_sheet(data);
      const csv = mod.utils.sheet_to_csv(ws);
      const bom = '\ufeff';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `promociones_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Exportación completada", description: "CSV generado correctamente" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo exportar a CSV", variant: "destructive" });
    }
  };

  const exportToExcel = async () => {
    try {
      // Lazy load XLSX - Ahorro: ~800KB en bundle inicial
      const mod = await import('xlsx');
      const data = sortedItems.map(p => ({
        ID: p.id,
        Nombre: p.name,
        Estado: p.isActive ? 'Activa' : 'Inactiva',
        Descuento: formatDiscount(p),
        Inicio: new Date(p.startDate).toLocaleDateString('es-ES'),
        Fin: new Date(p.endDate).toLocaleDateString('es-ES'),
        Descripción: p.description,
      }));
      const ws = mod.utils.json_to_sheet(data);
      const wb = mod.utils.book_new();
      mod.utils.book_append_sheet(wb, ws, 'Promociones');
      mod.writeFile(wb, `promociones_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Exportación completada", description: "Excel generado correctamente" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo exportar a Excel", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl" aria-labelledby="existing-offers-title" aria-describedby="existing-offers-desc">
        {/* Hidden title to satisfy Radix accessibility requirement */}
        <DialogTitle className="sr-only">Ofertas existentes</DialogTitle>
        <DialogHeader>
          <DialogTitle id="existing-offers-title">Ofertas existentes</DialogTitle>
          <DialogDescription id="existing-offers-desc">Explora, filtra y busca promociones ya creadas.</DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              aria-label="Buscar por nombre o código"
              placeholder="Buscar por nombre o código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div>
            <Select value={status} onValueChange={(v: "all"|"active"|"inactive") => setStatus(v)}>
              <SelectTrigger aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={category} onValueChange={(v) => setCategory(v)}>
              <SelectTrigger aria-label="Filtrar por categoría">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input aria-label="Fecha desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input aria-label="Fecha hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Table List */}
        <div className="mt-3">
          {loading ? (
            <div className="grid gap-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-gray-500">No hay promociones para los filtros seleccionados.</div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>Nombre {sortBy==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('startDate')}>Inicio {sortBy==='startDate' ? (sortDir==='asc'?'▲':'▼') : ''}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('endDate')}>Fin {sortBy==='endDate' ? (sortDir==='asc'?'▲':'▼') : ''}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('isActive')}>Estado {sortBy==='isActive' ? (sortDir==='asc'?'▲':'▼') : ''}</TableHead>
                    <TableHead className="w-24 text-right">ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit"><Percent className="h-3 w-3" />{formatDiscount(p)}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(p.startDate)}</TableCell>
                      <TableCell>{formatDate(p.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Activa" : "Inactiva"}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{p.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-2">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={controls.goToPage}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between gap-2 mt-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>Exportar CSV</Button>
            <Button variant="outline" onClick={exportToExcel}>Exportar Excel</Button>
          </div>
          <div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
