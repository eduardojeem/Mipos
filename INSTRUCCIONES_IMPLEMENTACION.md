# Instrucciones de Implementación - Perfil Mejorado

## 🚀 Pasos para Activar las Nuevas Funcionalidades

### Paso 1: Reiniciar el Servidor de Desarrollo ⚠️ CRÍTICO

Las nuevas rutas API no funcionarán hasta que reinicies el servidor.

**Opción A - Usar Scripts (Recomendado):**

Windows CMD:
```cmd
reiniciar-dev.bat
```

Windows PowerShell:
```powershell
.\reiniciar-dev.ps1
```

**Opción B - Manual:**
1. En la terminal donde corre el servidor, presiona `Ctrl + C`
2. Espera a que se detenga completamente
3. Ejecuta: `npm run dev`

### Paso 2: Verificar que el Servidor Inició Correctamente

Deberías ver algo como:
```
> mipos@1.0.0 dev
> next dev

  ▲ Next.js 15.5.9
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.x:3000

 ✓ Ready in 2.5s
```

### Paso 3: Probar la Nueva Funcionalidad

1. Abre tu navegador en `http://localhost:3000`
2. Inicia sesión si no lo has hecho
3. Navega a `/dashboard/profile`
4. Deberías ver **3 pestañas**: Información Personal, Seguridad, Plan

---

## 🧪 Testing Paso a Paso

### Test 1: Información de Organización

1. Ve a `/dashboard/profile`
2. Pestaña "Información Personal" (por defecto)
3. Busca el card "Información de Cuenta"
4. Verifica que muestra:
   - ✅ Rol del Sistema
   - ✅ Organización (si tienes una)
   - ✅ Rol en la Organización (si tienes una)
   - ✅ Permisos Principales (si tienes una)

**Resultado Esperado:**
- Si tienes organización: Muestra nombre, rol y permisos
- Si NO tienes organización: Muestra mensaje "No perteneces a ninguna organización actualmente"

### Test 2: Pestaña de Plan

1. En `/dashboard/profile`
2. Click en pestaña "Plan"
3. Verifica que muestra:
   - ✅ Sección "Plan Actual"
   - ✅ Sección "Planes Disponibles"

**Resultado Esperado:**
- Si tienes plan: Muestra detalles completos del plan
- Si NO tienes plan: Muestra mensaje "No tienes un plan asignado actualmente"
- Siempre muestra planes disponibles

### Test 3: Solicitar Cambio de Plan

1. En pestaña "Plan"
2. Busca un plan diferente al actual
3. Click en botón "Solicitar Cambio"
4. Verifica que:
   - ✅ Botón muestra "Solicitando..."
   - ✅ Aparece toast de éxito
   - ✅ Botón vuelve a "Solicitar Cambio"

**Resultado Esperado:**
- Toast verde: "Solicitud de cambio de plan enviada correctamente"
- En la consola del servidor verás el log de la solicitud

---

## 🔍 Verificación de API Endpoints

Abre las DevTools (F12) → Pestaña Network

### Endpoint 1: Información de Organización
```
Request:  GET /api/auth/organization/info
Status:   200 OK (si tienes org) o 200 con data: null (si no tienes)
Response: {
  success: true,
  data: {
    organizationId: "...",
    name: "...",
    slug: "...",
    role: "admin",
    roleDescription: "Administrador con acceso completo",
    permissions: ["Gestión completa", "Usuarios", ...]
  }
}
```

### Endpoint 2: Plan Actual
```
Request:  GET /api/auth/organization/plan
Status:   200 OK (si tienes plan) o 200 con data: null (si no tienes)
Response: {
  success: true,
  data: {
    id: "...",
    name: "Professional",
    slug: "pro",
    price_monthly: 99,
    ...
  }
}
```

### Endpoint 3: Planes Disponibles
```
Request:  GET /api/plans
Status:   200 OK
Response: {
  success: true,
  plans: [
    { id: "...", name: "Free", slug: "free", ... },
    { id: "...", name: "Starter", slug: "starter", ... },
    ...
  ]
}
```

### Endpoint 4: Solicitar Cambio
```
Request:  POST /api/auth/organization/request-plan-change
Body:     { planSlug: "premium" }
Status:   200 OK
Response: {
  success: true,
  message: "Solicitud de cambio de plan enviada correctamente...",
  data: { requestedPlan: "Premium", currentPlan: "pro" }
}
```

---

## ❌ Solución de Problemas

### Problema 1: Error 404 en API

**Síntoma:**
```
AxiosError: Request failed with status code 404
at /api/auth/organization/info
```

**Solución:**
1. Reiniciar el servidor de desarrollo
2. Verificar que los archivos existen:
   - `apps/frontend/src/app/api/auth/organization/info/route.ts`
   - `apps/frontend/src/app/api/auth/organization/plan/route.ts`
   - `apps/frontend/src/app/api/auth/organization/request-plan-change/route.ts`

### Problema 2: No Muestra Organización

**Síntoma:**
Muestra "No perteneces a ninguna organización actualmente"

**Verificación:**
1. Abre Supabase Dashboard
2. Ve a Table Editor → `users`
3. Busca tu usuario por email
4. Verifica que tiene `organization_id` con un valor UUID

**Solución:**
Si no tiene `organization_id`, necesitas:
1. Crear una organización en la tabla `organizations`
2. Asignar el `organization_id` al usuario

### Problema 3: No Muestra Plan

**Síntoma:**
Muestra "No tienes un plan asignado actualmente"

**Verificación:**
1. Abre Supabase Dashboard
2. Ve a Table Editor → `organizations`
3. Busca tu organización
4. Verifica que tiene `subscription_plan` con un valor (ej: "free", "pro")

**Solución:**
Si no tiene `subscription_plan`, necesitas:
1. Asignar un plan a la organización
2. El valor debe coincidir con un `slug` en la tabla `saas_plans`

### Problema 4: No Muestra Permisos

**Síntoma:**
Muestra organización y rol, pero sin permisos

**Causa:**
El rol no está en el mapeo de `ROLE_PERMISSIONS`

**Solución:**
Editar `apps/frontend/src/app/api/auth/organization/info/route.ts`:
```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'tu_rol_personalizado': ['Permiso 1', 'Permiso 2', 'Permiso 3'],
  // ...
};
```

### Problema 5: Planes Disponibles Vacíos

**Síntoma:**
Muestra "No hay planes disponibles en este momento"

**Verificación:**
1. Abre Supabase Dashboard
2. Ve a Table Editor → `saas_plans`
3. Verifica que hay planes con `is_active = true`

**Solución:**
Crear planes en la tabla `saas_plans` o activar los existentes.

---

## 📊 Datos de Prueba

### Crear Organización de Prueba

```sql
INSERT INTO organizations (id, name, slug, subscription_plan)
VALUES (
  gen_random_uuid(),
  'Mi Empresa de Prueba',
  'mi-empresa-prueba',
  'free'
);
```

### Asignar Organización a Usuario

```sql
UPDATE users
SET organization_id = (SELECT id FROM organizations WHERE slug = 'mi-empresa-prueba'),
    role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

### Crear Planes de Prueba

```sql
INSERT INTO saas_plans (id, name, slug, price_monthly, price_yearly, features, limits, is_active)
VALUES 
(
  gen_random_uuid(),
  'Free',
  'free',
  0,
  0,
  '["Punto de venta básico", "Reportes simples"]'::jsonb,
  '{"maxUsers": 2, "maxProducts": 50, "maxTransactionsPerMonth": 200, "maxLocations": 1}'::jsonb,
  true
),
(
  gen_random_uuid(),
  'Professional',
  'pro',
  99,
  990,
  '["Múltiples sucursales", "Reportes avanzados", "Integraciones API", "Soporte prioritario"]'::jsonb,
  '{"maxUsers": 50, "maxProducts": 5000, "maxTransactionsPerMonth": -1, "maxLocations": 10}'::jsonb,
  true
);
```

---

## ✅ Checklist de Verificación

Antes de considerar la implementación completa, verifica:

- [ ] Servidor reiniciado correctamente
- [ ] Página `/dashboard/profile` carga sin errores
- [ ] Se ven 3 pestañas: Información Personal, Seguridad, Plan
- [ ] Sección "Información de Cuenta" muestra organización (si existe)
- [ ] Sección "Información de Cuenta" muestra rol y permisos (si existe)
- [ ] Pestaña "Plan" muestra plan actual (si existe)
- [ ] Pestaña "Plan" muestra planes disponibles
- [ ] Botón "Solicitar Cambio" funciona y muestra toast
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en la consola del servidor
- [ ] Diseño responsive funciona en móvil
- [ ] Colores son neutrales y profesionales

---

## 🎓 Próximos Pasos

Una vez verificado que todo funciona:

1. **Personalizar Roles:**
   - Editar `ROLE_DESCRIPTIONS` y `ROLE_PERMISSIONS` en `info/route.ts`
   - Agregar roles específicos de tu negocio

2. **Crear Planes:**
   - Usar el panel SuperAdmin en `/superadmin/plans`
   - Crear planes que se ajusten a tu modelo de negocio

3. **Asignar Usuarios:**
   - Asignar organizaciones a usuarios
   - Asignar roles apropiados
   - Asignar planes a organizaciones

4. **Implementar Flujo de Aprobación:**
   - Crear tabla `plan_change_requests`
   - Crear panel de admin para aprobar/rechazar
   - Implementar notificaciones por email

5. **Integrar Pagos:**
   - Conectar con Stripe o PayPal
   - Implementar flujo de pago para upgrades
   - Configurar webhooks para confirmaciones

---

## 📞 Soporte

Si necesitas ayuda adicional:

1. Revisa los logs del servidor (terminal)
2. Revisa la consola del navegador (F12)
3. Verifica la estructura de la base de datos
4. Consulta la documentación en:
   - `PERFIL_PLAN_SAAS.md`
   - `ORGANIZACION_EN_PERFIL.md`
   - `EJEMPLOS_VISUALES_PERFIL.md`
   - `RESUMEN_FINAL_PERFIL.md`

---

## 🎉 ¡Listo!

Si todos los tests pasan, la implementación está completa y funcionando correctamente.

Disfruta de tu perfil de usuario mejorado con información de organización, roles, permisos y planes SaaS.
