# Sección de Plan SaaS en Perfil de Usuario

## Resumen de Cambios

Se agregó una nueva pestaña "Plan" en la sección de perfil del usuario (`/dashboard/profile`) que permite:

1. **Ver el plan actual** de la organización del usuario
2. **Explorar planes disponibles** en el sistema
3. **Solicitar cambio de plan** a través de un botón de acción

Además, se mejoró la sección de **Información de Cuenta** para mostrar:

4. **Información de la organización** a la que pertenece el usuario
5. **Rol dentro de la organización** (Admin, Vendedor, Cajero, etc.)
6. **Permisos principales** asociados al rol
7. **Descripción del rol** para mayor claridad

## Archivos Modificados

### 1. Frontend - Página de Perfil
**Archivo:** `apps/frontend/src/app/dashboard/profile/page.tsx`

**Cambios:**
- Agregada tercera pestaña "Plan" con ícono `Sparkles`
- Creado componente `PlanSection` que muestra:
  - Plan actual con detalles completos (precio, límites, características)
  - Grid de planes disponibles con opción de solicitar cambio
  - Estados de carga y manejo de errores
- Colores de gradiente según tipo de plan (free, starter, pro, premium, enterprise)
- Integración con API para obtener datos en tiempo real
- **NUEVO:** Sección de "Información de Cuenta" mejorada con:
  - Nombre de la organización
  - Rol del usuario en la organización (Admin, Vendedor, Cajero, etc.)
  - Descripción del rol
  - Badges con permisos principales
  - Mensaje informativo si no pertenece a organización

### 2. API - Plan de Organización
**Archivo:** `apps/frontend/src/app/api/auth/organization/plan/route.ts`

**Funcionalidad:**
- Endpoint GET que retorna el plan actual de la organización del usuario
- Verifica autenticación del usuario
- Obtiene la organización del usuario desde la tabla `users`
- Consulta el plan desde la tabla `saas_plans` usando el `subscription_plan` de la organización
- Retorna datos formateados del plan (nombre, precio, límites, características)

### 3. API - Solicitud de Cambio de Plan
**Archivo:** `apps/frontend/src/app/api/auth/organization/request-plan-change/route.ts`

**Funcionalidad:**
- Endpoint POST para solicitar cambio de plan
- Valida que el usuario esté autenticado y tenga organización
- Verifica que el plan solicitado exista y esté activo
- Previene solicitar el mismo plan actual
- Registra la solicitud en logs (preparado para integrar con tabla de requests)
- Retorna confirmación de solicitud enviada

### 4. API - Información de Organización (NUEVO)
**Archivo:** `apps/frontend/src/app/api/auth/organization/info/route.ts`

**Funcionalidad:**
- Endpoint GET que retorna información de la organización del usuario
- Obtiene nombre y slug de la organización
- Determina el rol del usuario en la organización
- Proporciona descripción del rol (Admin, Vendedor, Cajero, etc.)
- Lista permisos principales según el rol
- Intenta obtener datos de `organization_members` si existe
- Fallback a rol de tabla `users` si no hay datos detallados

## Estructura de Datos

### Plan (SaaS Plan)
```typescript
{
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  features: (string | { name: string; included: boolean })[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxTransactionsPerMonth: number;
    maxLocations: number;
  };
  is_active: boolean;
}
```

### Organization Info (NUEVO)
```typescript
{
  organizationId: string;
  name: string;
  slug: string;
  role: string; // 'admin', 'manager', 'seller', 'cashier', 'viewer', etc.
  roleDescription: string; // Descripción legible del rol
  permissions: string[]; // Lista de permisos principales
}
```

## Roles Soportados

- **admin**: Administrador con acceso completo
- **manager**: Gerente con permisos de gestión
- **seller**: Vendedor con acceso al POS
- **cashier**: Cajero con acceso limitado
- **viewer**: Visualizador con acceso de solo lectura
- **inventory_manager**: Gestor de inventario
- **accountant**: Contador con acceso financiero

## Colores por Tipo de Plan

- **Free:** `from-slate-500 to-slate-700`
- **Starter:** `from-blue-500 to-cyan-600`
- **Pro/Professional:** `from-purple-600 to-indigo-600`
- **Premium:** `from-fuchsia-600 to-pink-700`
- **Enterprise:** `from-amber-600 to-orange-700`

## Flujo de Usuario

1. Usuario navega a `/dashboard/profile`
2. Selecciona la pestaña "Plan"
3. Ve su plan actual con todos los detalles
4. Explora planes disponibles en el grid
5. Hace clic en "Solicitar Cambio" en el plan deseado
6. Sistema registra la solicitud y muestra confirmación
7. Administrador revisa y procesa la solicitud (flujo futuro)

## Próximos Pasos (Mejoras Futuras)

1. **Tabla de Solicitudes:** Crear tabla `plan_change_requests` para almacenar solicitudes
2. **Notificaciones:** Enviar emails a administradores cuando hay nueva solicitud
3. **Panel de Admin:** Interfaz para que admins aprueben/rechacen solicitudes
4. **Integración de Pagos:** Conectar con Stripe/PayPal para procesar upgrades
5. **Historial:** Mostrar historial de cambios de plan del usuario
6. **Comparación:** Agregar modal de comparación entre planes
7. **Límites en Tiempo Real:** Mostrar uso actual vs límites del plan

## Notas Técnicas

- Se reutiliza la estructura de planes del SuperAdmin (`/superadmin/plans`)
- Los colores son neutrales y profesionales (siguiendo guía de diseño)
- Manejo robusto de errores con fallbacks
- Estados de carga optimizados
- Compatible con modo mock (desarrollo sin Supabase)
- Responsive design para móviles y tablets

## Testing

Para probar la funcionalidad:

1. **IMPORTANTE: Reiniciar el servidor de desarrollo**
   - Las nuevas rutas API requieren reinicio del servidor
   - Ejecutar `reiniciar-dev.bat` (CMD) o `.\reiniciar-dev.ps1` (PowerShell)
   - O manualmente: `Ctrl+C` y luego `npm run dev`

2. Asegurarse de tener planes en la tabla `saas_plans`
3. Usuario debe tener `organization_id` en tabla `users`
4. Organización debe tener `subscription_plan` asignado
5. Navegar a `/dashboard/profile` y seleccionar pestaña "Plan"
6. Verificar que se muestra el plan actual
7. Intentar solicitar cambio a otro plan
8. Revisar logs del servidor para ver la solicitud registrada

## Solución de Problemas

### Error 404 en `/api/auth/organization/plan`

**Causa:** Next.js no ha detectado las nuevas rutas API

**Solución:** 
1. Reiniciar el servidor de desarrollo completamente
2. Usar los scripts: `reiniciar-dev.bat` o `reiniciar-dev.ps1`
3. Verificar que los archivos existen en:
   - `apps/frontend/src/app/api/auth/organization/plan/route.ts`
   - `apps/frontend/src/app/api/auth/organization/request-plan-change/route.ts`

### Usuario sin plan

Si el usuario no tiene organización o plan asignado:
- La página mostrará "No tienes un plan asignado actualmente"
- No se mostrará error, solo un mensaje informativo
- Los planes disponibles se mostrarán normalmente

## Dependencias

- `@/lib/api` - Cliente HTTP para llamadas a API
- `@/lib/toast` - Sistema de notificaciones
- `@/components/ui/*` - Componentes de UI (Card, Button, Badge, etc.)
- `lucide-react` - Íconos (Sparkles, Check, ArrowRight, RefreshCw)
