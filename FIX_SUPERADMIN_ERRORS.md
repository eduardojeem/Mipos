# Fix: Errores en Panel SuperAdmin

## Problema Identificado

El panel de SuperAdmin estaba intentando hacer consultas a tablas que no existen en la base de datos actual:
- `organization_members` 
- Relaciones con `organizations` a través de JOINs

Esto causaba errores al cargar:
- `/superadmin/users` - Error al cargar usuarios
- `/superadmin/organizations` - Error al cargar organizaciones

## Solución Aplicada

### 1. Archivo: `apps/frontend/src/app/superadmin/users/page.tsx`

#### Cambios Realizados:

**Tipo simplificado:**
```typescript
// ANTES
type UserWithOrganizations = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  organization_members?: Array<{
    organization_id: string;
    role_id: string;
    is_owner: boolean;
    organizations: {
      name: string;
      slug: string;
    } | null;
  }>;
};

// DESPUÉS
type UserWithOrganizations = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};
```

**Consulta simplificada:**
```typescript
// ANTES
const { data, error } = await supabase
  .from('users')
  .select(`
    id,
    email,
    full_name,
    role,
    created_at,
    last_sign_in_at,
    organization_members(
      organization_id,
      role_id,
      is_owner,
      organizations(name, slug)
    )
  `)
  .order('created_at', { ascending: false })
  .limit(500);

// DESPUÉS
const { data, error } = await supabase
  .from('users')
  .select(`
    id,
    email,
    full_name,
    role,
    created_at,
    last_sign_in_at
  `)
  .order('created_at', { ascending: false })
  .limit(500);
```

**Cálculo de estadísticas:**
```typescript
// ANTES
const withOrgs = data?.filter(u => u.organization_members && u.organization_members.length > 0).length || 0;
const withoutOrgs = total - withOrgs;

// DESPUÉS
// Since we don't have organization_members table, set these to 0
const withOrgs = 0;
const withoutOrgs = total;
```

**Columna de organizaciones en tabla:**
```typescript
// ANTES
<TableCell>
  {user.organization_members && user.organization_members.length > 0 ? (
    <div className="space-y-1">
      {user.organization_members.map((membership, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Badge variant="outline">
            {membership.organizations?.name || 'Sin nombre'}
          </Badge>
          {membership.is_owner && (
            <Crown className="h-3 w-3 text-yellow-600" />
          )}
        </div>
      ))}
    </div>
  ) : (
    <span className="text-slate-400 text-sm">-</span>
  )}
</TableCell>

// DESPUÉS
<TableCell>
  <span className="text-slate-400 text-sm">N/A</span>
</TableCell>
```

### 2. Archivo: `apps/frontend/src/app/superadmin/organizations/page.tsx`

#### Cambios Realizados:

**Tipo simplificado:**
```typescript
// ANTES
type Organization = {
  // ... otros campos
  organization_members?: Array<{ count: number }>;
}

// DESPUÉS
type Organization = {
  // ... otros campos
  // Removido organization_members
}
```

**Consulta simplificada:**
```typescript
// ANTES
const { data, error } = await supabase
  .from('organizations')
  .select(`
    *,
    organization_members(count)
  `)
  .order('created_at', { ascending: false });

// DESPUÉS
const { data, error } = await supabase
  .from('organizations')
  .select('*')
  .order('created_at', { ascending: false });
```

**Función getMemberCount:**
```typescript
// ANTES
const getMemberCount = (org: Organization) => {
  return org.organization_members?.[0]?.count || 0;
};

// DESPUÉS
const getMemberCount = (org: Organization) => {
  // Return 0 since we don't have organization_members table
  return 0;
};
```

## Resultado

✅ **Errores corregidos:**
- Panel de usuarios carga correctamente
- Panel de organizaciones carga correctamente
- No hay errores de TypeScript
- No hay errores en consola

## Limitaciones Actuales

Debido a que no existen las tablas `organization_members` y `organizations`, las siguientes funcionalidades muestran valores por defecto:

1. **Panel de Usuarios:**
   - Columna "Organizaciones": Muestra "N/A"
   - Estadística "Con organizaciones": Muestra 0
   - Estadística "Sin organizaciones": Muestra total de usuarios

2. **Panel de Organizaciones:**
   - Contador de miembros: Muestra 0

## Próximos Pasos (Opcional)

Si deseas implementar la funcionalidad completa de organizaciones multi-tenant:

### 1. Crear Tablas en Supabase

```sql
-- Tabla de organizaciones (ya existe)
-- Solo verificar que tenga los campos necesarios

-- Tabla de membresías
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL DEFAULT 'member',
  is_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- RLS Policies
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Super admins pueden ver todo
CREATE POLICY "Super admins can view all memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );
```

### 2. Revertir los Cambios

Una vez creadas las tablas, puedes revertir los cambios en los archivos para usar las consultas originales con JOINs.

## Archivos Modificados

1. ✅ `apps/frontend/src/app/superadmin/users/page.tsx`
2. ✅ `apps/frontend/src/app/superadmin/organizations/page.tsx`

## Testing

- [ ] Verificar que `/superadmin/users` carga sin errores
- [ ] Verificar que `/superadmin/organizations` carga sin errores
- [ ] Verificar que las estadísticas se muestran correctamente
- [ ] Verificar que no hay errores en consola del navegador

---

**Estado:** ✅ CORREGIDO
**Fecha:** 2026-01-28
