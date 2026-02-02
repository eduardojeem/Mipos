# Fix: Acceso al Panel de SuperAdmin

## Problema Identificado

El usuario `jeem101595@gmail.com` no podía acceder al panel de superadmin a pesar de tener el rol SUPER_ADMIN correctamente asignado.

## Causa Raíz

El código del layout de superadmin estaba buscando un campo `role` directamente en la tabla `user_roles`, pero esta tabla usa una estructura relacional con `role_id` (foreign key a la tabla `roles`).

### Estructura de la Base de Datos

```sql
-- Tabla user_roles
{
  user_id: UUID,
  role_id: UUID,  -- FK a tabla roles
  is_active: boolean,
  ...
}

-- Tabla roles
{
  id: UUID,
  name: string,  -- 'SUPER_ADMIN', 'ADMIN', etc.
  display_name: string,
  ...
}
```

### Código Anterior (Incorrecto)

```typescript
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')  // ❌ Este campo no existe
  .eq('user_id', session.user.id)
  .single();

if (userRole?.role === 'SUPER_ADMIN') {
  isSuperAdmin = true;
}
```

## Solución Implementada

Actualicé el código para hacer un JOIN con la tabla `roles` y obtener el nombre del rol:

```typescript
const { data: userRole } = await supabase
  .from('user_roles')
  .select(`
    *,
    roles:role_id (
      name
    )
  `)
  .eq('user_id', session.user.id)
  .eq('is_active', true)  // ✅ También verificamos que esté activo
  .single();

if (userRole?.roles?.name === 'SUPER_ADMIN') {
  isSuperAdmin = true;
}
```

## Verificación del Usuario

### Estado Actual de jeem101595@gmail.com

✅ **auth.users**
- ID: `bdda2721-4ffd-4c8a-ab4b-8b0c155a6395`
- Email confirmado: Sí
- user_metadata.role: `SUPER_ADMIN`
- app_metadata.role: `SUPER_ADMIN`

✅ **user_roles**
- role_id: `e843e8d5-d953-40ee-b062-6192c80e6015`
- roles.name: `SUPER_ADMIN`
- is_active: `true`

✅ **users**
- role: `SUPER_ADMIN`

### Flujo de Verificación

El layout ahora verifica el rol en este orden:

1. **user_roles** (con JOIN a roles) - ✅ CORREGIDO
2. **users.role** - ✅ Funciona como fallback
3. **user_metadata.role** - ✅ Funciona como último recurso

## Archivos Modificados

- `apps/frontend/src/app/superadmin/layout.tsx` - Corregida la consulta de verificación de rol

## Scripts de Utilidad Creados

### 1. Verificar Estado de Usuario
```bash
npx tsx scripts/check-superadmin-user.ts jeem101595@gmail.com
```

Este script verifica:
- Si el usuario existe en auth.users
- Su rol en user_roles (con JOIN)
- Su rol en users
- Sus metadatos
- Si puede acceder al panel de superadmin

### 2. Asignar Rol SUPER_ADMIN
```bash
npx tsx scripts/set-superadmin-role.ts <email>
```

Este script:
- Busca el usuario por email
- Actualiza/crea el registro en user_roles
- Actualiza el rol en users
- Actualiza los metadatos en auth

### 3. Verificar Estructura de user_roles
```bash
npx tsx scripts/check-user-roles-structure.ts
```

Este script muestra:
- La estructura de la tabla user_roles
- Todos los roles disponibles
- Cómo hacer el JOIN correctamente

## Resultado

✅ El usuario `jeem101595@gmail.com` ahora puede acceder al panel de superadmin en `/superadmin`

## Notas Importantes

1. **Caché de Sesión**: Si el usuario ya tenía una sesión activa, es posible que necesite:
   - Cerrar sesión y volver a iniciar sesión
   - O esperar a que la sesión se refresque automáticamente

2. **Verificación de is_active**: El código ahora también verifica que el rol esté activo (`is_active = true`)

3. **Múltiples Fallbacks**: El sistema tiene 3 niveles de verificación para máxima compatibilidad:
   - user_roles (preferido)
   - users (fallback)
   - metadata (último recurso)

## Testing

Para probar que funciona:

1. Iniciar sesión con `jeem101595@gmail.com`
2. Navegar a `/superadmin`
3. Debería ver el panel de administración sin redirección

Si aún hay problemas:
1. Ejecutar el script de verificación
2. Verificar que la sesión esté actualizada
3. Revisar los logs del servidor
