'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Scissors, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useServices, type Service } from '@/app/admin/services/hooks/useServices'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (serviceIds: string[]) => void
  excludeServiceIds?: string[]
  maxServices?: number
}

const DEFAULT_MAX_SERVICES = 30

export function ServiceSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  excludeServiceIds = [],
  maxServices = DEFAULT_MAX_SERVICES,
}: Props) {
  const { services, isLoading } = useServices()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedIds(new Set())
    }
  }, [open])

  const availableServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return services
      .filter((service) => !excludeServiceIds.includes(service.id))
      .filter((service) => {
        if (!query) return true
        return [
          service.name,
          service.description || '',
          service.category || '',
        ].some((value) => value.toLowerCase().includes(query))
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'es'))
  }, [excludeServiceIds, searchTerm, services])

  const toggleService = (serviceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else if (next.size < maxServices) {
        next.add(serviceId)
      }
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) return
    onConfirm(Array.from(selectedIds))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seleccionar servicios</DialogTitle>
          <DialogDescription>
            Elegí los servicios a los que se aplicará esta promoción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
              placeholder="Buscar por nombre, categoría o descripción..."
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{selectedIds.size} seleccionados</span>
            <span>Máximo {maxServices}</span>
          </div>

          <ScrollArea className="h-[360px] rounded-xl border">
            <div className="space-y-2 p-3">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Cargando servicios...</p>
              ) : availableServices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No se encontraron servicios disponibles.</p>
              ) : (
                availableServices.map((service: Service) => {
                  const isSelected = selectedIds.has(service.id)
                  const isDisabled = !isSelected && selectedIds.size >= maxServices

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => !isDisabled && toggleService(service.id)}
                      className={[
                        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-950/20'
                          : 'border-border hover:bg-muted/40',
                        isDisabled ? 'cursor-not-allowed opacity-50' : '',
                      ].join(' ')}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => toggleService(service.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-0.5"
                      />

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-violet-500" />
                          <span className="font-medium">{service.name}</span>
                          {isSelected ? <Check className="h-4 w-4 text-violet-500" /> : null}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {service.category ? <Badge variant="secondary">{service.category}</Badge> : null}
                          <Badge variant="outline">${Number(service.price || 0).toFixed(2)}</Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock3 className="h-3 w-3" />
                            {service.duration_min} min
                          </Badge>
                        </div>

                        {service.description ? (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Asociar {selectedIds.size > 0 ? `${selectedIds.size} servicio${selectedIds.size !== 1 ? 's' : ''}` : 'servicios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
