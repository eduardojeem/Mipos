# Diagnóstico de Rendimiento - Panel SuperAdmin

## 🔍 Problema Identificado

Las rutas de `/superadmin` tardan en cargar debido a múltiples problemas de rendimiento:

### 1. **Verificación de Permisos Redundante** ⚠️ CRÍTICO

**Ubicación:** `apps/frontend/src/app/superadmin/SuperAdminClientLayout.tsx` (líneas 73-84)

```typescript
useEffect(() => {
  if (!user) {
    router.push("/auth/signin");
    return;
  }
  setPermLoading(true);
  fetch('/api/superadmin/me')
    .then(async (r) => {
      const j = await r.json();
      if (!r.ok || !j?.isSuperAdmin) {
        router.push('/dashboard');
      }
    })
    .finally(() => setPermLoading(false));
}, [user, router]);
```

**Problema:**
- Se ejecuta en **CADA navegación** dentro de `/superadmin`
- El endpoint `/api/superadmin/me` hace **3 consultas a la base de datos**:
  1. `user_roles` con join a `roles`
  2. `users` tabla
  3. Verifica `user_metadata`
- Esto se ejecuta **además** del `layout.tsx` que ya verifica la sesión

**Impacto:** 300-800ms de delay en cada cambio de ruta

---

### 2. **Fetching Excesivo en Hooks** ⚠️ ALTO

**Ubicación:** Múltiples hooks personalizados

#### `useOrganizations` - Problema de Cache
```typescript
staleTime: 5 * 60 * 1000, // 5 minutes
```
- Buen tiempo de cache, pero se invalida en cada mutación
- No usa optimistic updates correctamente

#### `useUsers` - Problema de Cache
```typescript
staleTime: 2 * 60 * 1000, // 2 minutes
```
- Cache muy corto para datos que no cambian frecuentemente
- Se refetch en cada navegación

#### `useAdminData` - Fetching Dual
```typescript
const [statsRes, orgsRes] = await Promise.allSettled([
  fetch('/api/superadmin/stats', ...),
  fetch('/api/superadmin/organizations?pageSize=100', ...),
]);
```
- Hace 2 requests en paralelo en cada carga
- No aprovecha React Query para deduplicación

**Impacto:** 500-1200ms adicionales por página

---

### 3. **Queries N+1 en Endpoints** ⚠️ MEDIO

**Ubicación:** `/api/superadmin/organizations/route.ts`

Las organizaciones se cargan con:
```typescript
.select('*, organization_members(count)')
```

Esto puede causar queries adicionales si no está optimizado en Supabase.

---

### 4. **Sin Lazy Loading de Componentes** ⚠️ BAJO

El `SuperAdminClientLayout` carga todos los iconos y componentes inmediatamente:
- 12+ iconos de Lucide
- Todos los componentes de UI
- No usa `React.lazy()` o `next/dynamic`

**Impacto:** 100-200ms en el bundle inicial

---

## 🎯 Soluciones Propuestas

### Solución 1: Eliminar Verificación Redundante (CRÍTICO)

**Cambio en `SuperAdminClientLayout.tsx`:**

```typescript
// ❌ ELIMINAR este useEffect completo
useEffect(() => {
  if (!user) {
    router.push("/auth/signin");
    return;
  }
  setPermLoading(true);
  fetch('/api/superadmin/me')
    .then(async (r) => {
      const j = await r.json();
      if (!r.ok || !j?.isSuperAdmin) {
        router.push('/dashboard');
      }
    })
    .finally(() => setPermLoading(false));
}, [user, router]);

// ✅ REEMPLAZAR con verificación simple
useEffect(() => {
  if (!user) {
    router.push("/auth/signin");
  }
}, [user, router]);
```

**Justificación:**
- El `layout.tsx` ya verifica la sesión con `supabase.auth.getSession()`
- El componente `SuperAdminGuard` ya verifica permisos en cada página
- Esta verificación es redundante y costosa

**Ganancia esperada:** -300 a -800ms

---

### Solución 2: Optimizar Cache de React Query

**Cambio en `useOrganizations.ts`:**

```typescript
staleTime: 10 * 60 * 1000, // ✅ 10 minutos (era 5)
cacheTime: 15 * 60 * 1000, // ✅ 15 minutos
refetchOnWindowFocus: false, // ✅ No refetch al cambiar de tab
refetchOnMount: false, // ✅ No refetch si hay cache válido
```

**Cambio en `useUsers.ts`:**

```typescript
staleTime: 5 * 60 * 1000, // ✅ 5 minutos (era 2)
cacheTime: 10 * 60 * 1000, // ✅ 10 minutos
refetchOnWindowFocus: false,
refetchOnMount: false,
```

**Ganancia esperada:** -200 a -500ms en navegaciones subsecuentes

---

### Solución 3: Implementar Prefetching

**Nuevo archivo: `apps/frontend/src/app/superadmin/hooks/usePrefetch.ts`**

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useSuperAdminPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch organizations
    queryClient.prefetchQuery({
      queryKey: ['admin', 'organizations', { page: 1, pageSize: 100 }],
      queryFn: () => fetch('/api/superadmin/organizations?pageSize=100').then(r => r.json()),
      staleTime: 10 * 60 * 1000,
    });

    // Prefetch users
    queryClient.prefetchQuery({
      queryKey: ['admin', 'users', { page: 1, limit: 50 }],
      queryFn: () => fetch('/api/superadmin/users?page=1&limit=50').then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
}
```

**Uso en `SuperAdminClientLayout.tsx`:**

```typescript
import { useSuperAdminPrefetch } from './hooks/usePrefetch';

export default function SuperAdminClientLayout({ children }) {
  useSuperAdminPrefetch(); // ✅ Prefetch en el layout
  // ... resto del código
}
```

**Ganancia esperada:** -400 a -800ms en primera carga de sub-rutas

---

### Solución 4: Lazy Loading de Componentes

**Cambio en `SuperAdminClientLayout.tsx`:**

```typescript
import dynamic from 'next/dynamic';

// ✅ Lazy load del theme toggle
const SuperAdminThemeToggle = dynamic(
  () => import('./components/SuperAdminThemeToggle'),
  { ssr: false }
);

// ✅ Lazy load de iconos pesados (si es necesario)
const navigationItems = [
  {
    title: "Dashboard",
    href: "/superadmin",
    icon: () => import('lucide-react').then(mod => mod.BarChart3),
    // ...
  },
  // ...
];
```

**Ganancia esperada:** -50 a -150ms en bundle inicial

---

### Solución 5: Optimizar Endpoint `/api/superadmin/me`

**Cambio en `apps/frontend/src/app/api/superadmin/me/route.ts`:**

```typescript
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // ✅ OPTIMIZACIÓN: Una sola query con OR
    const { data: userData } = await supabase
      .from('users')
      .select('role, user_roles!inner(role:roles!inner(name))')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = 
      userData?.role === 'SUPER_ADMIN' ||
      userData?.user_roles?.some(ur => ur.role?.name === 'SUPER_ADMIN') ||
      user.user_metadata?.role === 'SUPER_ADMIN'

    return NextResponse.json({ 
      success: true, 
      isSuperAdmin, 
      role: isSuperAdmin ? 'SUPER_ADMIN' : userData?.role 
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

**Ganancia esperada:** -100 a -300ms en el endpoint

---

## 📊 Resumen de Mejoras

| Solución | Prioridad | Ganancia Estimada | Dificultad |
|----------|-----------|-------------------|------------|
| 1. Eliminar verificación redundante | 🔴 CRÍTICA | 300-800ms | Fácil |
| 2. Optimizar cache React Query | 🟡 ALTA | 200-500ms | Fácil |
| 3. Implementar prefetching | 🟡 ALTA | 400-800ms | Media |
| 4. Lazy loading componentes | 🟢 MEDIA | 50-150ms | Fácil |
| 5. Optimizar endpoint /me | 🟡 ALTA | 100-300ms | Media |

**Ganancia total estimada:** 1050-2550ms (1-2.5 segundos)

---

## 🚀 Plan de Implementación

### Fase 1: Quick Wins (30 minutos)
1. ✅ Eliminar verificación redundante en `SuperAdminClientLayout`
2. ✅ Aumentar `staleTime` en hooks de React Query
3. ✅ Agregar `refetchOnWindowFocus: false`

### Fase 2: Optimizaciones Medias (1 hora)
4. ✅ Implementar prefetching en layout
5. ✅ Optimizar endpoint `/api/superadmin/me`

### Fase 3: Optimizaciones Avanzadas (2 horas)
6. ✅ Lazy loading de componentes
7. ✅ Revisar y optimizar queries N+1 en endpoints
8. ✅ Implementar loading skeletons más eficientes

---

## 🧪 Cómo Medir las Mejoras

### Antes de los cambios:
```bash
# En Chrome DevTools > Network
# Filtrar por "superadmin"
# Medir tiempo total de carga
```

### Después de los cambios:
```bash
# Comparar tiempos
# Objetivo: < 500ms para navegación entre rutas
# Objetivo: < 1500ms para carga inicial
```

### Métricas clave:
- **TTFB** (Time to First Byte): < 200ms
- **FCP** (First Contentful Paint): < 800ms
- **LCP** (Largest Contentful Paint): < 1500ms
- **TTI** (Time to Interactive): < 2000ms

---

## 📝 Notas Adicionales

### Consideraciones de Seguridad
- La eliminación de la verificación redundante NO compromete la seguridad
- El `layout.tsx` server-side ya verifica la sesión
- El `SuperAdminGuard` client-side verifica permisos en cada página
- Los endpoints API siempre verifican permisos

### Consideraciones de UX
- Implementar loading skeletons mientras se cargan los datos
- Mostrar indicadores de "cached data" cuando corresponda
- Agregar botón de "refresh" manual para datos críticos

### Monitoreo Post-Implementación
- Usar React Query DevTools para verificar cache hits
- Monitorear tiempos de respuesta de endpoints
- Revisar logs de Supabase para queries lentas
