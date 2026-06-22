'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type Service = {
  id: string
  name: string
  description: string | null
  duration_min: number
  price: number
  category: string | null
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ServiceInput = {
  name: string
  description?: string | null
  duration_min: number
  price: number
  category?: string | null
  color?: string | null
  is_active?: boolean
}

function orgHeaders(orgId: string, json = false): HeadersInit {
  return json
    ? { 'Content-Type': 'application/json', 'x-organization-id': orgId }
    : { 'x-organization-id': orgId }
}

async function fetchServices(orgId: string): Promise<Service[]> {
  const res = await fetch('/api/services?limit=500', { headers: orgHeaders(orgId) })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Error al cargar los servicios')
  }
  const json = await res.json()
  return (json.services || []) as Service[]
}

async function createService(orgId: string, input: ServiceInput): Promise<void> {
  const res = await fetch('/api/services', { method: 'POST', headers: orgHeaders(orgId, true), body: JSON.stringify(input) })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Error al crear el servicio')
  }
}

async function updateService(orgId: string, id: string, input: ServiceInput): Promise<void> {
  const res = await fetch(`/api/services/${id}`, { method: 'PUT', headers: orgHeaders(orgId, true), body: JSON.stringify(input) })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Error al actualizar el servicio')
  }
}

async function deleteService(orgId: string, id: string): Promise<void> {
  const res = await fetch(`/api/services/${id}`, { method: 'DELETE', headers: orgHeaders(orgId) })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Error al eliminar el servicio')
  }
}

export function useServices() {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const servicesQuery = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => fetchServices(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services', orgId] })

  const createMutation = useMutation({
    mutationFn: (input: ServiceInput) => createService(orgId!, input),
    onSuccess: () => { invalidate(); toast({ title: 'Servicio creado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceInput }) => updateService(orgId!, id, input),
    onSuccess: () => { invalidate(); toast({ title: 'Servicio actualizado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  // Activar/desactivar rápido con update optimista (revierte si falla).
  const toggleMutation = useMutation({
    mutationFn: ({ service, active }: { service: Service; active: boolean }) =>
      updateService(orgId!, service.id, {
        name: service.name,
        description: service.description,
        duration_min: service.duration_min,
        price: service.price,
        category: service.category,
        color: service.color,
        is_active: active,
      }),
    onMutate: async ({ service, active }) => {
      await queryClient.cancelQueries({ queryKey: ['services', orgId] })
      const previous = queryClient.getQueryData<Service[]>(['services', orgId])
      queryClient.setQueryData<Service[]>(['services', orgId], (old) =>
        (old || []).map((s) => (s.id === service.id ? { ...s, is_active: active } : s)),
      )
      return { previous }
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['services', orgId], context.previous)
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
    onSettled: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(orgId!, id),
    onSuccess: () => { invalidate(); toast({ title: 'Servicio eliminado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  return {
    services: servicesQuery.data ?? [],
    isLoading: servicesQuery.isLoading,
    isError: servicesQuery.isError,
    error: servicesQuery.error as Error | null,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    toggleActive: (service: Service, active: boolean) => toggleMutation.mutate({ service, active }),
    isSaving: createMutation.isPending || updateMutation.isPending,
  }
}
