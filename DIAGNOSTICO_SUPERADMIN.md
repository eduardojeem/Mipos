# 🔍 DIAGNÓSTICO - PANEL SUPERADMIN NO MUESTRA INFORMACIÓN

**Fecha:** 2 de Febrero, 2026  
**Problema:** El panel SuperAdmin no muestra información

---

## 🚨 PROBLEMA REPORTADO

El usuario reporta que el Panel Super Admin no muestra información.

---

## 🔎 POSIBLES CAUSAS

### 1. Problema de Autenticación
- El usuario no está autenticado
- La sesión expiró
- El token no es válido

### 2. Problema de Permisos
- El usuario no tiene rol de SUPER_ADMIN
- El sistema de permisos no está cargando correctamente
- El `UnifiedPermissionGuard` está bloqueando el acceso

### 3. Problema de API
- Los endpoints `/api/superadmin/stats` o `/api/superadmin/organizations` están fallando
- Error de configuración de Supabase
- Problemas de RLS (Row Level Security)

### 4. Problema de Frontend
- El hook `useAdminData` no está cargando datos
- Error en el componente `SuperAdminClient`
- Problema con React Query o caché

---

## 🛠️ PASOS PARA DIAGNOSTICAR

### Paso 1: Acceder a la Página de Diagnóstico

1. Navega a: `http://localhost:3000/superadmin/diagnostic`
2. Esta página ejecutará pruebas automáticas de todos los endpoints
3. Revisa los resultados:
   - ✅ Verde = Funcionando
   - ❌ Rojo = Error

### Paso 2: Revisar la Consola del Navegador

Abre las DevTools (F12) y busca:

```javascript
// Logs del hook useAdminData
💾 [useAdminData] Loading cached data
🔄 [useAdminData] Starting fetch...
✅ [useAdminData] Fetch completed successfully
// O errores:
❌ [useAdminData] Both fetches failed
❌ [useAdminData] Fatal error:
```

### Paso 3: Verificar Autenticación

En la consola del navegador, ejecuta:

```javascript
// Verificar sesión
fetch('/api/auth/profile')
  .then(r => r.json())
  .then(console.log);

// Verificar si es super admin
fetch('/api/superadmin/me')
  .then(r => r.json())
  .then(console.log);
```

**Respuesta esperada:**
```json
{
  "isSuperAdmin": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "SUPER_ADMIN"
  }
}
```

### Paso 4: Verificar Endpoints de Datos

```javascript
// Verificar stats
fetch('/api/superadmin/stats')
  .then(r => r.json())
  .then(console.log);

// Verificar organizations
fetch('/api/superadmin/organizations?pageSize=5')
  .then(r => r.json())
  .then(console.log);
```

### Paso 5: Revisar Variables de Entorno

Verifica que existan:

```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Paso 6: Revisar Base de Datos

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que el usuario existe y tiene rol correcto
SELECT id, email, role, two_factor_enabled
FROM users
WHERE email = 'tu-email@example.com';

-- Verificar user_roles
SELECT ur.*, r.name as role_name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = 'tu-user-id';

-- Verificar que hay organizaciones
SELECT COUNT(*) as total_orgs FROM organizations;

-- Verificar que hay usuarios
SELECT COUNT(*) as total_users FROM users;
```

---

## 🔧 SOLUCIONES COMUNES

### Solución 1: Usuario No es Super Admin

**Síntoma:** Error 403 o "Acceso denegado"

**Solución:**

```sql
-- Opción A: Actualizar en tabla users
UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = 'tu-email@example.com';

-- Opción B: Usar script de asignación
-- Ejecutar: npm run script scripts/set-superadmin-role.ts
```

### Solución 2: Sesión Expirada

**Síntoma:** Redirección a /auth/signin

**Solución:**
1. Cerrar sesión completamente
2. Volver a iniciar sesión
3. Verificar que la sesión persiste

### Solución 3: Endpoints Fallando

**Síntoma:** Errores 500 en consola

**Solución:**

```bash
# Verificar logs del servidor
# En la terminal donde corre npm run dev

# Buscar errores como:
# - "Missing required Supabase environment variables"
# - "Database error"
# - "RLS policy violation"
```

### Solución 4: Problema de Permisos RLS

**Síntoma:** Queries retornan vacío pero no hay error

**Solución:**

```sql
-- Deshabilitar RLS temporalmente para diagnóstico
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Después de verificar, volver a habilitar
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Solución 5: Caché Corrupto

**Síntoma:** Datos antiguos o inconsistentes

**Solución:**

```javascript
// En consola del navegador
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Solución 6: Problema con UnifiedPermissionGuard

**Síntoma:** Pantalla en blanco o loading infinito

**Solución Temporal:**

Editar `apps/frontend/src/app/superadmin/SuperAdminClient.tsx`:

```typescript
// Comentar temporalmente el guard
// return (
//   <UnifiedPermissionGuard role="SUPER_ADMIN" allowSuperAdmin={true}>
//     {/* contenido */}
//   </UnifiedPermissionGuard>
// );

// Reemplazar con:
return (
  <div className="flex-1 space-y-6 p-8 pt-6">
    {/* contenido directo sin guard */}
  </div>
);
```

---

## 📊 CHECKLIST DE DIAGNÓSTICO

Marca cada item conforme lo verifiques:

- [ ] Usuario está autenticado (verificar `/api/auth/profile`)
- [ ] Usuario tiene rol SUPER_ADMIN (verificar en BD)
- [ ] Endpoint `/api/superadmin/me` retorna `isSuperAdmin: true`
- [ ] Endpoint `/api/superadmin/stats` retorna datos
- [ ] Endpoint `/api/superadmin/organizations` retorna datos
- [ ] Variables de entorno están configuradas
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs del servidor
- [ ] Hay datos en la base de datos (organizaciones, usuarios)
- [ ] RLS no está bloqueando queries

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### Error: "No autorizado" (401)

```typescript
// Causa: No hay sesión activa
// Solución: Iniciar sesión nuevamente
```

### Error: "Acceso denegado" (403)

```typescript
// Causa: Usuario no es super admin
// Solución: Actualizar rol en BD
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'tu-email';
```

### Error: "Configuration error"

```typescript
// Causa: Faltan variables de entorno
// Solución: Verificar .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Error: "Both fetches failed"

```typescript
// Causa: Endpoints de API no responden
// Solución: Verificar que el servidor esté corriendo
// y que los endpoints existan
```

### Pantalla en Blanco

```typescript
// Causa: UnifiedPermissionGuard bloqueando
// Solución: Verificar permisos o comentar guard temporalmente
```

### Loading Infinito

```typescript
// Causa: Hook useAdminData no completa
// Solución: Verificar que los endpoints respondan
// y que no haya errores en consola
```

---

## 📝 REPORTE DE DIAGNÓSTICO

Cuando encuentres el problema, documenta:

1. **Síntoma exacto:** ¿Qué ves en pantalla?
2. **Errores en consola:** Copia los mensajes de error
3. **Respuestas de API:** ¿Qué retornan los endpoints?
4. **Estado de autenticación:** ¿El usuario está logueado?
5. **Rol del usuario:** ¿Qué rol tiene en la BD?
6. **Solución aplicada:** ¿Qué funcionó?

---

## 🚀 PRÓXIMOS PASOS

Una vez identificado el problema:

1. Aplicar la solución correspondiente
2. Verificar que el panel carga correctamente
3. Documentar el problema y solución
4. Considerar agregar validaciones adicionales
5. Actualizar tests para prevenir regresión

---

## 📞 SOPORTE ADICIONAL

Si el problema persiste:

1. Ejecuta la página de diagnóstico: `/superadmin/diagnostic`
2. Copia el JSON completo de resultados
3. Revisa los logs del servidor
4. Verifica la configuración de Supabase
5. Consulta la documentación de auditoría: `AUDITORIA_SUPERADMIN.md`

---

**Última actualización:** 2 de Febrero, 2026
