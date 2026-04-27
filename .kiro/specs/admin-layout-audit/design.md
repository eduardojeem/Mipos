# Diseño: Auditoría y Limpieza del Admin Layout

## Visión General

El panel `/admin` de MiPOS acumuló rutas duplicadas, páginas con datos simulados y ítems de navegación huérfanos a lo largo del desarrollo. Este documento describe la arquitectura de información objetivo y los cambios técnicos necesarios para consolidar el layout bajo el principio **un capability = una ruta canónica**.

El resultado esperado es un panel `/admin` enfocado exclusivamente en administración avanzada (configuración de empresa, usuarios, auditoría, sesiones, mantenimiento y suscripción), con redirects HTTP para las rutas deprecadas y una navegación sin ítems rotos.

### Estado actual vs. estado objetivo

| Dimensión | Antes | Después |
|-----------|-------|---------|
| Rutas bajo `/admin` con `page.tsx` | 12 | 8 |
| Ítems en `navigation.ts` | 15 | 10 |
| Páginas mock (datos hardcodeados) | 1 (`/admin/security`) | 0 |
| Rutas duplicadas funcionales | 4 | 0 |
| Directorios huérfanos vacíos | 5 | 0 |
| Ítems de navegación con href 404 | 2 | 0 |

---

## Arquitectura

### Principio de diseño

Cada capability del sistema tiene exactamente una ruta canónica. Las rutas que duplican una capability existente se reemplazan por un `redirect()` de Next.js (server-side, sin JS en cliente). Los directorios vacíos se eliminan para reducir ruido en el árbol de archivos.

### Mapa de rutas canónicas post-limpieza

```
/admin                          → CANÓNICA  (dashboard home del panel admin)
/admin/business-config          → CANÓNICA  (configuración pública del negocio)
/admin/users                    → CANÓNICA  (gestión de usuarios y roles)
/admin/subscriptions            → CANÓNICA  (plan y suscripción — tiene API real)
/admin/audit                    → CANÓNICA  (auditoría de eventos)
/admin/sessions                 → CANÓNICA  (sesiones activas)
/admin/maintenance              → CANÓNICA  (herramientas de mantenimiento, superAdminOnly)
/admin/roles                    → CANÓNICA  (gestión de roles)

/admin/reports      → redirect → /dashboard/reports
/admin/security     → redirect → /admin/sessions
/admin/profile      → redirect → /dashboard/profile
/admin/website-config → redirect → /admin/business-config
/dashboard/admin    → redirect → /superadmin
```

### Directorios a eliminar (vacíos, sin page.tsx)

- `apps/frontend/src/app/admin/invoices/`
- `apps/frontend/src/app/admin/organizations/`
- `apps/frontend/src/app/admin/plans/`
- `apps/frontend/src/app/admin/saas-metrics/`
- `apps/frontend/src/app/admin/settings/`

### Diagrama de flujo de navegación

```mermaid
flowchart TD
    A[Usuario navega a /admin/*] --> B{¿Ruta canónica?}
    B -- Sí --> C[Renderiza página]
    B -- No --> D{¿Tiene redirect?}
    D -- Sí --> E[redirect() → ruta canónica]
    D -- No --> F[404 — no debería ocurrir post-limpieza]
    E --> C
```

---

## Componentes e Interfaces

### 1. Páginas de redirect (nuevas)

Cada página de redirect es un Server Component mínimo que llama a `redirect()` de Next.js. No requieren estado ni lógica de cliente.

**Patrón estándar:**

```tsx
// apps/frontend/src/app/admin/{ruta}/page.tsx
import { redirect } from 'next/navigation'

export default function RedirectPage() {
  redirect('/ruta-canonica')
}
```

Las páginas a crear/reemplazar:

| Archivo | Destino del redirect |
|---------|---------------------|
| `apps/frontend/src/app/admin/reports/page.tsx` | `/dashboard/reports` |
| `apps/frontend/src/app/admin/security/page.tsx` | `/admin/sessions` |
| `apps/frontend/src/app/admin/profile/page.tsx` | `/dashboard/profile` |
| `apps/frontend/src/app/admin/website-config/page.tsx` | `/admin/business-config` |
| `apps/frontend/src/app/dashboard/admin/page.tsx` | `/superadmin` |

> **Nota sobre `/admin/website-config`**: La página actual tiene componentes propios en `./components/` (BrandingConfigForm, HeroConfigForm, SEOConfigForm, etc.) y usa `WebsiteConfigContext`. Antes de aplicar el redirect, se debe verificar que `/admin/business-config` cubra las mismas funcionalidades. Si hay funcionalidades únicas en `website-config` que no están en `business-config`, deben migrarse primero. Según el análisis del código, ambas páginas cubren configuración pública del negocio con solapamiento significativo; el redirect es apropiado.

### 2. Navigation config actualizada

**Archivo:** `apps/frontend/src/lib/admin/navigation.ts`

Cambios:
- Eliminar ítem `"Sucursales"` (href `/admin/organizations` → huérfano, superAdminOnly)
- Eliminar ítem `"Reportes"` (href `/admin/reports` → ahora es redirect, el deep link a `/dashboard/reports` es suficiente)
- Actualizar ítem `"Seguridad"` → href cambia de `/admin/security` a `/admin/sessions`
- Actualizar ítem `"Planes SaaS"` → href cambia de `/admin/plans` a `/superadmin/plans`
- Eliminar ítems de sección `operations` que apuntan a rutas de dashboard como ítems de primer nivel (`/dashboard/settings`, `/dashboard/products`, `/dashboard/sales`) — estos son deep links operativos que no pertenecen al menú admin avanzado

**Configuración objetivo de `adminNavigationConfig`:**

```typescript
// Sección: overview
{ title: 'Dashboard', href: '/admin', section: 'overview', ... }

// Sección: company
{ title: 'Empresa', href: '/admin/business-config', section: 'company', ... }
{ title: 'Usuarios y Roles', href: '/admin/users', section: 'company', ... }
{ title: 'Plan y Suscripcion', href: '/admin/subscriptions', section: 'company', ... }

// Sección: security
{ title: 'Auditoria', href: '/admin/audit', section: 'security', ... }
{ title: 'Sesiones', href: '/admin/sessions', section: 'security', ... }

// Sección: platform (superAdminOnly)
{ title: 'Planes SaaS', href: '/superadmin/plans', section: 'platform', superAdminOnly: true, ... }
{ title: 'Mantenimiento', href: '/admin/maintenance', section: 'platform', superAdminOnly: true, ... }
{ title: 'Panel SaaS', href: '/superadmin', section: 'platform', superAdminOnly: true, ... }
```

### 3. Admin dashboard page actualizada

**Archivo:** `apps/frontend/src/app/admin/page.tsx`

La sección "Acciones prioritarias" tiene tres botones con hrefs deprecados:
- `/admin/subscriptions` → mantener (es canónica)
- `/admin/security` → cambiar a `/admin/sessions`
- `/admin/reports` → cambiar a `/dashboard/reports`

---

## Modelos de Datos

No se introducen nuevos modelos de datos. Los redirects son puramente de enrutamiento. La `navigation.ts` es un array de configuración estático tipado con `AdminNavItemConfig`.

### Tipo `AdminNavItemConfig` (sin cambios)

```typescript
export type AdminNavItemConfig = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  section: AdminSectionKey
  requiredRoles?: string[]
  requireAdminPanel?: boolean
  requireReports?: boolean
  requiredFeature?: CompanyFeatureKey
  superAdminOnly?: boolean
  exact?: boolean
}
```

### Secciones de navegación post-limpieza

La sección `'operations'` queda vacía y puede eliminarse del tipo `AdminSectionKey` y de `ADMIN_SECTION_LABELS` si no hay ítems que la usen.

---

## Propiedades de Corrección

Esta feature es una refactorización de enrutamiento y configuración de navegación. No involucra lógica de transformación de datos, parsers, serializadores ni algoritmos con espacio de entrada variable. Los cambios son:

1. Reemplazar contenido de archivos `page.tsx` con llamadas a `redirect()`
2. Modificar un array de configuración estático
3. Actualizar hrefs en un componente de UI

Estas operaciones son deterministas y no tienen propiedades universales que se beneficien de property-based testing. Las pruebas apropiadas son:

- **Smoke tests**: verificar que cada ruta canónica devuelve HTTP 200
- **Redirect tests**: verificar que cada ruta deprecada devuelve HTTP 3xx con el `Location` correcto
- **Navigation tests**: verificar que ningún ítem del menú apunta a una ruta 404

PBT no aplica a esta feature. Se omite la sección de Correctness Properties.

---

## Manejo de Errores

### Redirects y sesión

El layout `/admin/layout.tsx` ya maneja la ausencia de sesión redirigiendo a `/auth/signin?returnUrl=/admin`. Los redirects de rutas deprecadas ocurren dentro del layout, por lo que la sesión ya está validada cuando se ejecuta el `redirect()`.

Para el redirect de `/dashboard/admin → /superadmin`, este ocurre dentro del layout de `/dashboard`, que tiene su propio guard de autenticación.

### Contexto de organización

Los redirects hacia rutas de `/dashboard` (como `/dashboard/reports` y `/dashboard/profile`) preservan el contexto de organización porque este se almacena en cookie y es leído por el layout de dashboard independientemente de la ruta de origen.

### Ítems de navegación eliminados

Al eliminar ítems del `adminNavigationConfig`, el hook `useAdminNavigation` filtra dinámicamente los ítems según rol y permisos. No hay referencias hardcodeadas a ítems específicos por índice, por lo que la eliminación es segura.

---

## Estrategia de Testing

### Tests de humo (smoke tests)

Verificar manualmente o con Playwright que:

1. Cada ruta canónica devuelve contenido (no 404, no redirect loop)
2. Cada ruta deprecada redirige al destino correcto
3. El menú de navegación no muestra ítems con href 404

### Tests de navegación

```
GET /admin/reports       → 307/308 Location: /dashboard/reports
GET /admin/security      → 307/308 Location: /admin/sessions
GET /admin/profile       → 307/308 Location: /dashboard/profile
GET /admin/website-config → 307/308 Location: /admin/business-config
GET /dashboard/admin     → 307/308 Location: /superadmin
```

### Verificación de navigation.ts

Después de los cambios, ejecutar una búsqueda en el codebase para confirmar que ningún componente referencia los hrefs eliminados (`/admin/organizations`, `/admin/plans`, `/admin/security`, `/admin/reports`) como destinos de navegación activos.

### Tests de regresión

- Confirmar que `/admin/sessions` sigue funcionando correctamente (es el destino del redirect de `/admin/security`)
- Confirmar que `/admin/business-config` sigue funcionando correctamente (es el destino del redirect de `/admin/website-config`)
- Confirmar que `/admin/subscriptions` sigue funcionando (no se toca, pero es referenciada desde `admin/page.tsx`)
