'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Search, Scissors, Clock, CheckCircle2,
  LayoutGrid, List, AlertCircle, XCircle, Tag, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import { useServices, type Service } from './hooks/useServices'
import { ServiceFormModal } from './components/ServiceFormModal'

function Kpi({ icon: Icon, label, value }: { icon: typeof Scissors; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ServicesPage() {
  const { services, isLoading, isError, error, create, update, remove, toggleActive, isSaving } = useServices()

  // Filtros en la URL → compartibles y persistentes al recargar.
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const search = params.get('q') ?? ''
  const activeCategory = params.get('cat') ?? 'ALL'
  const viewType: 'grid' | 'table' = params.get('view') === 'table' ? 'table' : 'grid'

  const applyParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  const setSearch = (v: string) => applyParams({ q: v })
  const setActiveCategory = (v: string) => applyParams({ cat: v === 'ALL' ? null : v })
  const setViewType = (v: 'grid' | 'table') => applyParams({ view: v === 'grid' ? null : v })
  const clearFilters = () => applyParams({ q: null, cat: null })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [toDelete, setToDelete] = useState<Service | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const s of services) if (s.category) set.add(s.category)
    return Array.from(set).sort()
  }, [services])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((s) => {
      if (activeCategory !== 'ALL' && s.category !== activeCategory) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [services, search, activeCategory])

  const kpis = useMemo(() => {
    const active = services.filter((s) => s.is_active)
    const avgDuration = active.length > 0
      ? Math.round(active.reduce((acc, s) => acc + (s.duration_min || 0), 0) / active.length)
      : 0
    return {
      total: services.length,
      active: active.length,
      categories: new Set(services.map((s) => s.category).filter(Boolean)).size,
      avgDuration,
    }
  }, [services])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (s: Service) => { setEditing(s); setModalOpen(true) }

  const StatusBadge = ({ active }: { active: boolean }) =>
    active ? (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">Activo</Badge>
    ) : (
      <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">Inactivo</Badge>
    )

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-1 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Scissors className="h-6 w-6 text-muted-foreground" aria-hidden="true" /> Servicios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Precio, duración y categoría de los servicios que ofrecés. La duración alimenta la agenda de turnos.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nuevo servicio
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Scissors} label="Total" value={kpis.total} />
        <Kpi icon={CheckCircle2} label="Activos" value={kpis.active} />
        <Kpi icon={Tag} label="Categorías" value={kpis.categories} />
        <Kpi icon={Clock} label="Duración prom." value={`${kpis.avgDuration} min`} />
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Buscar servicio"
                placeholder="Buscar por nombre o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Cambiar vista">
              <Button variant={viewType === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setViewType('grid')} aria-pressed={viewType === 'grid'}>
                <LayoutGrid className="h-3.5 w-3.5" /> Mosaico
              </Button>
              <Button variant={viewType === 'table' ? 'secondary' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setViewType('table')} aria-pressed={viewType === 'table'}>
                <List className="h-3.5 w-3.5" /> Tabla
              </Button>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Categoría:</span>
              <Button variant={activeCategory === 'ALL' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setActiveCategory('ALL')}>Todas</Button>
              {categories.map((cat) => (
                <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setActiveCategory(cat)}>{cat}</Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Cargando servicios">
          {[1, 2, 3].map((n) => (
            <Card key={n}><CardContent className="space-y-4 p-4">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
            </CardContent></Card>
          ))}
        </div>
      ) : isError ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
          <XCircle className="h-10 w-10 text-rose-500" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{error?.message || 'No se pudieron cargar los servicios.'}</p>
        </CardContent></Card>
      ) : services.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-16 text-center" role="status">
          <div className="rounded-full bg-muted p-4"><Scissors className="h-9 w-9 text-muted-foreground" aria-hidden="true" /></div>
          <div>
            <h3 className="font-semibold text-foreground">No hay servicios cargados</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Cargá el primer servicio para empezar a agendar turnos.</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Crear el primer servicio</Button>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-16 text-center" role="status">
          <AlertCircle className="h-10 w-10 text-amber-500" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-foreground">Sin resultados</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ningún servicio coincide con los filtros.</p>
          </div>
          <Button onClick={clearFilters} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Limpiar filtros</Button>
        </CardContent></Card>
      ) : viewType === 'grid' ? (
        <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Card className={cn('flex h-full flex-col border-l-4', !s.is_active && 'opacity-70')} style={{ borderLeftColor: s.color || 'hsl(var(--border))' }}>
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">{s.name}</h3>
                      {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
                    </div>
                    <StatusBadge active={s.is_active} />
                  </div>

                  {s.description
                    ? <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                    : <p className="text-sm italic text-muted-foreground/60">Sin descripción</p>}

                  <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Precio</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(Number(s.price), '')}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {s.duration_min} min
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive(s, v)} aria-label={`${s.is_active ? 'Desactivar' : 'Activar'} ${s.name}`} />
                      {s.is_active ? 'Activo' : 'Inactivo'}
                    </label>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} aria-label={`Editar ${s.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30" onClick={() => setToDelete(s)} aria-label={`Eliminar ${s.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className={cn(!s.is_active && 'opacity-60')}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 shrink-0 rounded-full border border-border" style={{ backgroundColor: s.color ?? 'transparent' }} aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{s.name}</p>
                          {s.description && <p className="max-w-sm truncate text-xs text-muted-foreground">{s.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{s.category ? <Badge variant="outline" className="text-[11px]">{s.category}</Badge> : <span className="text-xs text-muted-foreground/60">—</span>}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {s.duration_min} min
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{formatCurrency(Number(s.price), '')}</TableCell>
                    <TableCell>
                      <label className="flex cursor-pointer items-center gap-2">
                        <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive(s, v)} aria-label={`${s.is_active ? 'Desactivar' : 'Activar'} ${s.name}`} />
                        <span className="text-xs text-muted-foreground">{s.is_active ? 'Activo' : 'Inactivo'}</span>
                      </label>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} aria-label={`Editar ${s.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30" onClick={() => setToDelete(s)} aria-label={`Eliminar ${s.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Form Modal */}
      <ServiceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={editing}
        isSaving={isSaving}
        onSubmit={(input) => (editing ? update({ id: editing.id, input }) : create(input))}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <span className="font-semibold text-foreground">{toDelete?.name}</span> del catálogo. Si tiene turnos asociados no se podrá borrar — en ese caso, desactivalo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {toDelete?.is_active && (
              <Button variant="outline" onClick={() => { if (toDelete) toggleActive(toDelete, false); setToDelete(null) }}>
                Desactivar
              </Button>
            )}
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (toDelete) remove(toDelete.id); setToDelete(null) }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
