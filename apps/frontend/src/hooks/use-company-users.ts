'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminApiService, type User } from '@/lib/services/admin-api'

interface UseCompanyUsersOptions {
  organizationId?: string
  search?: string
  role?: string
  status?: string
  enabled?: boolean
  page?: number
  pageSize?: number
}

interface CreateCompanyUserInput {
  email: string
  password: string
  name: string
  role: string
  status?: string
  organizationId?: string
}

interface UpdateCompanyUserInput {
  userId: string
  data: {
    name?: string
    email?: string
    role?: string
    password?: string
    status?: string
    organizationId?: string
  }
}

export function useCompanyUsers(options: UseCompanyUsersOptions = {}) {
  const {
    organizationId,
    search = '',
    role = 'ALL',
    status = 'ALL',
    enabled = true,
    page = 1,
    pageSize = 200,
  } = options

  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  const normalizedSearch = search.trim()
  const normalizedRole = role === 'ALL' ? '' : role
  const normalizedStatus = status === 'ALL' ? '' : status
  const isEnabled = enabled && Boolean(organizationId)

  const queryKey = useMemo(
    () => ['company-users', organizationId || '', normalizedSearch, normalizedRole, normalizedStatus, page, pageSize],
    [organizationId, normalizedRole, normalizedSearch, normalizedStatus, page, pageSize]
  )

  const totalKey = useMemo(
    () => ['company-users-total', organizationId || ''],
    [organizationId]
  )

  const invalidateUsers = useCallback(async () => {
    AdminApiService.invalidateUsersCache()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['company-users'] }),
      queryClient.invalidateQueries({ queryKey: ['company-users-total'] }),
    ])
  }, [queryClient])

  const usersQuery = useQuery({
    queryKey,
    enabled: isEnabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => AdminApiService.getUsers({
      page,
      limit: pageSize,
      search: normalizedSearch || undefined,
      role: normalizedRole || undefined,
      status: normalizedStatus || undefined,
      organizationId,
    }),
  })

  const totalUsersQuery = useQuery({
    queryKey: totalKey,
    enabled: isEnabled,
    staleTime: 30_000,
    queryFn: async () => {
      const result = await AdminApiService.getUsers({
        page: 1,
        limit: 1,
        organizationId,
      })
      return result.total
    },
  })

  useEffect(() => {
    if (!organizationId || !isEnabled) return

    const channel = supabase
      .channel(`company-users-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_members', filter: `organization_id=eq.${organizationId}` }, () => {
        void invalidateUsers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles', filter: `organization_id=eq.${organizationId}` }, () => {
        void invalidateUsers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        void invalidateUsers()
      })
      .subscribe((statusValue) => {
        setIsRealtimeConnected(statusValue === 'SUBSCRIBED')
      })

    return () => {
      setIsRealtimeConnected(false)
      void supabase.removeChannel(channel)
    }
  }, [invalidateUsers, isEnabled, organizationId, supabase])

  const createMutation = useMutation({
    mutationFn: async (payload: CreateCompanyUserInput) => AdminApiService.createUser(payload),
    onSuccess: async () => invalidateUsers(),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: UpdateCompanyUserInput) => AdminApiService.updateUser(userId, data),
    onSuccess: async () => invalidateUsers(),
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await AdminApiService.deleteUser(userId)
      return userId
    },
    onSuccess: async () => invalidateUsers(),
  })

  const refresh = useCallback(async () => {
    AdminApiService.invalidateUsersCache()
    await Promise.all([usersQuery.refetch(), totalUsersQuery.refetch()])
  }, [totalUsersQuery, usersQuery])

  return {
    users: (usersQuery.data?.users || []) as User[],
    totalCount: usersQuery.data?.total || 0,
    totalTeamCount: totalUsersQuery.data || 0,
    loading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    isRealtimeConnected,
    error: usersQuery.error instanceof Error ? usersQuery.error.message : null,
    refresh,
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    deleteUser: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  }
}
