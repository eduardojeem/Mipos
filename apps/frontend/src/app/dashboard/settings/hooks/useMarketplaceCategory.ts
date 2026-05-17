'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type MarketplaceCategoryOption = {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string
  description: string | null
  is_featured?: boolean
}

type OrgMarketplaceCategoryResponse = {
  success: boolean
  marketplace_category_id: string | null
  category: MarketplaceCategoryOption | null
}

// Carga todas las categorías del marketplace disponibles (para el selector)
async function fetchAllMarketplaceCategories(): Promise<MarketplaceCategoryOption[]> {
  const res = await fetch('/api/marketplace/categories', { cache: 'no-store' })
  if (!res.ok) return []
  const json = await res.json()
  return json.categories || []
}

// Carga la categoría actual de la org
async function fetchOrgMarketplaceCategory(orgId: string): Promise<OrgMarketplaceCategoryResponse> {
  const res = await fetch('/api/organizations/marketplace-category', {
    headers: { 'x-organization-id': orgId },
    cache: 'no-store',
  })
  if (!res.ok) return { success: false, marketplace_category_id: null, category: null }
  return res.json()
}

// Actualiza la categoría de la org
async function updateOrgMarketplaceCategory(orgId: string, categoryId: string | null): Promise<void> {
  const res = await fetch('/api/organizations/marketplace-category', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
    body: JSON.stringify({ marketplace_category_id: categoryId }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Error al actualizar el rubro del marketplace')
  }
}

export function useMarketplaceCategory() {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const allCategoriesQuery = useQuery({
    queryKey: ['marketplace-categories-all'],
    queryFn: fetchAllMarketplaceCategories,
    staleTime: 5 * 60 * 1000, // 5 min
  })

  const orgCategoryQuery = useQuery({
    queryKey: ['org-marketplace-category', orgId],
    queryFn: () => fetchOrgMarketplaceCategory(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (categoryId: string | null) => updateOrgMarketplaceCategory(orgId!, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-marketplace-category', orgId] })
      toast({ title: 'Rubro público actualizado', description: 'Tu empresa ahora aparece en el marketplace correctamente.' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' })
    },
  })

  return {
    allCategories:       allCategoriesQuery.data ?? [],
    currentCategoryId:   orgCategoryQuery.data?.marketplace_category_id ?? null,
    currentCategory:     orgCategoryQuery.data?.category ?? null,
    isLoading:           allCategoriesQuery.isLoading || orgCategoryQuery.isLoading,
    isSaving:            updateMutation.isPending,
    updateCategory:      (id: string | null) => updateMutation.mutate(id),
  }
}
