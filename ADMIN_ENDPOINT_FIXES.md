# Correcciones de Endpoints Admin - Ejemplos de Código

Este documento contiene ejemplos específicos de cómo corregir cada endpoint de admin para cumplir con multitenancy.

## Patrón General de Corrección

### ❌ ANTES (Incorrecto)

```typescript
import { createAdminClient } from '@/lib/supabase-admin'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const supabase = createAdminClient() // ❌ Bypasea RLS
  
  const { data } = await supabase
    .from('promotions')
    .select('*') // ❌ Sin filtro de organización
  
  return NextResponse.json({ data })
}
```

### ✅ DESPUÉS (Correcto)

```typescript
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth
  const supabase = await createClient() // ✅ Respeta RLS
  
  let query = supabase
    .from('promotions')
    .select('*')
  
  // ✅ Filtrar por organización (excepto super admin)
  if (!isSuperAdmin && organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  
  const { data } = await query
  
  return NextResponse.json({ data })
}
```

## Correcciones Específicas por Endpoint

### 1. /api/admin/audit/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { isSupabaseActive } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100)
    const offset = (page - 1) * limit

    if (!isSupabaseActive()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase no está activo' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // ✅ CRÍTICO: Filtrar por organización
    if (!isSuperAdmin && organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Aplicar filtros adicionales
    const action = searchParams.get('action')
    if (action && action !== 'all') {
      query = query.eq('action', action)
    }

    const resource = searchParams.get('resource')
    if (resource && resource !== 'all') {
      query = query.eq('entity_type', resource)
    }

    const userId = searchParams.get('userId')
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const startDate = searchParams.get('startDate')
    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [], 
      total: count || 0, 
      page, 
      limit 
    })
  } catch (e: any) {
    return NextResponse.json({ 
      success: false, 
      error: e?.message || 'Error interno' 
    }, { status: 500 })
  }
}
```

### 2. /api/admin/sessions/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { createClient } from '@/lib/supabase/server'
import { listSessions, SessionListFilters } from '@/app/api/admin/_services/sessions'

export async function GET(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '10', 10)))

  // ✅ Obtener usuarios de la organización
  let allowedUserIds: string[] | undefined = undefined
  
  if (!isSuperAdmin && organizationId) {
    const supabase = await createClient()
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
    
    allowedUserIds = members?.map(m => m.user_id) || []
    
    // Si no hay usuarios en la org, retornar vacío
    if (allowedUserIds.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        limit,
        pageCount: 0
      })
    }
  }

  const filters: SessionListFilters = {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') as any || 'all',
    userRole: searchParams.get('userRole') || undefined,
    deviceType: searchParams.get('deviceType') as any || 'all',
    riskLevel: searchParams.get('riskLevel') as any || 'all',
    loginMethod: searchParams.get('loginMethod') as any || 'all',
    isActive: searchParams.get('isActive') === 'true' ? true : 
              searchParams.get('isActive') === 'false' ? false : undefined,
    isCurrent: searchParams.get('isCurrent') === 'true' ? true :
               searchParams.get('isCurrent') === 'false' ? false : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    sortBy: searchParams.get('sortBy') as any || undefined,
    sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
    // ✅ NUEVO: Filtrar por usuarios de la organización
    allowedUserIds
  }

  const res = await listSessions(filters, { page, limit })
  return NextResponse.json(res)
}
```

### 3. /api/admin/_services/sessions.ts

Actualizar la función `applyFilters` para soportar `allowedUserIds`:

```typescript
export interface SessionListFilters {
  search?: string
  status?: 'active' | 'expired' | 'all'
  userRole?: string | ''
  deviceType?: DeviceType | 'all' | ''
  riskLevel?: RiskLevel | 'all' | ''
  loginMethod?: LoginMethod | 'all' | ''
  isActive?: boolean
  isCurrent?: boolean
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'lastActivityAt' | 'expiresAt' | 'userName' | 'riskLevel'
  sortDir?: 'asc' | 'desc'
  allowedUserIds?: string[] // ✅ NUEVO
}

function applyFilters(data: UserSession[], f: SessionListFilters): UserSession[] {
  let filtered = data
  
  // ✅ CRÍTICO: Filtrar por usuarios permitidos
  if (f.allowedUserIds && f.allowedUserIds.length > 0) {
    filtered = filtered.filter(s => f.allowedUserIds!.includes(s.userId))
  }
  
  // ... resto de filtros
  const search = (f.search || '').toLowerCase()
  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.userName.toLowerCase().includes(search) ||
        s.userEmail.toLowerCase().includes(search) ||
        s.ipAddress.includes(search)
    )
  }
  
  // ... resto del código
  
  return filtered
}
```

### 4. /api/admin/promotions/usable/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { createClient } from '@/lib/supabase/server' // ✅ Cambio importante

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth
  const supabase = await createClient() // ✅ NO usar createAdminClient

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '10', 10)))
  const offset = (page - 1) * limit
  const search = (searchParams.get('search') || '').trim()
  const strict = (searchParams.get('strict') || 'true').toLowerCase() !== 'false'

  const now = new Date().toISOString()
  
  let query = supabase
    .from('promotions')
    .select('id,name,discount_type,discount_value,start_date,end_date,is_active', { count: 'exact' })
    .eq('is_active', true)

  // ✅ CRÍTICO: Filtrar por organización
  if (!isSuperAdmin && organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  if (strict) {
    query = query.lte('start_date', now).gte('end_date', now)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error, count } = await query
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    data: data || [], 
    count: count || 0, 
    page, 
    limit 
  })
}
```

### 5. /api/admin/coupons/usable/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { createClient } from '@/lib/supabase/server' // ✅ Cambio importante

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth
  const supabase = await createClient() // ✅ NO usar createAdminClient

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '10', 10)))
  const offset = (page - 1) * limit
  const search = (searchParams.get('search') || '').trim()

  const now = new Date().toISOString()
  
  let query = supabase
    .from('coupons')
    .select('code,type,value,start_date,end_date,is_active,usage_limit', { count: 'exact' })
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)

  // ✅ CRÍTICO: Filtrar por organización
  if (!isSuperAdmin && organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  if (search) {
    query = query.ilike('code', `%${search}%`)
  }

  const { data, error, count } = await query
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    data: data || [], 
    count: count || 0, 
    page, 
    limit 
  })
}
```

### 6. /api/admin/profile/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { userId, organizationId } = auth

  try {
    const supabase = await createClient()

    // ✅ Obtener perfil con información de organización
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        phone,
        bio,
        location,
        avatar,
        created_at,
        updated_at,
        last_login
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Error al obtener perfil' },
        { status: 500 }
      )
    }

    // ✅ Obtener información de la organización
    let organizationInfo = null
    if (organizationId) {
      const { data: orgData } = await supabase
        .from('organization_members')
        .select(`
          role_id,
          is_owner,
          organization:organizations(
            id,
            name,
            slug,
            subscription_plan,
            subscription_status,
            settings
          )
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single()

      organizationInfo = orgData
    }

    // Obtener permisos
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          name,
          permissions (
            name,
            resource,
            action
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    let permissions: string[] = []
    if (userRoles) {
      permissions = userRoles.flatMap(ur => 
        (ur.roles as any)?.permissions?.map((p: any) => `${p.resource}.${p.action}`) || []
      )
    }

    // Obtener actividad reciente (filtrada por organización)
    let activityQuery = supabase
      .from('role_audit_logs')
      .select('action, resource_type, created_at, ip_address')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // ✅ Filtrar actividad por organización si aplica
    if (organizationId) {
      activityQuery = activityQuery.eq('organization_id', organizationId)
    }

    const { data: recentActivity } = await activityQuery

    const adminProfile = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      phone: profile.phone,
      bio: profile.bio,
      location: profile.location,
      avatar: profile.avatar,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login,
      permissions,
      recentActivity: recentActivity || [],
      organization: organizationInfo, // ✅ NUEVO
      twoFactorEnabled: false,
    }

    return NextResponse.json(adminProfile)
  } catch (error) {
    console.error('Admin profile API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { userId, organizationId } = auth

  try {
    const supabase = await createClient()
    const updates = await request.json()

    // Validar campos permitidos
    const allowedFields = ['full_name', 'phone', 'bio', 'location', 'avatar']
    const filteredUpdates: any = {}
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value
      }
    }

    filteredUpdates.updated_at = new Date().toISOString()

    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al actualizar perfil' },
        { status: 500 }
      )
    }

    // ✅ Registrar en audit log con organization_id
    await supabase
      .from('role_audit_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId, // ✅ NUEVO
        action: 'UPDATE',
        resource_type: 'profile',
        resource_id: userId,
        old_values: {},
        new_values: filteredUpdates,
        performed_by: userId,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Perfil actualizado correctamente'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### 7. /api/admin/maintenance/db-stats/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { isSupabaseActive } from '@/lib/env'
import { createClient } from '@/lib/supabase/server' // ✅ Cambio importante

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  if (!isSupabaseActive()) {
    return NextResponse.json({ success: true, tables: [], counts: {} })
  }

  try {
    const supabase = await createClient() // ✅ Usar createClient

    // ✅ Solo super admin puede ver stats globales
    if (!isSuperAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Requiere permisos de Super Admin' 
      }, { status: 403 })
    }

    // Stats globales (solo para super admin)
    const sql = `
      select
        relname as table,
        pg_total_relation_size(relid) as bytes,
        pg_size_pretty(pg_total_relation_size(relid)) as pretty,
        n_live_tup as estimated_rows
      from pg_catalog.pg_statio_user_tables
      order by pg_total_relation_size(relid) desc
      limit 20;
    `
    
    let tables: any[] = []
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql })
      if (!error && Array.isArray(data)) {
        tables = data
      }
    } catch {}

    const counts: Record<string, number> = {}
    const countFor = async (name: string, col: string = 'id') => {
      try {
        const { count, error } = await supabase
          .from(name)
          .select(col, { count: 'exact', head: true })
        if (!error) counts[name] = count || 0
      } catch {}
    }

    await Promise.all([
      countFor('sales', 'id'),
      countFor('sale_items', 'id'),
      countFor('customers', 'id'),
      countFor('products', 'id'),
      countFor('audit_logs', 'id'),
      countFor('sessions', 'id')
    ])

    return NextResponse.json({ success: true, tables, counts })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Error' 
    }, { status: 500 })
  }
}
```

## Checklist de Actualización

Para cada endpoint, verificar:

- [ ] Importa `createClient` en lugar de `createAdminClient`
- [ ] Usa el nuevo tipo de retorno de `assertAdmin`
- [ ] Extrae `organizationId` e `isSuperAdmin` de `auth`
- [ ] Filtra queries por `organization_id` cuando no es super admin
- [ ] Maneja el caso cuando `organizationId` es null
- [ ] Incluye `organization_id` en inserts de audit logs
- [ ] Retorna error 403 si admin sin organización intenta acceder

## Testing

Después de aplicar las correcciones, probar:

```bash
# 1. Como admin de Org A
curl -H "Authorization: Bearer <token-org-a>" \
  /api/admin/promotions/usable
# Debe retornar solo promociones de Org A

# 2. Como admin de Org B
curl -H "Authorization: Bearer <token-org-b>" \
  /api/admin/promotions/usable
# Debe retornar solo promociones de Org B

# 3. Como super admin
curl -H "Authorization: Bearer <token-superadmin>" \
  /api/admin/promotions/usable
# Debe retornar promociones de todas las organizaciones

# 4. Admin sin organización
curl -H "Authorization: Bearer <token-admin-sin-org>" \
  /api/admin/promotions/usable
# Debe retornar 403 Forbidden
```

## Próximos Pasos

1. Aplicar correcciones a todos los endpoints listados
2. Ejecutar `npx tsx scripts/verify-admin-rls.ts` para verificar
3. Ejecutar tests de integración
4. Desplegar a staging para pruebas
5. Verificar en producción con monitoreo activo
