# Documento de Requisitos

## Introducción

Este documento define los requisitos para la auditoría y limpieza del layout de administración (`/admin`) en el proyecto MiPOS (Next.js monorepo, `apps/frontend`). El análisis del código revela duplicidades funcionales entre `/admin`, `/dashboard` y `/superadmin`, rutas huérfanas en la navegación, páginas con datos simulados (mock), y un "panel SaaS" ubicado fuera de su namespace correcto (`/dashboard/admin`). El objetivo es consolidar la arquitectura de información bajo el principio **un capability = una ruta canónica**, preservando toda la funcionalidad crítica y mejorando la experiencia de navegación para los roles ADMIN, OWNER y SUPER_ADMIN.

---

## Glosario

- **Admin_Layout**: El layout y conjunto de rutas bajo `/admin` en `apps/frontend/src/app/admin/`.
- **Dashboard**: El área operativa bajo `/dashboard`, destinada a la operación diaria del negocio.
- **Settings**: La sección `/dashboard/settings`, destinada a la configuración de empresa, usuarios, seguridad y suscripción.
- **Admin_Avanzado**: El subconjunto de `/admin` que contiene funcionalidades genuinamente administrativas: auditoría, sesiones y mantenimiento.
- **Superadmin**: El área `/superadmin`, destinada a la administración global de la plataforma SaaS (planes, organizaciones, monitoreo).
- **Ruta_Canónica**: La única ruta oficial donde reside una funcionalidad; cualquier otra ruta que exponga la misma funcionalidad es un duplicado.
- **Ruta_Huérfana**: Un ítem de navegación que apunta a una ruta sin `page.tsx` existente.
- **Página_Mock**: Una página cuyo contenido usa datos hardcodeados o simulados en lugar de datos reales de la API.
- **Redirect**: Una redirección HTTP (Next.js `redirect()`) que envía al usuario desde una ruta deprecada hacia la Ruta_Canónica.
- **Deep_Link**: Un enlace explícito desde el Admin_Layout hacia una Ruta_Canónica en otro namespace (p.ej. desde `/admin` hacia `/dashboard/reports`).
- **Navigation_Config**: El archivo `apps/frontend/src/lib/admin/navigation.ts` que define los ítems del menú de administración.
- **AdminLayoutWrapper**: El componente `apps/frontend/src/components/admin/admin-layout-wrapper.tsx` que envuelve todas las páginas de `/admin`.
- **Capability**: Una funcionalidad discreta del sistema (p.ej. "gestión de usuarios", "reportes", "suscripción").

---

## Requisitos

### Requisito 1: Inventario y clasificación de rutas del Admin_Layout

**User Story:** Como desarrollador, quiero un inventario completo y clasificado de todas las rutas bajo `/admin`, para que pueda identificar cuáles son canónicas, cuáles son duplicados y cuáles son huérfanas.

#### Criterios de Aceptación

1. THE Admin_Layout SHALL documentar todas las rutas existentes bajo `/admin` con su estado: `canónica`, `duplicado`, `huérfana` o `mock`.
2. WHEN una ruta bajo `/admin` importa componentes o hooks de `/dashboard`, THE Admin_Layout SHALL clasificar esa ruta como `duplicado`.
3. WHEN un ítem del Navigation_Config apunta a una ruta sin `page.tsx`, THE Admin_Layout SHALL clasificar ese ítem como `huérfana`.
4. WHEN una página bajo `/admin` usa datos hardcodeados en lugar de llamadas a API reales, THE Admin_Layout SHALL clasificar esa página como `mock`.
5. THE Admin_Layout SHALL identificar `/admin/plans` como ruta huérfana (ítem en Navigation_Config sin `page.tsx` correspondiente).
6. THE Admin_Layout SHALL identificar `/admin/reports` como duplicado de `/dashboard/reports` (importa sus componentes y hooks directamente).
7. THE Admin_Layout SHALL identificar `/dashboard/admin` como panel SaaS fuera de su namespace correcto.

---

### Requisito 2: Eliminación de rutas duplicadas con redirección

**User Story:** Como usuario administrador, quiero que las rutas duplicadas me redirijan automáticamente a la Ruta_Canónica, para que no existan dos puntos de entrada distintos para la misma funcionalidad.

#### Criterios de Aceptación

1. WHEN un usuario navega a `/admin/reports`, THE Admin_Layout SHALL redirigir al usuario a `/dashboard/reports` mediante un Redirect de Next.js.
2. WHEN un usuario navega a `/admin/subscriptions`, THE Admin_Layout SHALL redirigir al usuario a `/dashboard/settings?tab=subscription` mediante un Redirect de Next.js.
3. WHEN un usuario navega a `/admin/profile`, THE Admin_Layout SHALL redirigir al usuario a `/dashboard/profile` mediante un Redirect de Next.js.
4. WHEN un usuario navega a `/admin/users`, THE Admin_Layout SHALL redirigir al usuario a `/dashboard/settings?tab=users-roles` mediante un Redirect de Next.js.
5. WHEN un usuario navega a `/dashboard/admin`, THE Admin_Layout SHALL redirigir al usuario a `/superadmin` mediante un Redirect de Next.js.
6. IF un Redirect falla por error de sesión, THEN THE Admin_Layout SHALL redirigir al usuario a `/auth/signin` con el parámetro `returnUrl` correspondiente.

---

### Requisito 3: Corrección de rutas huérfanas en la navegación

**User Story:** Como usuario administrador, quiero que todos los ítems del menú de administración apunten a páginas existentes, para que no encuentre errores 404 al navegar.

#### Criterios de Aceptación

1. THE Navigation_Config SHALL contener únicamente ítems cuyas rutas `href` tengan un `page.tsx` existente o un Redirect configurado.
2. WHEN el ítem "Planes SaaS" apunta a `/admin/plans` y no existe `page.tsx`, THE Navigation_Config SHALL actualizar el `href` a `/superadmin/plans`.
3. WHEN el ítem "Sucursales" apunta a `/admin/organizations` y no existe `page.tsx`, THE Navigation_Config SHALL actualizar el `href` a `/superadmin/organizations` o eliminarlo si el rol no es SUPER_ADMIN.
4. THE Navigation_Config SHALL no contener ítems con `href` que resulten en respuesta HTTP 404.
5. WHEN se elimina un ítem del Navigation_Config, THE Admin_Layout SHALL verificar que ningún otro componente referencie ese `href` como enlace activo.

---

### Requisito 4: Consolidación de la página `/admin/security`

**User Story:** Como administrador, quiero que la página de seguridad del panel admin muestre datos reales del sistema, para que pueda tomar decisiones basadas en información verídica.

#### Criterios de Aceptación

1. THE Admin_Layout SHALL eliminar la página `/admin/security` que usa datos hardcodeados (amenazas, IPs bloqueadas y sesiones simuladas).
2. WHEN se elimina `/admin/security`, THE Admin_Layout SHALL redirigir `/admin/security` a `/dashboard/settings?tab=security` para la configuración de autenticación y políticas.
3. WHEN un usuario ADMIN o OWNER necesita gestionar sesiones activas, THE Admin_Layout SHALL mantener `/admin/sessions` como la Ruta_Canónica para esa funcionalidad (ya conectada a APIs reales).
4. THE Navigation_Config SHALL actualizar el ítem "Seguridad" para apuntar a `/admin/sessions` o a `/dashboard/settings?tab=security` según el contexto de uso.
5. IF el usuario accede a `/admin/security` con rol SUPER_ADMIN, THEN THE Admin_Layout SHALL redirigir a `/admin/sessions` en lugar de mostrar la página mock.

---

### Requisito 5: Consolidación de configuración pública del negocio

**User Story:** Como administrador, quiero un único punto de entrada para configurar la presencia pública del negocio, para que no existan dos páginas con propósito solapado.

#### Criterios de Aceptación

1. THE Admin_Layout SHALL mantener `/admin/business-config` como la Ruta_Canónica para toda la configuración pública del negocio (contenido, dominio, branding, carrusel, contacto, legal).
2. WHEN existe `/admin/website-config` con funcionalidad solapada a `/admin/business-config`, THE Admin_Layout SHALL redirigir `/admin/website-config` a `/admin/business-config`.
3. WHEN se consolida la configuración pública, THE Admin_Layout SHALL verificar que todos los componentes útiles de `/admin/website-config` estén disponibles en `/admin/business-config` antes de aplicar el Redirect.
4. THE Navigation_Config SHALL contener un único ítem para configuración pública apuntando a `/admin/business-config`.
5. THE Admin_Layout SHALL no mostrar dos ítems de navegación distintos para "Empresa" y "Website Config" cuando ambos apuntan a funcionalidades equivalentes.

---

### Requisito 6: Redefinición del Admin_Layout como "Admin Avanzado"

**User Story:** Como administrador, quiero que el panel `/admin` esté claramente enfocado en administración avanzada (auditoría, sesiones, mantenimiento), para que no se confunda con el dashboard operativo.

#### Criterios de Aceptación

1. THE Admin_Layout SHALL organizar su navegación en secciones que reflejen únicamente capacidades de administración avanzada: Empresa (configuración), Auditoría y Seguridad, y Plataforma (solo SUPER_ADMIN).
2. THE Navigation_Config SHALL eliminar los ítems que apuntan a rutas operativas de Dashboard (`/dashboard/settings`, `/dashboard/products`, `/dashboard/sales`) como ítems de primer nivel del menú Admin.
3. WHEN el Admin_Layout necesita ofrecer acceso a funcionalidades operativas, THE Admin_Layout SHALL usar Deep_Links explícitos con etiqueta clara (p.ej. "Ver en Dashboard →") en lugar de duplicar la UI.
4. THE Admin_Layout SHALL mantener en su navegación únicamente: Dashboard Admin, Empresa (business-config), Usuarios y Roles, Plan y Suscripción, Auditoría, Sesiones, Mantenimiento, y secciones SUPER_ADMIN.
5. WHILE el usuario tiene rol ADMIN u OWNER, THE Admin_Layout SHALL no mostrar ítems marcados como `superAdminOnly: true` en el Navigation_Config.

---

### Requisito 7: Preservación de funcionalidades críticas

**User Story:** Como administrador, quiero que todas las funcionalidades críticas permanezcan accesibles después de la limpieza, para que ninguna capacidad operativa se pierda durante la consolidación.

#### Criterios de Aceptación

1. THE Admin_Layout SHALL garantizar que las siguientes funcionalidades permanezcan accesibles tras la limpieza: gestión de usuarios, gestión de roles, configuración de suscripción, reportes, auditoría, sesiones, mantenimiento y configuración pública.
2. WHEN una ruta es eliminada o redirigida, THE Admin_Layout SHALL verificar que la Ruta_Canónica de destino exponga la misma funcionalidad antes de aplicar el cambio.
3. THE Admin_Layout SHALL mantener `/admin/audit` como Ruta_Canónica para auditoría de eventos y trazabilidad.
4. THE Admin_Layout SHALL mantener `/admin/sessions` como Ruta_Canónica para gestión de sesiones activas a nivel organización.
5. THE Admin_Layout SHALL mantener `/admin/maintenance` como Ruta_Canónica para herramientas de mantenimiento y soporte.
6. THE Admin_Layout SHALL mantener `/admin/business-config` como Ruta_Canónica para configuración pública del negocio.
7. IF una funcionalidad no tiene Ruta_Canónica clara en `/dashboard/settings`, THEN THE Admin_Layout SHALL mantener la ruta existente en `/admin` hasta que se defina la ruta canónica.

---

### Requisito 8: Reporte de cambios y métricas de optimización

**User Story:** Como desarrollador o product manager, quiero un reporte detallado de todos los cambios realizados durante la limpieza, para que pueda evaluar el impacto de la optimización y comunicarlo al equipo.

#### Criterios de Aceptación

1. THE Admin_Layout SHALL generar un reporte de cambios que incluya: lista de rutas eliminadas, lista de redirects creados, lista de ítems de navegación modificados, y lista de páginas mock identificadas.
2. THE Admin_Layout SHALL documentar las métricas de optimización antes y después: número de rutas bajo `/admin`, número de ítems en el Navigation_Config, y número de duplicados funcionales identificados.
3. THE Admin_Layout SHALL documentar la reducción de complejidad de navegación: cantidad de ítems visibles por rol (ADMIN/OWNER/SUPER_ADMIN) antes y después de la limpieza.
4. WHEN se aplican redirects, THE Admin_Layout SHALL documentar el impacto estimado en carga de página (eliminación de componentes duplicados como `framer-motion` cargado en rutas redundantes).
5. THE Admin_Layout SHALL documentar las rutas canónicas finales por capability en una tabla de referencia para el equipo de desarrollo.

---

### Requisito 9: Integridad de la navegación post-limpieza

**User Story:** Como usuario administrador, quiero que la navegación del panel admin funcione correctamente después de la limpieza, para que no encuentre enlaces rotos ni comportamientos inesperados.

#### Criterios de Aceptación

1. WHEN se completa la limpieza, THE Admin_Layout SHALL no contener ningún ítem de navegación que resulte en respuesta HTTP 404.
2. WHEN un usuario con rol ADMIN navega por el panel `/admin`, THE Admin_Layout SHALL mostrar únicamente los ítems para los que tiene permisos según su rol y plan.
3. THE Admin_Layout SHALL mantener el guard de autenticación en el layout principal (`apps/frontend/src/app/admin/layout.tsx`) que redirige a `/auth/signin` cuando no hay sesión activa.
4. WHEN el AdminRouteGuard detecta que el usuario no tiene acceso a la ruta actual, THE Admin_Layout SHALL redirigir al primer ítem accesible del Navigation_Config.
5. THE Admin_Layout SHALL mantener la coherencia visual del sidebar (AdminSidebar) y el header (AdminHeader) en todas las páginas que permanezcan bajo `/admin`.
6. IF un Redirect apunta a una ruta de Dashboard que requiere `organizationId` en cookie, THEN THE Admin_Layout SHALL preservar el contexto de organización durante la redirección.
