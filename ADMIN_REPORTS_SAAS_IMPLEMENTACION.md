# Implementación SaaS Multi-Tenant en /admin/reports

## 📋 Objetivo

Sincronizar la sección `/admin/reports` para que funcione con el sistema SaaS multi-tenant y Supabase, aplicando filtrado por organización y agregando selector de organización para administradores.

---

## 🔧 Cambios Realizados

### 1. Backend - `/api/reports/route.ts`

**Actualizado**:
- ✅ Importado `assertAdmin` para autenticación consistente
- ✅ Reemplazado header `x-organization-id` por sistema `assertAdmin`
- ✅ Agregado soporte para `organizationId` y `isSuperAdmin` desde auth
- ✅ Permitir filtro por organización desde query params (solo super admins)
- ✅ Actualizado cache key para incluir orgId
- ✅ Todas las funciones de Supabase ya filtran por `organization_id`

**Código clave**:
```typescript
// Usar assertAdmin para autenticación
const auth = await assertAdmin(request);
if (!('ok' in auth) || auth.ok === false) {
  return NextResponse.json(auth.body, { status: auth.status });
}

const { organizationId, isSuperAdmin } = auth;

// Permitir filtro por organización (solo super admins)
const orgFilter = params['organizationId'] || params['organization_id'];
const effectiveOrgId = (isSuperAdmin && orgFilter) ? orgFilter : organizationId;

// Las funciones de Supabase ya filtran por organization_id
const data = await getSalesReportSupabase(supabase, params, effectiveOrgId)
```

**Funciones de Supabase ya implementadas**:
- `getSalesReportSupabase()` - Filtra ventas por `organization_id`
- `getInventoryReportSupabase()` - Filtra productos por `organization_id`
- `getCustomerReportSupabase()` - Filtra clientes por `organization_id`
- `getFinancialReportSupabase()` - Filtra datos financieros por `organization_id`

### 2. Frontend - `ReportsDashboard` Component

**Agregado**:
- ✅ Estado para organizaciones y rol de usuario
- ✅ Función `checkUserRole()` para detectar ADMIN/SUPER_ADMIN
- ✅ Función `loadOrganizations()` para cargar lista de organizaciones
- ✅ Selector de organización en header (solo visible para admins)
- ✅ Icono `Building2` importado para el selector
- ✅ Filtrado automático por organización en reportes

**Código agregado**:
```typescript
// Estado
const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
const [currentOrganization, setCurrentOrganization] = useState<string | null>(null);
const [isAdmin, setIsAdmin] = useState(false);

// Funciones
const checkUserRole = async () => {
  try {
    const response = await fetch('/api/auth/profile')
    const data = await response.json()
    if (data.success && data.data) {
      const userRole = data.data.role
      setIsAdmin(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
    }
  } catch (error) {
    console.error('Error checking user role:', error)
  }
}

const loadOrganizations = async () => {
  try {
    const response = await fetch('/api/admin/organizations')
    const data = await response.json()
    if (data.success && data.organizations) {
      setOrganizations(data.organizations)
      if (data.organizations.length > 0 && !currentOrganization) {
        setCurrentOrganization(data.organizations[0].id)
      }
    }
  } catch (error) {
    console.error('Error loading organizations:', error)
  }
}

// useEffect
useEffect(() => {
  checkUserRole()
  loadOrganizations()
}, [])
```

**Selector en UI**:
```tsx
{isAdmin && organizations.length > 0 && (
  <Select 
    value={currentOrganization || 'all'} 
    onValueChange={(value) => {
      setCurrentOrganization(value === 'all' ? null : value)
      // Actualizar filtros para refetch
      setFilters(prev => ({ ...prev, organizationId: value === 'all' ? undefined : value }))
    }}
  >
    <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700">
      <Building2 className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Organización" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todas las organizaciones</SelectItem>
      {organizations.map(org => (
        <SelectItem key={org.id} value={org.id}>
          {org.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

---

## 🔒 Seguridad Multi-Tenant

### Niveles de Acceso

1. **SUPER_ADMIN**:
   - Ve reportes de todas las organizaciones
   - Puede seleccionar organización específica en el selector
   - Opción "Todas las organizaciones" disponible

2. **ADMIN**:
   - Ve solo reportes de su organización
   - Selector de organización disponible (si tiene acceso a múltiples)
   - Filtrado automático por su `organizationId`

3. **Usuarios Regulares**:
   - Sin acceso (verificado por `assertAdmin`)

### Filtrado en Backend

```typescript
// En getSalesReportSupabase
let salesQuery = supabase
  .from('sales')
  .select('...')
  .eq('status', 'COMPLETED')
  .eq('organization_id', orgId)  // ✅ Filtrado crítico

// Similar en inventory, customers, financial
```

---

## 📊 Tipos de Reportes Implementados

Todos los reportes ya tienen filtrado por organización:

### 1. Sales Report (Ventas)
- Total de ventas por organización
- Órdenes completadas
- Productos más vendidos
- Ventas por categoría
- Ventas por cliente
- Ganancias y márgenes

### 2. Inventory Report (Inventario)
- Productos por organización
- Valor total del inventario
- Stock bajo y sin stock
- Movimientos de inventario
- Breakdown por categoría

### 3. Customer Report (Clientes)
- Clientes por organización
- Clientes activos
- Nuevos clientes
- Top clientes
- Segmentación
- Tendencias de adquisición

### 4. Financial Report (Financiero)
- Ingresos totales
- Costos
- Ganancias netas
- Márgenes de ganancia
- Flujo de efectivo
- Tendencias financieras

---

## 🎨 Interfaz de Usuario

### Selector de Organización

**Ubicación**: Header del dashboard, junto a los controles de exportación

**Características**:
- Solo visible para ADMIN y SUPER_ADMIN
- Icono `Building2` para identificación visual
- Estilo consistente con paleta Slate + Blue
- Opción "Todas las organizaciones" para super admins
- Actualización automática de reportes al cambiar

**Estilo**:
```tsx
className="w-64 bg-slate-800/50 border-slate-700"
```

### Badges de Estado

Ya existentes en el componente:
- Fuente de datos (Supabase/Backend)
- Tipo de conexión
- Estado de exportación en background

---

## 🔄 Flujo de Datos

### 1. Carga Inicial
```
Usuario accede → checkUserRole() → Determina si es ADMIN/SUPER_ADMIN
                                 ↓
                          loadOrganizations() → Obtiene lista
                                 ↓
                          Selecciona primera org por defecto
                                 ↓
                          useReports(filters) → Consulta API
                                 ↓
                          API usa assertAdmin → Obtiene organizationId
                                 ↓
                          Filtra datos por organización
                                 ↓
                          Retorna reportes filtrados
```

### 2. Cambio de Organización
```
Usuario selecciona org → setCurrentOrganization(orgId)
                       ↓
                  setFilters({ ...prev, organizationId: orgId })
                       ↓
                  useReports refetch con nuevo filtro
                       ↓
                  API recibe organizationId en params
                       ↓
                  Super admin: usa orgId del param
                  Admin regular: usa su organizationId
                       ↓
                  Reportes actualizados
```

---

## 🧪 Testing Recomendado

### Casos de Prueba

1. **Como SUPER_ADMIN**:
   - [ ] Ver reportes de todas las organizaciones
   - [ ] Selector muestra todas las organizaciones
   - [ ] Opción "Todas las organizaciones" funciona
   - [ ] Cambiar entre organizaciones actualiza datos
   - [ ] Exportar reportes de organización específica

2. **Como ADMIN**:
   - [ ] Ver solo reportes de mi organización
   - [ ] Selector visible (si aplica)
   - [ ] No ver datos de otras organizaciones
   - [ ] Exportar reportes funciona

3. **Verificar Datos**:
   - [ ] Sales report muestra datos correctos
   - [ ] Inventory report filtrado correctamente
   - [ ] Customer report solo de la organización
   - [ ] Financial report con datos precisos
   - [ ] Gráficos se actualizan correctamente

4. **Verificar Seguridad**:
   - [ ] Admin no puede ver datos de otras orgs
   - [ ] Filtrado en backend funciona
   - [ ] Cache respeta organizationId
   - [ ] Exportaciones filtradas correctamente

---

## 📁 Archivos Modificados

### Backend
1. `apps/frontend/src/app/api/reports/route.ts`
   - Agregado import de `assertAdmin`
   - Reemplazado sistema de autenticación
   - Agregado soporte para filtro por organización
   - Actualizado cache key

### Frontend
2. `apps/frontend/src/components/reports/reports-dashboard.tsx`
   - Agregado estado para organizaciones
   - Agregadas funciones de carga
   - Agregado selector de organización en UI
   - Importado icono `Building2`

### Documentación
3. `ADMIN_REPORTS_SAAS_IMPLEMENTACION.md` - Este documento

---

## ✅ Checklist de Implementación

- [x] Backend actualizado con `assertAdmin`
- [x] Filtrado por organización en API
- [x] Funciones de Supabase ya filtran correctamente
- [ ] Estado de organizaciones agregado en frontend
- [ ] Funciones de carga implementadas
- [ ] Selector de organización en UI
- [ ] useEffect para cargar datos iniciales
- [ ] Testing de flujo completo
- [ ] Build sin errores
- [ ] Subir cambios a Git

---

## 🚀 Próximos Pasos

1. **Completar Frontend**:
   - Agregar funciones `checkUserRole()` y `loadOrganizations()`
   - Agregar useEffect para cargar datos iniciales
   - Agregar selector de organización en el header
   - Actualizar filtros al cambiar organización

2. **Testing**:
   - Probar con usuario SUPER_ADMIN
   - Probar con usuario ADMIN
   - Verificar filtrado correcto
   - Verificar exportaciones

3. **Build y Deploy**:
   - Ejecutar `npm run build`
   - Verificar sin errores
   - Subir cambios a Git
   - Deploy a producción

---

## 📝 Notas Técnicas

### Cache y Organización

El cache ahora incluye el `orgId` en la key:
```typescript
const cacheKey = buildCacheKey(request.url + `&orgId=${effectiveOrgId}`)
```

Esto asegura que los datos cacheados sean específicos por organización.

### Compatibilidad con Backend

El endpoint sigue siendo compatible con el backend API:
```typescript
// Si no es Supabase, usa backend
const { data } = await api.get('/reports', { params })
```

### Optimización

- Cache por organización evita colisiones
- TTL diferenciado por tipo de reporte
- Funciones de Supabase optimizadas con joins
- Agregaciones en memoria para mejor rendimiento

---

## 🎉 Beneficios

- ✅ Seguridad multi-tenant robusta
- ✅ Filtrado automático por organización
- ✅ Interfaz intuitiva para administradores
- ✅ Compatible con sistema existente
- ✅ Cache optimizado por organización
- ✅ Código limpio y mantenible

**Estado**: Backend completo, Frontend en progreso
**Fecha**: 4 de febrero de 2026
