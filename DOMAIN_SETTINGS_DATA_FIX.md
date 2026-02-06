# Fix: Datos no cargan en DomainSettingsForm

## Problema Identificado

El componente `DomainSettingsForm` en `/admin/business-config` no cargaba los datos de dominio de la organización.

### Causas Raíz

1. **Hook incorrecto**: El componente usaba `currentOrganization` pero el hook `useUserOrganizations` retorna `selectedOrganization`
2. **Campos faltantes**: El hook no seleccionaba los campos `subdomain`, `custom_domain` y `domain_verified` de la base de datos
3. **userId no pasado**: El hook no recibía el `userId` como parámetro

## Solución Implementada

### 1. Actualización del Hook `use-user-organizations.ts`

**Interface actualizada:**
```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscription_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
  created_at: string;
  subdomain?: string | null;           // ✅ NUEVO
  custom_domain?: string | null;       // ✅ NUEVO
  domain_verified?: boolean;           // ✅ NUEVO
  settings?: Record<string, unknown>;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}
```

**Query actualizada:**
```typescript
const { data: orgsData, error: orgsError } = await supabase
  .from('organizations')
  .select('id, name, slug, subscription_plan, subscription_status, created_at, subdomain, custom_domain, domain_verified, settings, branding')
  .in('id', orgIds)
  .order('name');
```

### 2. Corrección del Componente `DomainSettingsForm.tsx`

**Cambios realizados:**

1. **Hook con userId:**
```typescript
// ❌ ANTES
const { currentOrganization, loading: orgLoading } = useUserOrganizations();

// ✅ DESPUÉS
const { selectedOrganization, loading: orgLoading } = useUserOrganizations(user?.id);
```

2. **Referencias actualizadas:**
```typescript
// Todas las referencias a currentOrganization → selectedOrganization
- currentOrganization?.id
- currentOrganization?.name
- currentOrganization.subdomain
- currentOrganization.custom_domain
```

3. **useEffect actualizado:**
```typescript
useEffect(() => {
  if (selectedOrganization) {
    setSubdomain(selectedOrganization.subdomain || selectedOrganization.slug || '');
    setCustomDomain(selectedOrganization.custom_domain || '');
  }
}, [selectedOrganization]);
```

## Archivos Modificados

1. ✅ `apps/frontend/src/hooks/use-user-organizations.ts`
   - Agregados campos `subdomain`, `custom_domain`, `domain_verified` a interface
   - Query actualizada para seleccionar campos específicos

2. ✅ `apps/frontend/src/app/admin/business-config/components/DomainSettingsForm.tsx`
   - Cambiado `currentOrganization` → `selectedOrganization`
   - Agregado `user?.id` como parámetro al hook
   - Actualizadas todas las referencias

## Resultado

✅ Los datos de dominio ahora cargan correctamente en el formulario
✅ El campo `subdomain` se inicializa con el valor de la base de datos o el `slug` como fallback
✅ El campo `custom_domain` se inicializa con el valor de la base de datos
✅ La vista previa muestra la URL correcta
✅ TypeScript valida correctamente los tipos

## Testing

Para verificar que funciona:

1. Ir a `/admin/business-config`
2. Seleccionar tab "Dominio y Tienda"
3. Verificar que los campos se cargan con los datos existentes
4. Verificar que la vista previa muestra la URL correcta
5. Modificar y guardar para confirmar que persiste

## Notas Técnicas

- El hook `useUserOrganizations` ahora es más explícito en los campos que selecciona (mejor práctica)
- Se evita usar `select('*')` para tener control sobre los campos y tipos
- El componente ahora maneja correctamente el estado de loading mientras se cargan los datos
- Los campos de dominio son opcionales (`?`) para manejar organizaciones sin configuración de dominio
