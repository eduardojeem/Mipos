# 🔍 Diagnóstico: Error "Failed to create session"

**Fecha**: 7 de febrero de 2026  
**Error**: Failed to create session al intentar abrir caja

---

## 🐛 Problema

Al intentar abrir una sesión de caja, el backend retorna el error:

```
Failed to create session
```

## 🔎 Causa Raíz

El error ocurre en `/api/cash/session/open/route.ts` línea 105 cuando intenta insertar en la tabla `cash_sessions`.

### Posibles Causas:

1. **Políticas RLS** - La tabla `cash_sessions` tiene RLS habilitado con la política:

   ```sql
   CREATE POLICY "Org Access Cash Sessions" ON public.cash_sessions
       USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
       WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));
   ```

2. **Usuario no está en organization_members** - El usuario actual no está registrado como miembro de la organización seleccionada

3. **Service Role Key no configurado** - Si `SUPABASE_SERVICE_ROLE_KEY` no está configurado, el API usa el cliente regular que está sujeto a RLS

---

## ✅ Soluciones

### Solución 1: Verificar Membership del Usuario (RECOMENDADA)

El usuario debe estar en la tabla `organization_members`:

```sql
-- Verificar si el usuario está en la organización
SELECT * FROM organization_members
WHERE user_id = '<USER_ID>'
AND organization_id = '<ORG_ID>';

-- Si no existe, agregarlo
INSERT INTO organization_members (user_id, organization_id, role, created_at)
VALUES ('<USER_ID>', '<ORG_ID>', 'admin', NOW());
```

### Solución 2: Verificar Variables de Entorno

Asegurarse de que `.env.local` tenga:

```env
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
NEXT_PUBLIC_SUPABASE_URL=<tu_supabase_url>
```

El Service Role Key bypasea RLS y permite la inserción.

### Solución 3: Verificar Función current_user_org_ids()

```sql
-- Probar la función como el usuario actual
SELECT * FROM public.current_user_org_ids();

-- Debería retornar las organizaciones del usuario
```

### Solución 4: Deshabilitar RLS Temporalmente (SOLO PARA DEBUG)

**⚠️ NO USAR EN PRODUCCIÓN**

```sql
-- Deshabilitar RLS temporalmente
ALTER TABLE public.cash_sessions DISABLE ROW LEVEL SECURITY;

-- Después de probar, volver a habilitar
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
```

---

## 🔧 Mejoras Implementadas en el Código

### Frontend (`OptimizedPOSLayout.tsx`)

Mejorado el manejo de errores para mostrar detalles:

```typescript
if (!res.ok) {
  const error = await res.json();
  const errorMsg = error.error || "Error al abrir caja";
  const details = error.details ? `\n${error.details}` : "";
  const code = error.code ? ` (${error.code})` : "";

  console.error("Error opening cash session:", {
    status: res.status,
    error: errorMsg,
    details: error.details,
    code: error.code,
  });

  throw new Error(`${errorMsg}${code}${details}`);
}
```

Ahora el error mostrará:

- Mensaje de error
- Código de error (si existe)
- Detalles adicionales (si existen)

---

## 🧪 Pasos para Diagnosticar

### 1. Revisar Console del Navegador

Buscar el objeto de error completo:

```javascript
{
  status: 500,
  error: "Failed to create session",
  details: "...",  // Detalles específicos
  code: "..."      // Código de error de Postgres
}
```

### 2. Revisar Terminal del Servidor

Buscar logs de Supabase con detalles del error de inserción.

### 3. Verificar en Supabase Dashboard

1. Ir a **Table Editor** → `organization_members`
2. Verificar que el usuario actual esté en la organización seleccionada
3. Ir a **Table Editor** → `cash_sessions`
4. Intentar insertar manualmente un registro

### 4. Probar con SQL Editor

```sql
-- Como el usuario actual (usando anon key)
INSERT INTO cash_sessions (
  user_id,
  opened_by,
  opening_amount,
  status,
  opening_time,
  notes,
  organization_id
) VALUES (
  auth.uid(),
  auth.uid(),
  100000,
  'OPEN',
  NOW(),
  'Test',
  '<ORG_ID>'
);
```

Si falla, el error de Postgres mostrará la causa exacta.

---

## 📋 Checklist de Verificación

- [ ] Usuario existe en `organization_members` para la organización seleccionada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurado en `.env.local`
- [ ] La función `current_user_org_ids()` retorna la organización correcta
- [ ] RLS está habilitado en `cash_sessions`
- [ ] La política "Org Access Cash Sessions" existe y es correcta
- [ ] El `organization_id` que se envía es válido (UUID)

---

## 🎯 Próximos Pasos

1. **Revisar console del navegador** para ver el error completo con detalles
2. **Verificar membership** del usuario en la organización
3. **Agregar usuario a organization_members** si no existe
4. **Probar nuevamente** abrir caja

---

## 📝 Notas Adicionales

### Estructura Esperada de cash_sessions

```sql
CREATE TABLE cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  opened_by UUID REFERENCES auth.users(id),
  opening_amount NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'OPEN', 'CLOSED', 'RECONCILED'
  opening_time TIMESTAMP NOT NULL,
  closing_time TIMESTAMP,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Campos Requeridos al Insertar

- `user_id` ✅ (del auth.user)
- `opened_by` ✅ (del auth.user)
- `opening_amount` ✅ (del form)
- `status` ✅ ('OPEN')
- `opening_time` ✅ (NOW())
- `organization_id` ✅ (del header)

Todos los campos requeridos están siendo enviados correctamente.

---

**Implementado por**: Antigravity AI  
**Estado**: Pendiente de diagnóstico por usuario
