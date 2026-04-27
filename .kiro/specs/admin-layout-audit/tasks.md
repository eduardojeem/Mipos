# Plan de Tareas: Auditoría y Limpieza del Admin Layout

## Tareas

- [x] 1. Reemplazar páginas duplicadas con redirects
  - [x] 1.1 Reemplazar `/admin/reports/page.tsx` con redirect a `/dashboard/reports`
  - [x] 1.2 Reemplazar `/admin/security/page.tsx` con redirect a `/admin/sessions`
  - [x] 1.3 Reemplazar `/admin/profile/page.tsx` con redirect a `/dashboard/profile`
  - [x] 1.4 Reemplazar `/admin/website-config/page.tsx` con redirect a `/admin/business-config`
  - [x] 1.5 Reemplazar `/dashboard/admin/page.tsx` con redirect a `/superadmin`

- [x] 2. Eliminar directorios huérfanos vacíos
  - [x] 2.1 Eliminar directorio `apps/frontend/src/app/admin/invoices/`
  - [x] 2.2 Eliminar directorio `apps/frontend/src/app/admin/organizations/`
  - [x] 2.3 Eliminar directorio `apps/frontend/src/app/admin/plans/`
  - [x] 2.4 Eliminar directorio `apps/frontend/src/app/admin/saas-metrics/`
  - [x] 2.5 Eliminar directorio `apps/frontend/src/app/admin/settings/`

- [x] 3. Actualizar `navigation.ts` para eliminar ítems rotos y reorganizar secciones
  - [x] 3.1 Eliminar ítem "Sucursales" (href `/admin/organizations`, huérfano, superAdminOnly)
  - [x] 3.2 Eliminar ítem "Reportes" (href `/admin/reports`, ahora es redirect)
  - [x] 3.3 Actualizar ítem "Seguridad": cambiar href de `/admin/security` a `/admin/sessions`
  - [x] 3.4 Actualizar ítem "Planes SaaS": cambiar href de `/admin/plans` a `/superadmin/plans`
  - [x] 3.5 Eliminar ítems de sección `operations` que apuntan a rutas de dashboard (`/dashboard/settings`, `/dashboard/products`, `/dashboard/sales`)
  - [x] 3.6 Eliminar la sección `operations` de `AdminSectionKey` y `ADMIN_SECTION_LABELS` si queda vacía

- [x] 4. Actualizar `/admin/page.tsx` — sección "Acciones prioritarias"
  - [x] 4.1 Cambiar href del botón "Revisar seguridad" de `/admin/security` a `/admin/sessions`
  - [x] 4.2 Cambiar href del botón "Ver analisis y reportes" de `/admin/reports` a `/dashboard/reports`

- [x] 5. Verificación post-limpieza
  - [x] 5.1 Confirmar que ningún ítem de `adminNavigationConfig` apunta a una ruta sin `page.tsx` o redirect
  - [x] 5.2 Buscar en el codebase referencias a hrefs eliminados (`/admin/organizations`, `/admin/plans`, `/admin/security`, `/admin/reports`) para asegurar que no queden enlaces rotos en otros componentes
  - [x] 5.3 Confirmar que las rutas canónicas preservadas siguen funcionando: `/admin/sessions`, `/admin/business-config`, `/admin/subscriptions`, `/admin/audit`, `/admin/users`, `/admin/maintenance`
