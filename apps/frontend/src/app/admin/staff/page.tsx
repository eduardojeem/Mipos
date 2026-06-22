'use client'

import { useMemo, useState } from 'react'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  UserCog, 
  Clock, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle, 
  Award,
  CalendarDays,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useStaff, type StaffMember } from './hooks/useStaff'
import { StaffFormModal } from './components/StaffFormModal'
import { StaffExceptionsModal } from './components/StaffExceptionsModal'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function StaffPage() {
  const { staff, availableUsers, isLoading, isError, error, create, update, remove, isSaving } = useStaff()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [toDelete, setToDelete] = useState<StaffMember | null>(null)
  
  // Exceptions Modal state
  const [exceptionsOpen, setExceptionsOpen] = useState(false)
  const [exceptionsStaff, setExceptionsStaff] = useState<StaffMember | null>(null)

  // Filter professionals based on search text
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((s) => {
      const name = (s.display_name || s.user?.full_name || '').toLowerCase()
      const email = (s.user?.email || '').toLowerCase()
      const specialty = (s.specialty || '').toLowerCase()
      return name.includes(q) || email.includes(q) || specialty.includes(q)
    })
  }, [staff, search])

  // Staff KPIs
  const kpis = useMemo(() => {
    const total = staff.length
    const active = staff.filter((s) => s.is_active).length
    const avgCommission = staff.length > 0
      ? Math.round(staff.reduce((acc, s) => acc + Number(s.commission_pct || 0), 0) / staff.length)
      : 0
    return { total, active, avgCommission }
  }, [staff])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (s: StaffMember) => { setEditing(s); setModalOpen(true) }

  // Render weekly working hours beautifully using badges
  const renderSchedule = (s: StaffMember) => {
    if (!s.working_hours.length) {
      return (
        <span className="text-xs text-muted-foreground italic font-medium">Sin horario asignado.</span>
      )
    }

    const byDay = [...s.working_hours].sort((a, b) => {
      const norm = (d: number) => (d === 0 ? 7 : d) // Sunday at the end
      return norm(a.day_of_week) - norm(b.day_of_week)
    })

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {byDay.map((h, idx) => (
          <Badge key={idx} variant="outline" className="text-[10px] bg-muted/40 font-semibold px-2 py-0.5 rounded-lg border-border/60">
            <span className="text-muted-foreground mr-1">{DAY_LABELS[h.day_of_week]}:</span>
            <span className="text-foreground">{h.start_time.slice(0, 5)}–{h.end_time.slice(0, 5)}</span>
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10 px-1 animate-slide-up">
      {/* Header Area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground tracking-tight">
            <UserCog className="h-6 w-6 text-primary" /> Profesionales
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Personal y barberos disponibles: especialidad, comisiones y configuración de horarios.
          </p>
        </div>
        <Button onClick={openNew} className="btn-premium rounded-xl shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Agregar profesional
        </Button>
      </div>

      {/* KPI Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-500">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Profesionales</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{kpis.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activos</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{kpis.active}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comisión Promedio</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{kpis.avgCommission}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Filter Panel */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-2xl border border-border/40 shadow-sm">
        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar profesional por nombre, especialidad..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 h-9 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Main Staff View */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {[1, 2].map((n) => (
            <div key={n} className="border rounded-2xl p-5 bg-card space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 skeleton-premium rounded-2xl" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 w-32 skeleton-premium rounded" />
                  <div className="h-3 w-48 skeleton-premium rounded" />
                </div>
              </div>
              <div className="h-3 w-full skeleton-premium rounded mt-3" />
              <div className="h-6 w-3/4 skeleton-premium rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive font-medium">
            {error?.message || 'Error al cargar los profesionales.'}
          </CardContent>
        </Card>
      ) : staff.length === 0 ? (
        availableUsers.length === 0 ? (
          <Card className="border-dashed bg-muted/10">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-amber-500/10 p-4">
                <AlertCircle className="h-10 w-10 text-amber-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-lg">Registrá a tu personal</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Para poder agregar un profesional, primero debés registrar a los miembros de tu equipo como usuarios de la empresa.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/admin/users-roles'} className="btn-premium rounded-xl shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Crear usuario en Usuarios y Roles
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed bg-muted/10">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <UserCog className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-lg">No hay profesionales registrados</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Aún no has registrado a tus barberos o personal en el sistema.
                </p>
              </div>
              <Button onClick={openNew} className="btn-premium rounded-xl shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Agregar primer profesional
              </Button>
            </CardContent>
          </Card>
        )
      ) : filteredStaff.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg">Sin resultados</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ningún profesional coincide con la búsqueda "{search}".
              </p>
            </div>
            <Button onClick={() => setSearch('')} variant="outline" className="rounded-xl">
              <XCircle className="mr-2 h-4 w-4" /> Limpiar filtro
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Staff Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStaff.map((s) => {
            const name = s.display_name || s.user?.full_name || s.user?.email || 'Profesional'
            const staffColor = s.color || '#6366f1'
            return (
              <Card 
                key={s.id} 
                className={cn(
                  "glass-card overflow-hidden hover-lift hover-glow flex flex-col border-t-4",
                  !s.is_active && "opacity-70"
                )}
                style={{ borderTopColor: staffColor }}
              >
                <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {/* Stylized Avatar */}
                      <span 
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-sm" 
                        style={{ backgroundColor: staffColor }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-foreground truncate">{name}</h3>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{s.user?.email}</p>
                        
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {s.specialty ? (
                            <Badge variant="outline" className="text-[10px] font-semibold border-primary/20 text-primary">
                              <Award className="h-3 w-3 mr-1" /> {s.specialty}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                              Barbero
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {Number(s.commission_pct)}% comisión
                          </Badge>
                          {!s.is_active && (
                            <Badge variant="destructive" className="text-[10px] tracking-wide uppercase px-2">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Quick Action Buttons */}
                    <div className="flex flex-shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg" title="Días Libres / Excepciones" onClick={() => { setExceptionsStaff(s); setExceptionsOpen(true) }}>
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-lg" title="Editar" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg" title="Eliminar" onClick={() => setToDelete(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="border-t border-border/40 pt-3 mt-1">
                    {s.walkin_only ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <UserCog className="h-3.5 w-3.5" />
                          <span>Modalidad de Trabajo</span>
                        </div>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-lg border-amber-500/20">
                            Orden de llegada (Sin turnos)
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Horario de Atención</span>
                        </div>
                        {renderSchedule(s)}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      <StaffFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        staff={editing}
        availableUsers={availableUsers}
        isSaving={isSaving}
        onSubmit={(input) => (editing ? update({ id: editing.id, input }) : create(input))}
      />

      {/* Exceptions Modal */}
      <StaffExceptionsModal
        open={exceptionsOpen}
        onOpenChange={setExceptionsOpen}
        staffProfileId={exceptionsStaff?.id || null}
        staffName={exceptionsStaff?.display_name || exceptionsStaff?.user?.full_name || exceptionsStaff?.user?.email || 'Profesional'}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">¿Eliminar profesional?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
              Se eliminará de forma permanente la ficha de <span className="font-semibold text-foreground">{toDelete?.display_name || toDelete?.user?.full_name || toDelete?.user?.email}</span> y todos sus horarios de atención del sistema. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-3 gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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
