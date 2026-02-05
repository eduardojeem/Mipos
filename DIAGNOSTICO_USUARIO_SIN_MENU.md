# Diagnóstico: Usuario no ve secciones del menú

## 🔍 Usuario Afectado
**Email:** johneduardoespinoza95@gmail.com  
**ID:** 92ec5096-203a-4c0f-9f80-cda7fbb79826

---

## 📊 Estado Actual del Usuario

### ✅ En `auth.users` (Supabase Auth)
- Usuario existe
- Email verificado
- Creado: 2026-01-31

### ✅ En `user_roles`
- Tiene rol: **ADMIN** (ACTIVO)

### ✅ En `organization_members`
- Organización: **Empresa John Espinoza**
- Organization ID: `2fac6ec5-53d4-493e-84df-24bf8a8a6666`
- Es owner: `true`

### ❌ En `users` (tabla pública)
- **PROBLEMA:** El registro devuelve `null`
- No existe el registro del usuario en la tabla `users`

---

## 🐛 Causa Raíz del Problema

El flujo de autenticación es el siguiente:

1. **Usuario inicia sesión** → Supabase Auth valida credenciales ✅
2. **Frontend llama a `/api/auth/profile`** → Intenta obtener datos del usuario
3. **Endpoint busca en tabla `users`** → ❌ **NO ENCUENTRA NADA (null)**
4. **Fallback a `user_metadata`** → Solo tiene `{ email_verified: true }`
5. **Rol asignado por defecto** → `'USER'` o `'CASHIER'`
6. **Sidebar filtra por rol** → Como el rol es incorrecto, no muestra las secciones

### Código Problemático

```typescript
// apps/frontend/src/app/api/auth/profile/route.ts (línea 28-48)
const { data: userRecord, error: userError2 } = await supabase
  .from('users')
  .select(`id, email, name, phone, bio, location, avatar_url, role, created_at, updated_at`)
  .eq('id', user.id)
  .single();

if (userRecord && !userError2) {
  userData = userRecord; // ✅ Esto funciona si existe
}

// Fallback: usar datos de autenticación
if (!userData) {
  userData = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || 'Usuario',
    role: user.user_metadata?.role || user.app_metadata?.role || 'USER', // ❌ PROBLEMA
    // ...
  };
}
```

### Filtrado en Sidebar

```typescript
// apps/frontend/src/components/dashboard/sidebar.tsx (línea 238-250)
const filteredNavigation = useMemo(() => {
  const userRole = user?.role || 'CASHIER'; // ❌ Rol incorrecto
  
  return navigation.filter(item => {
    const hasRole = !item.roles || 
                   item.roles.includes(userRole) || 
                   (userRole === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
    if (!hasRole) return false; // ❌ Filtra todo porque el rol no coincide
    // ...
  });
}, [user]);
```

---

## 🎯 Soluciones

### Solución 1: Crear registro en tabla `users` (RECOMENDADO)

El usuario debe tener un registro en la tabla `users` con su rol correcto.

```sql
-- Insertar usuario en tabla users
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  '92ec5096-203a-4c0f-9f80-cda7fbb79826',
  'johneduardoespinoza95@gmail.com',
  'John Eduardo Espinoza',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'ADMIN',
  updated_at = NOW();
```

**Script TypeScript:**
```bash
npx tsx scripts/sync-user-to-users-table.ts johneduardoespinoza95@gmail.com
```

---

### Solución 2: Mejorar el endpoint `/api/auth/profile`

Modificar el endpoint para que consulte `user_roles` si no encuentra el usuario en `users`:

```typescript
// apps/frontend/src/app/api/auth/profile/route.ts

// Si no hay userData, intentar obtener rol desde user_roles
if (!userData) {
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const roleFromUserRoles = userRoles?.role?.name || 'CASHIER';

  userData = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || 'Usuario',
    role: roleFromUserRoles, // ✅ Rol desde user_roles
    // ...
  };
}
```

---

### Solución 3: Trigger automático en Supabase

Crear un trigger que sincronice automáticamente los usuarios de `auth.users` a `users`:

```sql
-- Función para sincronizar usuarios
CREATE OR REPLACE FUNCTION sync_auth_user_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar o actualizar en users
  INSERT INTO users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'CASHIER'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_users();
```

---

## 🚀 Implementación Inmediata

### Paso 1: Crear el script de sincronización

```typescript
// scripts/sync-user-to-users-table.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUser(email: string) {
  console.log(`\n🔄 Sincronizando usuario: ${email}\n`);

  // 1. Obtener usuario de auth
  const { data: authUser } = await supabase.auth.admin.listUsers();
  const user = authUser.users.find(u => u.email === email);
  
  if (!user) {
    console.error('❌ Usuario no encontrado en auth.users');
    return;
  }

  // 2. Obtener rol desde user_roles
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const role = userRoles?.role?.name || 'CASHIER';

  // 3. Insertar/actualizar en users
  const { error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
      role: role,
      created_at: user.created_at,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Usuario sincronizado correctamente');
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${role}`);
  console.log('\n🎉 El usuario ahora debería ver todas las secciones del menú');
  console.log('   Por favor, cierra sesión y vuelve a iniciar sesión.\n');
}

const email = process.argv[2] || 'johneduardoespinoza95@gmail.com';
syncUser(email).catch(console.error);
```

### Paso 2: Ejecutar el script

```bash
npx tsx scripts/sync-user-to-users-table.ts johneduardoespinoza95@gmail.com
```

### Paso 3: Usuario cierra sesión y vuelve a iniciar

El usuario debe:
1. Cerrar sesión en la aplicación
2. Volver a iniciar sesión
3. Ahora debería ver todas las secciones del menú

---

## 📋 Verificación Post-Fix

Después de aplicar la solución, verificar:

```bash
# Verificar que el usuario existe en users
npx tsx scripts/check-user-role.ts johneduardoespinoza95@gmail.com
```

Debería mostrar:
```
✅ Usuario encontrado en tabla users
   Role: ADMIN
   Full Name: John Eduardo Espinoza
   Organization ID: 2fac6ec5-53d4-493e-84df-24bf8a8a6666

📱 SECCIONES VISIBLES CON ROL "ADMIN":
   ✅ Dashboard Principal
   ✅ Punto de Venta
   ✅ Historial de Ventas
   ✅ Promociones
   ✅ Pedidos Web
   ✅ Productos
   ✅ Categorías
   ✅ Proveedores
   ✅ Clientes
   ✅ Caja
   ✅ Lealtad
   ✅ Reportes
   ✅ Administración
   ✅ Configuración
```

---

## 🔮 Prevención Futura

Para evitar que esto vuelva a ocurrir:

1. **Implementar el trigger de sincronización** (Solución 3)
2. **Mejorar el endpoint `/api/auth/profile`** (Solución 2)
3. **Agregar validación en el registro de usuarios** para asegurar que siempre se cree el registro en `users`
4. **Monitorear usuarios sin registro en `users`** con un script periódico

---

## 📝 Resumen

**Problema:** Usuario no ve secciones del menú  
**Causa:** Falta registro en tabla `users`, rol se obtiene incorrectamente  
**Solución:** Sincronizar usuario a tabla `users` con rol correcto  
**Tiempo estimado:** 5 minutos  
**Impacto:** Usuario podrá ver todas las secciones según su rol ADMIN
