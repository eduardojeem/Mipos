# 🚨 ACCIÓN INMEDIATA: Ejecutar Fix de RLS

## ⚠️ PROBLEMA ACTUAL
El error `Error fetching organizations: {}` persiste porque **el script de fix NO se ha ejecutado en Supabase**.

Las políticas RLS actualizadas están en el archivo, pero **NO están aplicadas en la base de datos**.

---

## ✅ SOLUCIÓN: Ejecutar Script en 3 Pasos

### Paso 1: Abrir Supabase Dashboard

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Clic en **"SQL Editor"** en el menú lateral

### Paso 2: Ejecutar el Script de Fix

1. Abre el archivo: `supabase/migrations/20260205_fix_infinite_recursion.sql`
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)
3. En Supabase SQL Editor:
   - Pega el contenido (Ctrl+V)
   - Clic en **"Run"** (o presiona F5)

### Paso 3: Verificar Resultado

Deberías ver este resultado:

```
status                          | count
--------------------------------|------
✅ Funciones recreadas          |   2
✅ Políticas recreadas          |   5
✅ Test de acceso               | Usuario autenticado
🎉 FIX APLICADO CORRECTAMENTE
```

---

## 🔄 Después de Ejecutar el Script

### 1. Cerrar Sesión en la Aplicación
- Ve a tu aplicación
- Cierra sesión completamente
- Cierra todas las pestañas

### 2. Limpiar Cache (Opcional pero Recomendado)
- Abre DevTools (F12)
- Ve a Console
- Ejecuta:
```javascript
localStorage.clear();
```

### 3. Iniciar Sesión Nuevamente
- Abre nueva pestaña
- Ve a `/auth/signin`
- Inicia sesión con tus credenciales
- **Resultado esperado**: Login exitoso sin error

---

## 🆘 Si el Error Persiste Después del Fix

### Opción A: Verificar que el Script se Ejecutó

En Supabase SQL Editor, ejecuta:

```sql
-- Verificar funciones
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname IN ('get_user_org_ids', 'is_super_admin');

-- Verificar políticas
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('organization_members', 'organizations');
```

**Resultado esperado**:
- 2 funciones encontradas
- 5 políticas encontradas

### Opción B: Deshabilitar RLS Temporalmente

Si el error persiste, ejecuta este script en Supabase:

```sql
-- SOLUCIÓN TEMPORAL: Deshabilitar RLS
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('organization_members', 'organizations');
```

Esto permitirá el login mientras investigamos el problema.

**Para volver a habilitar RLS después**:
```sql
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Diagnóstico del Error Actual

El error `Error fetching organizations: {}` ocurre en:
- **Archivo**: `apps/frontend/src/app/auth/signin/page.tsx`
- **Línea**: 133
- **Función**: `fetchUserOrganizations()`

### Causa Raíz
Las políticas RLS actuales bloquean el acceso a `organization_members` y `organizations` después del login.

### Solución
El script de fix actualiza las políticas para permitir:
1. ✅ Ver propias membresías: `user_id = auth.uid()`
2. ✅ Ver organizaciones propias: `id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())`
3. ✅ Evitar recursión: `SET search_path = public` en funciones

---

## 🎯 Checklist de Ejecución

- [ ] Abrir Supabase Dashboard
- [ ] Ir a SQL Editor
- [ ] Copiar contenido de `20260205_fix_infinite_recursion.sql`
- [ ] Pegar en SQL Editor
- [ ] Ejecutar (Run / F5)
- [ ] Verificar resultado (debe mostrar ✅)
- [ ] Cerrar sesión en la aplicación
- [ ] Limpiar localStorage (opcional)
- [ ] Iniciar sesión nuevamente
- [ ] Verificar que funciona sin error

---

## 💡 Nota Importante

**El script está listo y correcto**. Solo necesita ser ejecutado en Supabase Dashboard.

Una vez ejecutado, el error desaparecerá inmediatamente.

---

**Prioridad**: 🔴 ALTA  
**Tiempo estimado**: 2 minutos  
**Dificultad**: Fácil (copiar y pegar)
