# 🔍 Auditoría Completa Admin SaaS - Febrero 2026

**Fecha**: 4 de Febrero, 2026  
**Estado**: ⚠️ **CRÍTICO - REQUIERE CORRECCIONES INMEDIATAS**

## 📊 Resumen Ejecutivo

He completado una auditoría exhaustiva de toda la sección `/admin` para verificar que cumple con los requisitos de un SaaS multitenancy profesional.

### Resultado General

- 🔴 **Seguridad**: CRÍTICO - Múltiples vulnerabilidades
- 🔴 **Multitenancy**: CRÍTICO - Sin aislamiento de datos
- ⚠️ **Arquitectura SaaS**: Incompleta
- ⚠️ **APIs**: Requieren correcciones
- ✅ **Frontend**: Estructura correcta
- 🔴 **Acción requerida**: 8 problemas críticos

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. 🔴 CRÍTICO: Sin Filtrado por Organization ID

**Severidad**: CRÍTICA  
**Impacto**: Data leak entre organizaciones

**Problema**:
- NINGÚN endpoint de `/api/admin` filtra por `organization_id`
- Los administradores pueden ver datos de TODAS las organizaciones
- Violación total del principio de multitenancy

**Endpoints Afectados**:
```
❌ /api/admin/audit/route.ts - Sin filtro de organización
❌ /api/admin/sessions/route.ts - Sin filtro de organización
❌ /api/admin/profile/route.ts - Sin filtro de organización
❌ /api/admin/coupons/usable/route.ts - Sin filtro de organización
❌ /api/admin/promotions/usable/route.ts - Sin filtro de organización
❌ /api/admin/maintenance/db-stats/route.ts - Sin filtro de organización
❌ /api/admin/maintenance/purge-audit-logs/route.ts - Sin filtro de organización
```

**Evidencia**:
```bash
# Búsqueda en todos los endpoints de admin
grep -r "organization_id" apps/frontend/src/app/api/admin/**/*.ts
# Resultado: 0 coincidencias
```

### 2. 🔴 CRÍTICO: Uso de createAdminClient que Bypasea RLS

**Severidad**: CRÍTICA  
**Impacto**: Bypass completo de Row Level Security

**Problema**:
- Múltiples endpoints usan `createAdminClient()` que bypasea RLS
- Esto permite acceso a datos de todas las organizaciones
- Contradice el propósito de las políticas RLS implementadas

**Endpoints Afectados**:
```typescript
// apps/frontend/src/app/api/admin/coupons/usable/route.ts
const supabase = createAdminClient() as any  // ❌ BYPASEA RLS

// apps/frontend/src/app/api/admin/promotions/usable/route.ts
const supabase = createAdminClient() as any  // ❌ BYPASEA RLS

// apps/frontend/src/app/api/admin/maintenance/db-stats/route.ts
const admin = createAdminClient() as any  // ❌ BYPASEA RLS

// apps/frontend/src/app/api/admin/maintenance/purge-audit-logs/route.ts
const admin = createAdminClient() as any  // ❌ BYPASEA RLS
```

**Corrección Requerida**:
```typescript
// ❌ MAL - Bypasea RLS
const supabase = createAdminClient()

// ✅ BIEN - Respeta RLS y filtra por organización
const supabase = await createClient()
const orgId = await getUserOrganizationId(supabase)
query = query.eq('organization_id', orgId)
```

### 3. 🔴 CRÍTICO: assertAdmin No Valida Organización

**Severidad**: CRÍTICA  
**Impacto**: Admins pueden acceder a datos de otras organizaciones

**Problema**:
```typescript
// apps/frontend/src/app/api/_utils/auth.ts
export async function assertAdmin(request: NextRequest) {
  // ✅ Verifica que sea ADMIN o SUPER_ADMIN
  // ❌ NO verifica a qué organización pertenece
  // ❌ NO retorna organization_id para filtrar
}
```

**Corrección Requerida**:
```typescript
export async function assertAdmin(request: NextRequest): Promise<
  | { ok: true; userId: string; organizationId: string; isSuperAdmin: boolean }
  | { ok: false; status: number; body: { error: string } }
> {
  // Verificar autenticación
  // Obtener organization_id del usuario
  // Retornar datos para filtrado
}
```

### 4. 🔴 CRÍTICO: Layout Admin No Valida Organización

**Severidad**: ALTA  
**Impacto**: Acceso sin validación de pertenencia a organización

**Problema**:
```typescript
// apps/frontend/src/app/admin/layout.tsx
if (userRole === 'ADMIN') {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .maybeSingle()
    
  // ⚠️ Obtiene membership pero NO valida
  // ⚠️ NO redirige si no tiene organización
  // ⚠️ NO guarda organization_id para uso posterior
}
```

**Corrección Requerida**:
```typescript
if (userRole === 'ADMIN') {
  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .single()
    
  if (error || !membership) {
    redirect('/onboarding/organization')
  }
  
  // Guardar en contexto o cookie para uso en APIs
}
```

### 5. ⚠️ ALTO: Audit Logs Sin Filtro de Organización

**Severidad**: ALTA  
**Impacto**: Admins ven logs de todas las organizaciones

**Problema**:
```typescript
// apps/frontend/src/app/api/admin/audit/route.ts
let query = (supabase as any)
  .from('audit_logs')
  .select('*', { count: 'exact' })
  
// ❌ Sin filtro por organization_id
// ❌ Admin de Org A puede ver logs de Org B
```

**Corrección Requerida**:
```typescript
const { organizationId, isSuperAdmin } = auth

let query = supabase
  .from('audit_logs')
  .select('*', { count: 'exact' })

// Solo Super Admin ve todos los logs
if (!isSuperAdmin) {
  query = query.eq('organization_id', organizationId)
}
```

### 6. ⚠️ ALTO: Sessions Sin Filtro de Organización

**Severidad**: ALTA  
**Impacto**: Admins pueden ver/terminar sesiones de otras organizaciones

**Problema**:
```typescript
// apps/frontend/src/app/api/admin/_services/sessions.ts
// Usa datos MOCK sin filtrado por organización
const mockSessions: UserSession[] = [...]

// En producción, las queries NO filtran por organización
```

**Corrección Requerida**:
```typescript
// Obtener organization_id del admin
const orgId = await getUserOrganizationId(userId)

// Filtrar sesiones por usuarios de la organización
const { data: orgUsers } = await supabase
  .from('organization_members')
  .select('user_id')
  .eq('organization_id', orgId)

const userIds = orgUsers.map(u => u.user_id)

// Filtrar sesiones solo de usuarios de la org
query = query.in('user_id', userIds)
```

### 7. ⚠️ MEDIO: Promotions y Coupons Sin Organization ID

**Severidad**: MEDIA  
**Impacto**: Promociones y cupones compartidos entre organizaciones

**Problema**:
```typescript
// apps/frontend/src/app/api/admin/promotions/usable/route.ts
let query = (supabase as any)
  .from('promotions')
  .select('...')
  .eq('is_active', true)
  
// ❌ Sin filtro por organization_id
```

**Verificación de Esquema**:
```sql
-- ¿Las tablas tienen organization_id?
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('promotions', 'coupons')
AND column_name = 'organization_id';
```

### 8. ⚠️ MEDIO: Profile Endpoint Sin Contexto de Organización

**Severidad**: MEDIA  
**Impacto**: Perfil no muestra información de organización

**Problema**:
```typescript
// apps/frontend/src/app/api/admin/profile/route.ts
const { data: profile } = await supabase
  .from('users')
  .select('...')
  .eq('id', user.id)
  .single()

// ❌ No incluye información de organización
// ❌ No valida pertenencia a organización
```

## 🔒 Análisis de Seguridad

### Autenticación ⚠️

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Verificación de rol | ✅ | `assertAdmin()` verifica ADMIN/SUPER_ADMIN |
| Verificación de sesión | ✅ | Usa Supabase Auth |
| Verificación de organización | ❌ | **NO implementada** |
| Guard client-side | ⚠️ | Existe pero no valida organización |
| Guard server-side | ⚠️ | Existe pero no valida organización |

### RLS (Row Level Security) ⚠️

| Tabla | RLS Habilitado | Política Tenant Isolation | Usado Correctamente |
|-------|----------------|---------------------------|---------------------|
| audit_logs | ✅ | ❓ | ❌ No se filtra en API |
| promotions | ✅ | ✅ | ❌ Se usa createAdminClient |
| coupons | ❓ | ❓ | ❌ Se usa createAdminClient |
| sessions | ❓ | ❓ | ❌ Datos mock |
| users | ✅ | ✅ | ⚠️ Parcial |

### Multitenancy 🔴

```
❌ Sin aislamiento de datos
❌ Admins pueden ver datos de otras organizaciones
❌ No hay filtrado por organization_id
❌ createAdminClient bypasea RLS
❌ No hay validación de pertenencia a organización
```

## 📋 Comparación con SuperAdmin

| Aspecto | SuperAdmin | Admin | Estado |
|---------|-----------|-------|--------|
| Autenticación | ✅ `assertSuperAdmin()` | ⚠️ `assertAdmin()` | Incompleto |
| Filtrado de datos | N/A (ve todo) | ❌ Sin filtrado | Crítico |
| RLS Bypass | ✅ Intencional | ❌ No intencional | Crítico |
| Validación de org | N/A | ❌ No existe | Crítico |
| Manejo de errores | ✅ | ✅ | OK |
| Loading states | ✅ | ✅ | OK |

## 🏗️ Arquitectura SaaS

### Estructura de Datos ✅

```sql
-- Tablas principales tienen organization_id
organizations ✅
organization_members ✅
products ✅ (tiene organization_id)
sales ✅ (tiene organization_id)
customers ✅ (tiene organization_id)
suppliers ✅ (tiene organization_id)
```

### Políticas RLS ✅

```sql
-- Políticas de Tenant Isolation existen
CREATE POLICY "Tenant Isolation" ON products
  USING (organization_id IN (SELECT unnest(get_my_org_ids())));

CREATE POLICY "Tenant Isolation" ON sales
  USING (organization_id IN (SELECT unnest(get_my_org_ids())));
```

### Problema: APIs No Usan RLS ❌

```
✅ RLS configurado correctamente
✅ Funciones helper (get_my_org_ids, belongs_to_org)
❌ APIs usan createAdminClient que bypasea RLS
❌ APIs no filtran manualmente por organization_id
```

## 🔧 CORRECCIONES REQUERIDAS

### Prioridad 1: CRÍTICAS (Implementar AHORA)

#### 1.1 Crear Helper para Obtener Organization ID

```typescript
// apps/frontend/src/app/api/_utils/organization.ts
import { createClient } from '@/lib/supabase/server'

export async function getUserOrganizationId(
  userId: string
): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) return null
  return data.organization_id
}

export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()
  
  return !error && !!data
}
```

#### 1.2 Actualizar assertAdmin

```typescript
// apps/frontend/src/app/api/_utils/auth.ts
export async function assertAdmin(request: NextRequest): Promise<
  | { 
      ok: true
      userId: string
      organizationId: string | null
      isSuperAdmin: boolean
    }
  | { ok: false; status: number; body: { error: string } }
> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { ok: false, status: 401, body: { error: 'No autorizado' } }
    }

    const adminClient = await createAdminClient()
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const dbRoles = userRoles?.map((ur: any) => ur.role?.name?.toUpperCase()) || []
    const metadataRole = (user.user_metadata as any)?.role?.toUpperCase()
    
    const isSuperAdmin = dbRoles.includes('SUPER_ADMIN') || metadataRole === 'SUPER_ADMIN'
    const isAdmin = dbRoles.includes('ADMIN') || metadataRole === 'ADMIN'
    
    if (!isSuperAdmin && !isAdmin) {
      return { ok: false, status: 403, body: { error: 'Acceso denegado' } }
    }

    // Obtener organization_id para admins regulares
    let organizationId: string | null = null
    if (!isSuperAdmin) {
      organizationId = await getUserOrganizationId(user.id)
      if (!organizationId) {
        return { 
          ok: false, 
          status: 403, 
          body: { error: 'Admin sin organización asignada' } 
        }
      }
    }

    return { 
      ok: true, 
      userId: user.id,
      organizationId,
      isSuperAdmin 
    }
  } catch (e) {
    return { ok: false, status: 500, body: { error: 'Error interno' } }
  }
}
```

#### 1.3 Actualizar Audit Logs Endpoint

```typescript
// apps/frontend/src/app/api/admin/audit/route.ts
export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  try {
    const supabase = await createClient() // ✅ Usar createClient, no createAdminClient
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Filtrar por organización si no es super admin
    if (!isSuperAdmin && organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // ... resto del código con filtros
  }
}
```

#### 1.4 Actualizar Sessions Endpoint

```typescript
// apps/frontend/src/app/api/admin/sessions/route.ts
export async function GET(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  // Obtener usuarios de la organización
  const supabase = await createClient()
  
  let userIds: string[] = []
  if (!isSuperAdmin && organizationId) {
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
    
    userIds = members?.map(m => m.user_id) || []
  }

  const filters: SessionListFilters = {
    ...searchParams,
    organizationUserIds: userIds // Nuevo filtro
  }

  const res = await listSessions(filters, { page, limit })
  return NextResponse.json(res)
}
```

#### 1.5 Actualizar Promotions y Coupons

```typescript
// apps/frontend/src/app/api/admin/promotions/usable/route.ts
export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  const supabase = await createClient() // ✅ NO usar createAdminClient
  
  let query = supabase
    .from('promotions')
    .select('...')
    .eq('is_active', true)

  // Filtrar por organización
  if (!isSuperAdmin && organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query
  // ...
}
```

### Prioridad 2: ALTAS (Implementar esta semana)

#### 2.1 Actualizar Layout Admin

```typescript
// apps/frontend/src/app/admin/layout.tsx
if (userRole === 'ADMIN') {
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, organization:organizations(name, slug)')
    .eq('user_id', session.user.id)
    .single()
    
  if (memberError || !membership) {
    redirect('/onboarding/organization')
  }

  // Guardar en cookie para uso en APIs (opcional)
  // O pasar via context provider
}
```

#### 2.2 Agregar Organization ID a Audit Logs

```sql
-- Verificar si audit_logs tiene organization_id
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS organization_id UUID 
REFERENCES organizations(id) ON DELETE CASCADE;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id 
ON audit_logs(organization_id);

-- Actualizar RLS
DROP POLICY IF EXISTS "Admins can view org audit logs" ON audit_logs;
CREATE POLICY "Admins can view org audit logs" ON audit_logs
  FOR SELECT USING (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );
```

#### 2.3 Agregar Organization ID a Promotions/Coupons

```sql
-- Verificar y agregar organization_id
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS organization_id UUID 
REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS organization_id UUID 
REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill con organización por defecto
UPDATE promotions 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE coupons 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Hacer NOT NULL
ALTER TABLE promotions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE coupons ALTER COLUMN organization_id SET NOT NULL;

-- Actualizar RLS
DROP POLICY IF EXISTS "Tenant Isolation" ON promotions;
CREATE POLICY "Tenant Isolation" ON promotions
  USING (organization_id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS "Tenant Isolation" ON coupons;
CREATE POLICY "Tenant Isolation" ON coupons
  USING (organization_id IN (SELECT unnest(get_my_org_ids())));
```

### Prioridad 3: MEDIAS (Implementar próxima semana)

#### 3.1 Actualizar Profile Endpoint

```typescript
// apps/frontend/src/app/api/admin/profile/route.ts
export async function GET() {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { userId, organizationId } = auth

  const supabase = await createClient()
  
  // Obtener perfil con información de organización
  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      organization_members!inner(
        organization_id,
        role_id,
        is_owner,
        organization:organizations(
          id,
          name,
          slug,
          subscription_plan,
          subscription_status
        )
      )
    `)
    .eq('id', userId)
    .single()

  return NextResponse.json(profile)
}
```

#### 3.2 Crear Middleware de Organización

```typescript
// apps/frontend/src/app/api/admin/_middleware/organization.ts
export async function withOrganizationContext(
  handler: (req: NextRequest, context: OrgContext) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const auth = await assertAdmin(req)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const context: OrgContext = {
      userId: auth.userId,
      organizationId: auth.organizationId,
      isSuperAdmin: auth.isSuperAdmin
    }

    return handler(req, context)
  }
}
```

## 📊 Checklist de Correcciones

### Críticas (Bloquean producción)

- [ ] Crear helper `getUserOrganizationId()`
- [ ] Actualizar `assertAdmin()` para retornar `organizationId`
- [ ] Actualizar `/api/admin/audit` con filtro de organización
- [ ] Actualizar `/api/admin/sessions` con filtro de organización
- [ ] Reemplazar `createAdminClient()` por `createClient()` en:
  - [ ] `/api/admin/coupons/usable`
  - [ ] `/api/admin/promotions/usable`
  - [ ] `/api/admin/promotions/seed`
  - [ ] `/api/admin/promotions/activate-now`
- [ ] Actualizar layout admin para validar organización

### Altas (Implementar esta semana)

- [ ] Agregar `organization_id` a tabla `audit_logs`
- [ ] Agregar `organization_id` a tabla `promotions`
- [ ] Agregar `organization_id` a tabla `coupons`
- [ ] Actualizar RLS policies para nuevas columnas
- [ ] Backfill datos existentes con organización por defecto

### Medias (Implementar próxima semana)

- [ ] Actualizar profile endpoint con info de organización
- [ ] Crear middleware de organización
- [ ] Agregar tests de aislamiento de datos
- [ ] Documentar flujo de multitenancy

## 🎯 Recomendaciones Adicionales

### 1. Crear Tests de Aislamiento

```typescript
// tests/admin/multitenancy.test.ts
describe('Admin Multitenancy', () => {
  it('Admin de Org A no puede ver datos de Org B', async () => {
    // Test de aislamiento
  })
  
  it('Super Admin puede ver datos de todas las orgs', async () => {
    // Test de super admin
  })
})
```

### 2. Agregar Logging de Acceso Cross-Org

```typescript
// Detectar intentos de acceso cross-organization
if (requestedOrgId !== userOrgId && !isSuperAdmin) {
  await logSecurityEvent({
    type: 'UNAUTHORIZED_ORG_ACCESS_ATTEMPT',
    userId,
    requestedOrgId,
    userOrgId
  })
  return { error: 'Acceso denegado' }
}
```

### 3. Implementar Organization Context Provider

```typescript
// components/providers/OrganizationProvider.tsx
export function OrganizationProvider({ children }) {
  const [organization, setOrganization] = useState(null)
  
  useEffect(() => {
    loadOrganization()
  }, [])
  
  return (
    <OrganizationContext.Provider value={{ organization }}>
      {children}
    </OrganizationContext.Provider>
  )
}
```

### 4. Agregar Validación en Frontend

```typescript
// hooks/useOrganizationAccess.ts
export function useOrganizationAccess() {
  const { organization } = useOrganization()
  
  const canAccessResource = (resourceOrgId: string) => {
    return organization?.id === resourceOrgId
  }
  
  return { canAccessResource }
}
```

## ✅ Verificación Post-Correcciones

### Tests de Seguridad

```bash
# 1. Admin de Org A no puede ver datos de Org B
curl -H "Authorization: Bearer <admin-org-a-token>" \
  /api/admin/audit?organization_id=org-b
# Debe retornar: 403 Forbidden o datos vacíos

# 2. Admin solo ve datos de su organización
curl -H "Authorization: Bearer <admin-org-a-token>" \
  /api/admin/promotions/usable
# Debe retornar: solo promociones de Org A

# 3. Super Admin ve todos los datos
curl -H "Authorization: Bearer <superadmin-token>" \
  /api/admin/audit
# Debe retornar: datos de todas las organizaciones
```

### Tests de RLS

```sql
-- Conectar como admin de Org A
SET LOCAL jwt.claims.sub = '<user-id-org-a>';

-- Intentar ver datos de Org B
SELECT * FROM promotions WHERE organization_id = '<org-b-id>';
-- Debe retornar: 0 filas

-- Ver datos de Org A
SELECT * FROM promotions WHERE organization_id = '<org-a-id>';
-- Debe retornar: promociones de Org A
```

## 📈 Métricas de Impacto

### Antes de Correcciones

```
🔴 Aislamiento de datos: 0%
🔴 Endpoints seguros: 0/9 (0%)
🔴 RLS efectivo: No (bypasseado)
🔴 Validación de organización: No
```

### Después de Correcciones

```
✅ Aislamiento de datos: 100%
✅ Endpoints seguros: 9/9 (100%)
✅ RLS efectivo: Sí
✅ Validación de organización: Sí
```

## 🎯 Conclusión

El panel de Admin tiene **PROBLEMAS CRÍTICOS DE SEGURIDAD** que deben corregirse antes de producción:

### Problemas Críticos

1. ❌ **Sin filtrado por organización** - Admins ven datos de todas las orgs
2. ❌ **Uso de createAdminClient** - Bypasea RLS completamente
3. ❌ **assertAdmin incompleto** - No valida ni retorna organización
4. ❌ **Layout sin validación** - No verifica pertenencia a organización

### Impacto

- 🔴 **Data leak**: Admins pueden ver datos de otras organizaciones
- 🔴 **Violación de multitenancy**: Sin aislamiento de datos
- 🔴 **Riesgo de seguridad**: Acceso no autorizado a información sensible
- 🔴 **Incumplimiento**: No cumple requisitos de SaaS multitenancy

### Acción Requerida

**NO DESPLEGAR A PRODUCCIÓN** hasta implementar las correcciones críticas.

**Tiempo estimado de corrección**: 2-3 días de desarrollo + 1 día de testing

**Prioridad**: MÁXIMA

---

**Auditado por**: Kiro AI Assistant  
**Fecha**: 2026-02-04  
**Versión**: 1.0  
**Próxima revisión**: Después de implementar correcciones críticas

